"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ==========================================
// 1. GESTIÓN OPERATIVA DE CAJA (TURNOS)
// ==========================================

export async function getSesionCajaActiva() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: "No autenticado" };

        const { data: profile } = await supabase.from("perfiles").select("tenant_id").eq("id", user.id).single();
        if (!profile?.tenant_id) return { data: null, error: "Sin tenant" };

        const { data: sesion, error } = await supabase
            .from("sesiones_caja")
            .select("*")
            .eq("tenant_id", profile.tenant_id)
            .eq("estado", "abierta")
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = 0 rows returned
            console.error("Error buscando sesión activa:", error);
            return { data: null, error: "Error BD" };
        }

        return { data: sesion, error: null };
    } catch (e) {
        return { data: null, error: "Error de servidor" };
    }
}

export async function abrirCaja(formData: FormData) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "No autenticado" };

        const { data: profile } = await supabase.from("perfiles").select("tenant_id").eq("id", user.id).single();
        if (!profile?.tenant_id) return { success: false, error: "Sin tenant asignado" };

        const montoStr = formData.get("monto_inicial") as string;
        const monto_inicial = parseFloat(montoStr);

        if (isNaN(monto_inicial) || monto_inicial < 0) {
            return { success: false, error: "Monto inicial inválido." };
        }

        // Prevenir colisiones: verificar que no haya ya una abierta
        const { data: activa } = await supabase
            .from("sesiones_caja")
            .select("id")
            .eq("tenant_id", profile.tenant_id)
            .eq("estado", "abierta")
            .single();

        if (activa) {
            return { success: false, error: "Ya existe un turno abierto para este gimnasio." };
        }

        const { error } = await supabase
            .from("sesiones_caja")
            .insert({
                tenant_id: profile.tenant_id,
                usuario_id: user.id,
                monto_inicial
            });

        if (error) {
            console.error("Error al abrir caja:", error);
            return { success: false, error: "Error BD al abrir sesión." };
        }

        revalidatePath("/dashboard/payments");
        return { success: true, message: "Turno iniciado. Caja Abierta." };
    } catch (e) {
        return { success: false, error: "Error interno del servidor." };
    }
}

export async function cerrarCaja(sesion_id: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "No autenticado" };

        const { error } = await supabase
            .from("sesiones_caja")
            .update({
                estado: "cerrada",
                fecha_cierre: new Date().toISOString()
            })
            .eq("id", sesion_id);

        if (error) return { success: false, error: "Error BD al cerrar sesión." };

        revalidatePath("/dashboard/payments");
        return { success: true, message: "Turno finalizado y Caja Cerrada correctamente." };
    } catch (e) {
        return { success: false, error: "Error de servidor al cerrar caja." };
    }
}


// ==========================================
// 2. EGRESOS OPERATIVOS
// ==========================================

export async function registrarEgreso(formData: FormData) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "No autenticado" };

        const { data: profile } = await supabase.from("perfiles").select("tenant_id").eq("id", user.id).single();
        if (!profile?.tenant_id) return { success: false, error: "Sin tenant" };

        const { data: sesion } = await getSesionCajaActiva();
        if (!sesion) return { success: false, error: "Debes abrir un turno (caja) antes de registrar egresos." };

        const concepto = formData.get("concepto") as string;
        const monto = parseFloat(formData.get("monto") as string);
        const metodo_pago = formData.get("metodo_pago") as string;

        if (!concepto || isNaN(monto) || monto <= 0 || !metodo_pago) {
            return { success: false, error: "Datos de egreso incompletos o inválidos." };
        }

        const { error } = await supabase
            .from("movimientos_caja")
            .insert({
                tenant_id: profile.tenant_id,
                sesion_caja_id: sesion.id,
                usuario_id: user.id,
                tipo: "egreso",
                concepto,
                monto,
                metodo_pago
            });

        if (error) {
            console.error(error);
            return { success: false, error: "Error BD al registrar egreso." };
        }

        revalidatePath("/dashboard/payments");
        return { success: true, message: "Egreso operativo registrado." };
    } catch (e) {
        return { success: false, error: "Error interno del servidor." };
    }
}


// ==========================================
// 3. VENTA DE MEMBRESÍAS (ACTUALIZADA)
// ==========================================

export async function registrarPagoYMembresia(prevState: any, formData: FormData) {
    console.log("----- INICIANDO PROCESO DE VENTA DENTRO DE TURNO -----");
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: "No estás autenticado." };

        const { data: profile } = await supabase.from("perfiles").select("tenant_id").eq("id", user.id).single();
        if (!profile || !profile.tenant_id) return { error: "Acceso denegado. No tienes un tenant." };

        // --- VALIDACIÓN DE CAJA ---
        const { data: sesionActiva } = await getSesionCajaActiva();
        if (!sesionActiva) {
            return { error: "Bloqueo: Debes ABRIR CAJA primero (Turno Inactivo)." };
        }

        const socio_id = formData.get("socio_id") as string;
        const plan_id = formData.get("plan_id") as string;
        const metodo_pago = formData.get("metodo_pago") as string;

        if (!socio_id || !plan_id || !metodo_pago) {
            return { error: "Socio, Plan y Método requeridos." };
        }

        const { data: plan, error: planError } = await supabase
            .from("planes")
            .select("precio, periodo")
            .eq("id", plan_id)
            .single();

        if (planError || !plan) return { error: "Plan inválido." };

        const monto = plan.precio;
        const tenant_id = profile.tenant_id;
        const fecha_inicio = new Date();
        const fecha_fin = new Date(fecha_inicio);

        switch (plan.periodo) {
            case "DIARIO": fecha_fin.setDate(fecha_fin.getDate() + 1); break;
            case "SEMANAL": fecha_fin.setDate(fecha_fin.getDate() + 7); break;
            case "QUINCENAL": fecha_fin.setDate(fecha_fin.getDate() + 15); break;
            case "MENSUAL": fecha_fin.setMonth(fecha_fin.getMonth() + 1); break;
            case "TRIMESTRAL": fecha_fin.setMonth(fecha_fin.getMonth() + 3); break;
            case "SEMESTRAL": fecha_fin.setMonth(fecha_fin.getMonth() + 6); break;
            case "ANUAL": fecha_fin.setFullYear(fecha_fin.getFullYear() + 1); break;
            default: fecha_fin.setMonth(fecha_fin.getMonth() + 1);
        }

        console.log("1. Insertando Membresía...");
        const { data: membresia, error: memError } = await supabase
            .from("membresias")
            .insert({
                tenant_id,
                socio_id,
                plan_id,
                fecha_inicio: fecha_inicio.toISOString().split('T')[0],
                fecha_fin: fecha_fin.toISOString().split('T')[0],
                estado: "activa"
            })
            .select("id")
            .single();

        if (memError || !membresia) {
            console.log(memError);
            return { success: false, error: "Fallo Membresía BD." };
        }

        console.log("2. Insertando Pago (Ticket Finanzas Clásico)...");
        const { data: pagoResult, error: pagoError } = await supabase
            .from("pagos")
            .insert({
                tenant_id,
                socio_id,
                membresia_id: membresia.id,
                monto,
                metodo_pago
            })
            .select("id")
            .single();

        if (pagoError || !pagoResult) {
            await supabase.from("membresias").delete().eq("id", membresia.id); // Rollback
            return { success: false, error: "Fallo Pago BD. Rollback hecho." };
        }

        console.log("3. Reflejando Ingreso en Movimientos de Caja Operativa...");
        const { error: movError } = await supabase
            .from("movimientos_caja")
            .insert({
                tenant_id,
                sesion_caja_id: sesionActiva.id,
                usuario_id: user.id,
                tipo: 'ingreso',
                concepto: 'Venta de Pase o Membresía',
                monto,
                metodo_pago,
                referencia_externa_id: pagoResult.id
            });

        if (movError) {
            console.error("Warning: Se concretó membresía y pago pero falló reflejarse en CAJA:", movError);
            // No hacemos rollback para no quitarle el acceso al cliente, pero queda dispar la caja chica asíncrona.
        }

        await supabase.from("socios").update({ estado: 'activo' }).eq("id", socio_id);

        console.log("----- TRANSACCIÓN DE TURNO DE CAJA CULMINADA -----");
        revalidatePath("/dashboard/payments");
        revalidatePath("/dashboard/socios");
        return { success: true, message: "Cobro procesado e integrado al Turno actual." };
    } catch (e: any) {
        return { success: false, error: "Fatal error JS Server Action." };
    }
}

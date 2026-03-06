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

        if (error && error.code !== 'PGRST116') {
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
        if (!profile?.tenant_id) {
            return { success: false, error: "Error: No se encontró el gimnasio asignado al usuario." };
        }

        const montoInicial = parseFloat(formData.get('monto_inicial')?.toString() || '0');

        if (isNaN(montoInicial) || montoInicial < 0) {
            return { success: false, error: "Monto inicial inválido o mal formateado." };
        }

        const { data: activa } = await supabase
            .from("sesiones_caja")
            .select("id")
            .eq("tenant_id", profile.tenant_id)
            .eq("estado", "abierta")
            .single();

        if (activa) {
            return { success: false, error: "Ya existe un turno abierto para este gimnasio." };
        }

        const { error: insertError } = await supabase
            .from("sesiones_caja")
            .insert({
                tenant_id: profile.tenant_id,
                usuario_id: user.id,
                monto_inicial: montoInicial,
                estado: 'abierta'
            });

        if (insertError) return { success: false, error: `Error exacto de BD: ${insertError.message}` };

        // Forzamos la actualización de toda la app para evitar errores de caché
        revalidatePath("/", "layout");
        return { success: true, message: "Turno iniciado. Caja Abierta." };
    } catch (e: any) {
        return { success: false, error: `Error interno del servidor: ${e.message}` };
    }
}

export async function cerrarCaja(sesion_id: string) {
    try {
        const supabase = await createClient();
        const { error } = await supabase.from("sesiones_caja").update({ estado: "cerrada", fecha_cierre: new Date().toISOString() }).eq("id", sesion_id);
        if (error) return { success: false, error: "Error BD al cerrar sesión." };

        revalidatePath("/", "layout");
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
        const { data: profile } = await supabase.from("perfiles").select("tenant_id").eq("id", user?.id).single();
        const { data: sesion } = await getSesionCajaActiva();

        if (!sesion) return { success: false, error: "Debes abrir un turno (caja) antes de registrar egresos." };

        const concepto = formData.get("concepto") as string;
        const monto = parseFloat(formData.get("monto") as string);
        const metodo_pago = formData.get("metodo_pago") as string;

        const { error } = await supabase.from("movimientos_caja").insert({
            tenant_id: profile!.tenant_id,
            sesion_caja_id: sesion.id,
            usuario_id: user!.id,
            tipo: "egreso",
            concepto,
            monto,
            metodo_pago
        });

        if (error) return { success: false, error: "Error BD al registrar egreso." };

        revalidatePath("/", "layout");
        return { success: true, message: "Egreso operativo registrado." };
    } catch (e) {
        return { success: false, error: "Error interno del servidor." };
    }
}

// ==========================================
// 3. VENTA DE MEMBRESÍAS
// ==========================================

export async function registrarPagoYMembresia(prevState: any, formData: FormData) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from("perfiles").select("tenant_id").eq("id", user?.id).single();

        const { data: cajaAbierta } = await supabase.from('sesiones_caja').select('id').eq('tenant_id', profile!.tenant_id).eq('estado', 'abierta').single();
        if (!cajaAbierta?.id) return { success: false, error: "Debes abrir la caja de tu turno antes de procesar cobros." };

        const socio_id = formData.get("socio_id") as string;
        const plan_id = formData.get("plan_id") as string;
        const metodo_pago = formData.get("metodo_pago") as string;

        const { data: plan } = await supabase.from("planes").select("precio, periodo").eq("id", plan_id).single();
        if (!plan) return { success: false, error: "Error: El plan seleccionado no existe." };

        // Lógica de Aniversario
        const { data: socioCurrent } = await supabase.from("socios").select("vencimiento_membresia").eq("id", socio_id).single();
        let fecha_base = new Date();
        if (socioCurrent && socioCurrent.vencimiento_membresia) {
            const venc_db = new Date(socioCurrent.vencimiento_membresia + 'T00:00:00');
            const ahora = new Date(); ahora.setHours(0, 0, 0, 0);
            if (venc_db >= ahora) fecha_base = venc_db;
        }

        const fecha_inicio = new Date();
        const fecha_fin = new Date(fecha_base);

        const formatoLocal = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        switch (plan.periodo) {
            case "DIARIO": fecha_fin.setDate(fecha_fin.getDate() + 0); break; // +0 vence hoy mismo, +1 vence mañana
            case "MENSUAL": fecha_fin.setMonth(fecha_fin.getMonth() + 1); break;
            case "ANUAL": fecha_fin.setFullYear(fecha_fin.getFullYear() + 1); break;
            default: fecha_fin.setMonth(fecha_fin.getMonth() + 1);
        }

        // 1. Membresia
        const { data: membresia, error: memError } = await supabase.from("membresias").insert({
            tenant_id: profile!.tenant_id, socio_id, plan_id,
            fecha_inicio: formatoLocal(fecha_inicio),
            fecha_fin: formatoLocal(fecha_fin), estado: "activa"
        }).select("id").single();

        if (memError) return { success: false, error: "Fallo Membresía BD." };

        // 2. Pago (Ticket Real)
        const { data: pagoResult, error: pagoError } = await supabase.from("pagos").insert({
            tenant_id: profile!.tenant_id, socio_id, membresia_id: membresia.id,
            monto: plan.precio, metodo_pago, sesion_caja_id: cajaAbierta.id
        }).select("id").single();

        if (pagoError) return { success: false, error: "Fallo Pago BD." };

        // 3. Movimiento de Caja (CORREGIDO: Sin columnas inventadas)
        await supabase.from("movimientos_caja").insert({
            tenant_id: profile!.tenant_id, sesion_caja_id: cajaAbierta.id, usuario_id: user!.id,
            tipo: 'ingreso', concepto: 'Venta de Pase o Membresía', monto: plan.precio, metodo_pago
        });

        // 4. Actualizar Socio
        await supabase.from("socios").update({
            estado: 'activo', vencimiento_membresia: formatoLocal(fecha_fin), ultimo_pago: new Date().toISOString()
        }).eq("id", socio_id);

        revalidatePath("/", "layout"); // El martillo atómico de la caché
        return { success: true, message: "Cobro procesado e integrado al Turno actual." };
    } catch (e: any) {
        return { success: false, error: "Error en el servidor al procesar el pago." };
    }
}
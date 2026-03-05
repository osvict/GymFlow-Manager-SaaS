"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function registrarPagoYMembresia(prevState: any, formData: FormData) {
    console.log("----- INICIANDO PROCESO DE VENTA -----");
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error("1. Fallo: No hay usuario autenticado.");
            return { error: "No estás autenticado." };
        }

        console.log("1. Usuario Autenticado:", user.id);

        const { data: profile } = await supabase
            .from("perfiles")
            .select("tenant_id, rol")
            .eq("id", user.id)
            .single();

        if (!profile || !profile.tenant_id) {
            console.error("2. Fallo: Usuario no tiene tenant asignado.");
            return { error: "Acceso denegado. No tienes un tenant asignado." };
        }

        console.log("2. Tenant Validado:", profile.tenant_id);

        const socio_id = formData.get("socio_id") as string;
        const plan_id = formData.get("plan_id") as string;
        const metodo_pago = formData.get("metodo_pago") as string;

        console.log("3. Payload recibido:", { socio_id, plan_id, metodo_pago });

        if (!socio_id || !plan_id || !metodo_pago) {
            console.error("Fallo: Faltan datos en el formulario.");
            return { error: "Socio, Plan y Método de pago son obligatorios." };
        }

        // 1. Obtener detalles del plan para el precio y duración
        const { data: plan, error: planError } = await supabase
            .from("planes")
            .select("precio, periodo")
            .eq("id", plan_id)
            .single();

        if (planError || !plan) {
            console.error("4. Fallo buscando el plan en bd:", planError);
            return { error: "Plan no encontrado o no autorizado." };
        }

        console.log("4. Plan extraído exitosamente:", plan);

        const monto = plan.precio;
        const tenant_id = profile.tenant_id;

        // Calcular fechas dependiendo del periodo guardado
        const fecha_inicio = new Date();
        const fecha_fin = new Date(fecha_inicio);

        console.log("5. Calculando expiración natural basada en el periodo:", plan.periodo);

        switch (plan.periodo) {
            case "DIARIO":
                fecha_fin.setDate(fecha_fin.getDate() + 1);
                break;
            case "SEMANAL":
                fecha_fin.setDate(fecha_fin.getDate() + 7);
                break;
            case "QUINCENAL":
                fecha_fin.setDate(fecha_fin.getDate() + 15);
                break;
            case "MENSUAL":
                fecha_fin.setMonth(fecha_fin.getMonth() + 1);
                break;
            case "TRIMESTRAL":
                fecha_fin.setMonth(fecha_fin.getMonth() + 3);
                break;
            case "SEMESTRAL":
                fecha_fin.setMonth(fecha_fin.getMonth() + 6);
                break;
            case "ANUAL":
                fecha_fin.setFullYear(fecha_fin.getFullYear() + 1);
                break;
            default:
                fecha_fin.setMonth(fecha_fin.getMonth() + 1); // fallback a mes
        }

        console.log("Fechas de vigencia:", { inicio: fecha_inicio.toISOString(), fin: fecha_fin.toISOString() });

        console.log("6. INSERT [tabla: membresias]...");
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
            console.error("Error BD Membresía:", memError);
            return { success: false, error: "Error BD: " + (memError?.message || "Falló la inserción de Membresía.") };
        }

        console.log(`6. Listo. ID de Membresía construida: ${membresia.id}. Configurando Método de Pago: ${metodo_pago}`);

        console.log("7. INSERT [tabla: pagos] con vínculo de membresía...");
        const { error: pagoError } = await supabase
            .from("pagos")
            .insert({
                tenant_id,
                socio_id,
                membresia_id: membresia.id,
                monto,
                metodo_pago
            });

        if (pagoError) {
            console.error("Error BD Pago:", pagoError);
            console.error("Activando reversión/rollback manual de membresía...");
            await supabase.from("membresias").delete().eq("id", membresia.id);
            return { success: false, error: "Error BD Pago: " + pagoError.message };
        }

        console.log("7. Pago confirmado y atado a la membresía.");

        await supabase.from("socios").update({ estado: 'activo' }).eq("id", socio_id);

        console.log("----- TRANSACCIÓN DE CAJA CULMINADA CON LOGRO -----");
        revalidatePath("/dashboard/payments");
        revalidatePath("/dashboard/socios");
        return { success: true, message: "Cobro procesado correctamente." };
    } catch (e: any) {
        console.error("Fatal error CATCH en server action Caja:", e);
        return { success: false, error: "Excepción del lado del servidor al ejecutar el checkout." };
    }
}

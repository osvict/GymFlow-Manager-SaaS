"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function registrarPagoYMembresia(prevState: any, formData: FormData) {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { error: "No estás autenticado." };
        }

        const { data: profile } = await supabase
            .from("perfiles")
            .select("tenant_id, rol")
            .eq("id", user.id)
            .single();

        if (!profile || !profile.tenant_id) {
            return { error: "Acceso denegado. No tienes un tenant asignado." };
        }

        if (profile.rol !== "admin_gym" && profile.rol !== "staff") {
            return { error: "Acceso denegado." };
        }

        const socio_id = formData.get("socio_id") as string;
        const plan_id = formData.get("plan_id") as string;
        const metodo_pago = formData.get("metodo_pago") as string;

        if (!socio_id || !plan_id || !metodo_pago) {
            return { error: "Socio, Plan y Método de pago son obligatorios." };
        }

        // 1. Obtener detalles del plan para el precio y duración
        const { data: plan, error: planError } = await supabase
            .from("planes_suscripcion")
            .select("precio, duracion_dias")
            .eq("id", plan_id)
            .single();

        if (planError || !plan) {
            return { error: "Plan no encontrado o no autorizado." };
        }

        const monto = plan.precio;
        const duracionDias = plan.duracion_dias;
        const tenant_id = profile.tenant_id;

        // Calcular fechas
        const fecha_inicio = new Date();
        const fecha_fin = new Date(fecha_inicio);
        fecha_fin.setDate(fecha_fin.getDate() + duracionDias);

        // 2. Transacción secuencial segura
        // Insertar Membresía
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
            console.error("Error al registrar membresia:", memError);
            return { success: false, error: "Error BD: " + (memError?.message || "Falló la inserción de la Membresía.") };
        }

        // Insertar Pago amarrado a la membresia_id y método de pago
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
            console.error("Error al registrar pago:", pagoError);
            // Rollback manual de la membresía huérfana
            await supabase.from("membresias").delete().eq("id", membresia.id);
            return { success: false, error: "Error BD: " + pagoError.message };
        }

        // 3. Activar el socio en caso de que su estado anterior fuera distinto
        const { error: socioError } = await supabase
            .from("socios")
            .update({ estado: 'activo' })
            .eq("id", socio_id);

        if (socioError) {
            console.error("Warning: Se concretó el pago, pero falló la actualización del socio", socioError);
        }

        revalidatePath("/dashboard/payments");
        revalidatePath("/dashboard/socios");
        return { success: true, message: "Cobro y membresía aplicados exitosamente." };
    } catch (e: any) {
        console.error("Fatal error in POS API:", e);
        return { success: false, error: "Error interno del servidor al procesar la venta." };
    }
}

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

        // 2. Transacción manual (Supabase JS no soporta transacciones reales fácilmente sin RPC, 
        // pero podemos hacer inserts secuenciales y compensar si fallan o hacer un RPC).
        // Por simplicidad del MVP, haremos inserciones secuenciales.

        // Insertar Membresía (Upsert o nueva, asumiremos nueva o renovada)
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
            console.error(memError);
            return { error: "Error al registrar la membresía." };
        }

        // Insertar Pago
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
            console.error(pagoError);
            // Idealmente deberíamos eliminar la membresía si falló el pago (Rollback)
            await supabase.from("membresias").delete().eq("id", membresia.id);
            return { error: "Error al registrar el pago." };
        }

        // 3. Actualizar estado del socio a "activo" por si estaba inactivo/adeudo
        await supabase
            .from("socios")
            .update({ estado: 'activo' })
            .eq("id", socio_id);

        revalidatePath("/dashboard/payments");
        revalidatePath("/dashboard/socios");
        return { success: true, message: "Cobro y membresía aplicados exitosamente." };
    } catch (e: any) {
        return { error: "Error de servidor al registrar pago." };
    }
}

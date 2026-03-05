"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function crearPlan(prevState: any, formData: FormData) {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { error: "No estás autenticado." };
        }

        const { data: profile, error: perfilError } = await supabase
            .from("perfiles")
            .select("tenant_id, rol")
            .eq("id", user.id)
            .single();

        if (perfilError || !profile || !profile.tenant_id) {
            return { success: false, error: "Error de contexto: No se encontró el gimnasio asignado a este usuario." };
        }

        if (profile.rol !== "admin_gym") {
            return { error: "Acceso denegado. Se requiere ser Administrador del Gimnasio para crear planes." };
        }

        const nombre = formData.get("nombre") as string;
        const descripcion = formData.get("descripcion") as string;
        const precioStr = formData.get("precio") as string;
        const periodo = formData.get("periodo") as string;

        if (!nombre || !precioStr || !periodo) {
            return { error: "Nombre, Precio y Periodo son obligatorios." };
        }

        const validPeriodos = ["DIARIO", "MENSUAL", "TRIMESTRAL", "SEMESTRAL", "ANUAL"];
        if (!validPeriodos.includes(periodo)) {
            return { error: "Periodo inválido." };
        }

        const precio = parseFloat(precioStr);

        if (isNaN(precio) || precio < 0) {
            return { error: "El precio debe ser un número válido mayor o igual a 0." };
        }

        const payload: any = {
            tenant_id: profile.tenant_id,
            nombre,
            precio,
            periodo,
            estado: "activo"
        };

        if (descripcion) payload.descripcion = descripcion;

        const { error: insertError } = await supabase
            .from("planes")
            .insert(payload);

        if (insertError) {
            console.error("Error Supabase Planes:", insertError);
            return { success: false, error: `Error BD: ${insertError.message}` };
        }

        revalidatePath("/dashboard/planes");
        return { success: true, message: "Plan registrado exitosamente." };
    } catch (e: any) {
        return { error: "Error de servidor al crear plan." };
    }
}

export async function toggleEstadoPlan(id: string, estadoActual: string) {
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

        if (profile?.rol !== "admin_gym") {
            return { error: "Acceso denegado. Solo administradores pueden modificar planes." };
        }

        // Technically RLS protects us, but passing the id is safe because the db won't let us update a row that doesn't match our tenant_id.
        const nuevoEstado = estadoActual === "activo" ? "inactivo" : "activo";

        const { error } = await supabase
            .from("planes")
            .update({
                estado: nuevoEstado
            })
            .eq("id", id);

        if (error) {
            console.error("Error toggling plan status:", error);
            return { error: "Hubo un error al cambiar el estado del plan." };
        }

        revalidatePath("/dashboard/planes");
        return { success: true, message: `Plan ${nuevoEstado === 'activo' ? 'activado' : 'archivado'} exitosamente.` };
    } catch (e: any) {
        return { error: "Error de servidor al cambiar el estado del plan." };
    }
}

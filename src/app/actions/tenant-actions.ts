"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getTenantConfig() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null };

        const { data: profile } = await supabase.from("perfiles").select("tenant_id").eq("id", user.id).single();
        if (!profile?.tenant_id) return { data: null };

        // Aquí usamos maybeSingle() para que NUNCA rompa la pantalla si no hay datos
        const { data: tenant } = await supabase
            .from("tenants")
            .select("*")
            .eq("id", profile.tenant_id)
            .maybeSingle();

        return { data: tenant };
    } catch (e) {
        return { data: null };
    }
}

export async function updateTenantConfig(formData: FormData) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "No estás autenticado" };

        const { data: profile } = await supabase.from("perfiles").select("tenant_id").eq("id", user.id).single();
        if (!profile?.tenant_id) return { success: false, error: "No tienes un gimnasio asignado" };

        const updateData = {
            nombre: formData.get("nombre")?.toString().trim() || null,
            telefono: formData.get("telefono")?.toString().trim() || null,
            direccion: formData.get("direccion")?.toString().trim() || null,
            zona_horaria: formData.get("zona_horaria")?.toString().trim() || "America/Mexico_City",
        };

        // UPDATE LIMPIO: Sin .select() y sin .single(). Solo guardamos y ya.
        const { error: updateError } = await supabase
            .from("tenants")
            .update(updateData)
            .eq("id", profile.tenant_id);

        if (updateError) {
            console.error("Fallo real al guardar:", updateError);
            return { success: false, error: "Error en la base de datos al guardar." };
        }

        // Limpiamos la memoria caché para que la pantalla se actualice sola
        revalidatePath("/", "layout");

        return { success: true, message: "¡Configuración guardada con éxito!" };
    } catch (e: any) {
        console.error("Error fatal en el servidor:", e);
        return { success: false, error: "Error interno del servidor." };
    }
}
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function crearGimnasio(prevState: any, formData: FormData) {
    try {
        const supabase = await createClient();

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return { error: "No estás autenticado." };
        }

        const { data: profile } = await supabase
            .from("perfiles")
            .select("rol")
            .eq("id", session.user.id)
            .single();

        if (profile?.rol !== "super_admin") {
            return { error: "Acceso denegado. Se requiere el rol de Super Administrador." };
        }

        const nombre = formData.get("nombre") as string;
        const slug = formData.get("slug") as string;
        const correo_contacto = formData.get("correo") as string;
        const telefono = formData.get("telefono") as string;

        if (!nombre || !slug) {
            return { error: "Nombre y Slug son obligatorios." };
        }

        const { error } = await supabase
            .from("tenants")
            .insert({
                nombre,
                slug,
                correo_contacto,
                telefono,
                estado: "activo"
            });

        if (error) {
            console.error("Error creating tenant:", error);
            return { error: "Hubo un error al crear el gimnasio. Posiblemente el slug ya exista." };
        }

        revalidatePath("/admin/gimnasios");
        return { success: true, message: "Gimnasio creado exitosamente." };
    } catch (e: any) {
        return { error: "Error de servidor al crear gimnasio." };
    }
}

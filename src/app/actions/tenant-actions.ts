"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function crearGimnasio(prevState: any, formData: FormData) {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { error: "No estás autenticado." };
        }

        const { data: profile } = await supabase
            .from("perfiles")
            .select("rol")
            .eq("id", user.id)
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
export async function editarGimnasio(id: string, formData: FormData) {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { error: "No estás autenticado." };
        }

        const { data: profile } = await supabase
            .from("perfiles")
            .select("rol")
            .eq("id", user.id)
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
            .update({
                nombre,
                slug,
                correo_contacto,
                telefono,
            })
            .eq("id", id);

        if (error) {
            console.error("Error editing tenant:", error);
            return { error: "Hubo un error al editar el gimnasio. Posiblemente el slug ya exista." };
        }

        revalidatePath("/admin/gimnasios");
        return { success: true, message: "Gimnasio actualizado exitosamente." };
    } catch (e: any) {
        return { error: "Error de servidor al editar gimnasio." };
    }
}

export async function toggleEstadoGimnasio(id: string, estadoActual: string) {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { error: "No estás autenticado." };
        }

        const { data: profile } = await supabase
            .from("perfiles")
            .select("rol")
            .eq("id", user.id)
            .single();

        if (profile?.rol !== "super_admin") {
            return { error: "Acceso denegado. Se requiere el rol de Super Administrador." };
        }

        const nuevoEstado = estadoActual === "activo" ? "inactivo" : "activo";

        const { error } = await supabase
            .from("tenants")
            .update({
                estado: nuevoEstado
            })
            .eq("id", id);

        if (error) {
            console.error("Error toggling tenant status:", error);
            return { error: "Hubo un error al cambiar el estado del gimnasio." };
        }

        revalidatePath("/admin/gimnasios");
        return { success: true, message: `Gimnasio ${nuevoEstado === 'activo' ? 'activado' : 'suspendido'} exitosamente.` };
    } catch (e: any) {
        return { error: "Error de servidor al cambiar el estado del gimnasio." };
    }
}

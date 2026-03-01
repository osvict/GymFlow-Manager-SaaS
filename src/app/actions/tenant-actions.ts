"use server";

import { createClient as createAdminClient } from '@supabase/supabase-js';

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
        const correo_admin = formData.get("correo_admin") as string;
        const password_admin = formData.get("password_admin") as string;

        if (!nombre || !slug || !correo_admin || !password_admin) {
            return { error: "Nombre, Slug, Correo de Administrador y Contraseña son obligatorios." };
        }

        const supabaseAdmin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Paso A: Insertar Tenant
        const { data: tenantInsertado, error } = await supabaseAdmin
            .from("tenants")
            .insert({
                nombre,
                slug,
                correo_contacto,
                telefono,
                estado: "activo"
            })
            .select("id")
            .single();

        if (error || !tenantInsertado) {
            console.error("Error creating tenant:", error);
            return { error: "Hubo un error al crear el gimnasio. Posiblemente el slug ya exista." };
        }

        // Paso B: Crear Autenticación del Dueño
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: correo_admin,
            password: password_admin,
            email_confirm: true
        });

        if (authError || !authData.user) {
            // Rollback optional but recommended.
            console.error("Error creating super user:", authError);
            return { error: "Tenant creado pero falló la generación de credenciales (" + (authError?.message || 'Error desconocido') + ")" };
        }

        // Paso C: Vincular el perfil creado por el Trigger al nuevo Tenant
        const { error: profileError } = await supabaseAdmin
            .from('perfiles')
            .update({ tenant_id: tenantInsertado.id, rol: 'admin_gym' })
            .eq('id', authData.user.id);

        if (profileError) {
            console.error("Error updating profile:", profileError);
            return { error: "Tenant y Usuario creados, pero falló la vinculación del perfil." };
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

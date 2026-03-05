"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function crearSocio(prevState: any, formData: FormData) {
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

        if (profile.rol !== "admin_gym" && profile.rol !== "staff") {
            return { error: "Acceso denegado. Se requiere ser admin_gym o staff." };
        }

        const cedula = formData.get("cedula") as string;
        const nombre = formData.get("nombre") as string;
        const apellidos = formData.get("apellidos") as string;
        const correo = formData.get("correo") as string;
        const telefono = formData.get("telefono") as string;
        const foto_url = formData.get("foto_url") as string;

        if (!cedula || !nombre || !apellidos) {
            return { error: "Cédula, nombre y apellidos son obligatorios." };
        }

        if (!/^\d+$/.test(cedula)) {
            return { error: "La cédula debe contener exclusivamente números." };
        }

        const payload: any = {
            tenant_id: profile.tenant_id, // Hardcoded from backend, never trust client
            cedula,
            nombre,
            apellidos,
        };

        if (correo) payload.email = correo;
        if (telefono) payload.telefono = telefono;
        if (foto_url) payload.foto_url = foto_url;

        const { error: insertError } = await supabase
            .from("socios")
            .insert(payload);

        if (insertError) {
            console.error("Error creating socio:", insertError);
            // Manejo de error único (cédula o correo)
            if (insertError.code === '23505') {
                if (insertError.message.includes("cedula")) {
                    return { success: false, error: "Ya existe un socio registrado con esta cédula." };
                }
                return { success: false, error: "Ya existe un socio registrado con este correo/email." };
            }
            return { success: false, error: `Error BD: ${insertError.message}` };
        }

        revalidatePath("/dashboard/socios");
        return { success: true, message: "Socio registrado exitosamente." };
    } catch (e: any) {
        return { error: "Error de servidor al crear socio." };
    }
}

export async function actualizarSocio(prevState: any, formData: FormData) {
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
            return { success: false, error: "Error de contexto." };
        }

        if (profile.rol !== "admin_gym" && profile.rol !== "staff") {
            return { error: "Acceso denegado. Se requiere ser admin_gym o staff." };
        }

        const id = formData.get("id") as string;
        const nombre = formData.get("nombre") as string;
        const apellidos = formData.get("apellidos") as string;
        const correo = formData.get("correo") as string;
        const telefono = formData.get("telefono") as string;

        if (!id || !nombre || !apellidos) {
            return { error: "ID, nombre y apellidos son obligatorios." };
        }

        const payload: any = {
            nombre,
            apellidos,
        };

        if (correo) payload.email = correo;
        if (telefono) payload.telefono = telefono;

        // Por requerimiento del TPM: "la cédula no se edita por seguridad"

        const { error: updateError } = await supabase
            .from("socios")
            .update(payload)
            .eq("id", id)
            .eq("tenant_id", profile.tenant_id); // RLS redundancy check

        if (updateError) {
            console.error("Error updating socio:", updateError);
            if (updateError.code === '23505') {
                return { success: false, error: "Ya existe otro socio registrado con este correo/email." };
            }
            return { success: false, error: `Error BD: ${updateError.message}` };
        }

        revalidatePath("/dashboard/socios");
        return { success: true, message: "Socio actualizado correctamente." };
    } catch (e: any) {
        return { error: "Error de servidor al editar socio." };
    }
}

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

        const { data: profile } = await supabase
            .from("perfiles")
            .select("tenant_id, rol")
            .eq("id", user.id)
            .single();

        if (!profile || !profile.tenant_id) {
            return { error: "Acceso denegado. No tienes un tenant asignado." };
        }

        if (profile.rol !== "admin_gym" && profile.rol !== "staff") {
            return { error: "Acceso denegado. Se requiere ser admin_gym o staff." };
        }

        const nombre = formData.get("nombre") as string;
        const apellidos = formData.get("apellidos") as string;
        const correo = formData.get("correo") as string;
        const telefono = formData.get("telefono") as string;

        if (!nombre || !apellidos) {
            return { error: "El nombre y apellidos son obligatorios." };
        }

        const payload: any = {
            tenant_id: profile.tenant_id, // Hardcoded from backend, never trust client
            nombre,
            apellidos,
        };

        if (correo) payload.correo = correo;
        if (telefono) payload.telefono = telefono;

        const { error } = await supabase
            .from("socios")
            .insert(payload);

        if (error) {
            console.error("Error creating socio:", error);
            // Manejo de error único por correo
            if (error.code === '23505') {
                return { error: "Ya existe un socio registrado con este correo." };
            }
            return { error: "Hubo un error al registrar el socio." };
        }

        revalidatePath("/dashboard/socios");
        return { success: true, message: "Socio registrado exitosamente." };
    } catch (e: any) {
        return { error: "Error de servidor al crear socio." };
    }
}

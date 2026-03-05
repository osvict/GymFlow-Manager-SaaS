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
        const huella_digital = formData.get("huella_digital") as string;
        const plan_id = formData.get("plan_id") as string;

        if (!cedula || !nombre || !apellidos || !plan_id) {
            return { error: "Cédula, nombre, apellidos y Plan Inicial son obligatorios." };
        }

        if (!/^\d+$/.test(cedula)) {
            return { error: "La cédula debe contener exclusivamente números." };
        }

        // --- FETCH DE PLAN ---
        const { data: planActivo, error: planError } = await supabase
            .from("planes")
            .select("id, periodo")
            .eq("id", plan_id)
            .single();

        if (planError || !planActivo) {
            return { error: "El plan seleccionado es inválido o no existe." };
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
        if (huella_digital) payload.huella_digital = huella_digital;

        // 1. Insertamos al Socio
        const { data: resultSocio, error: insertError } = await supabase
            .from("socios")
            .insert(payload)
            .select("id")
            .single();

        if (insertError) {
            console.error("Error creating socio:", insertError);
            if (insertError.code === '23505') {
                if (insertError.message.includes("cedula")) {
                    return { success: false, error: "Ya existe un socio registrado con esta cédula." };
                }
                return { success: false, error: "Ya existe un socio registrado con este correo/email." };
            }
            return { success: false, error: `Error BD: ${insertError.message}` };
        }

        // --- GENERACIÓN DE MEMBRESÍA DE ONBOARDING ---
        const fecha_inicio = new Date();
        const fecha_fin = new Date(fecha_inicio);
        switch (planActivo.periodo) {
            case "DIARIO": fecha_fin.setDate(fecha_fin.getDate() + 1); break;
            case "SEMANAL": fecha_fin.setDate(fecha_fin.getDate() + 7); break;
            case "QUINCENAL": fecha_fin.setDate(fecha_fin.getDate() + 15); break;
            case "MENSUAL": fecha_fin.setMonth(fecha_fin.getMonth() + 1); break;
            case "TRIMESTRAL": fecha_fin.setMonth(fecha_fin.getMonth() + 3); break;
            case "SEMESTRAL": fecha_fin.setMonth(fecha_fin.getMonth() + 6); break;
            case "ANUAL": fecha_fin.setFullYear(fecha_fin.getFullYear() + 1); break;
            default: fecha_fin.setMonth(fecha_fin.getMonth() + 1);
        }

        // 2. Insertar su Membresía Primitiva
        await supabase.from("membresias").insert({
            tenant_id: profile.tenant_id,
            socio_id: resultSocio.id,
            plan_id,
            fecha_inicio: fecha_inicio.toISOString().split('T')[0],
            fecha_fin: fecha_fin.toISOString().split('T')[0],
            estado: "activa"
        });

        // 3. Estampar vencimiento aniversario en Socio
        await supabase.from("socios").update({
            vencimiento_membresia: fecha_fin.toISOString().split('T')[0],
            estado: 'activo'
        }).eq("id", resultSocio.id);

        revalidatePath("/dashboard/socios");
        return { success: true, message: "Socio y Membresía inicial registrados exitosamente." };
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
        const huella_digital = formData.get("huella_digital") as string;

        if (!id || !nombre || !apellidos) {
            return { error: "ID, nombre y apellidos son obligatorios." };
        }

        const payload: any = {
            nombre,
            apellidos,
        };

        if (correo) payload.email = correo;
        if (telefono) payload.telefono = telefono;
        if (huella_digital) payload.huella_digital = huella_digital;

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

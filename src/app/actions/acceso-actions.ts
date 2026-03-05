"use server";

import { createClient } from "@/lib/supabase/server";

export async function verificarAccesoCedula(cedula: string) {
    try {
        const supabase = await createClient();

        // 1. Check Authenticated user context
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: "No autorizado." };
        }

        const { data: profile, error: perfilError } = await supabase
            .from("perfiles")
            .select("tenant_id, rol")
            .eq("id", user.id)
            .single();

        if (perfilError || !profile || !profile.tenant_id) {
            return { success: false, error: "Contexto de gimnasio no encontrado." };
        }

        // Only Staff and Admins can operate the 'cadenero' terminal
        if (profile.rol !== "admin_gym" && profile.rol !== "staff") {
            return { success: false, error: "Acceso denegado: Se requiere rol Admin o Staff." };
        }

        // 2. Fetch the Socio
        const { data: socio, error: socioError } = await supabase
            .from("socios")
            .select("*")
            .eq("tenant_id", profile.tenant_id)
            .eq("cedula", cedula)
            .single();

        let estadoAcceso = "denegado";
        let motivo = "";

        if (socioError || !socio) {
            motivo = "Socio no encontrado (Cédula inválida)";
        } else if (socio.estado !== "activo") {
            motivo = `Membresía Inactiva / Vencida (Estado: ${socio.estado})`;
        } else {
            estadoAcceso = "permitido";
        }

        // 3. Register the Audit Log
        const logPayload: any = {
            tenant_id: profile.tenant_id,
            estado_acceso: estadoAcceso,
            metodo_entrada: "manual",
        };

        if (socio) logPayload.socio_id = socio.id;
        if (motivo) logPayload.motivo_denegacion = motivo;

        const { error: logError } = await supabase
            .from("asistencias")
            .insert(logPayload);

        if (logError) {
            console.error("Error logging asistencia:", logError);
            // We proceed anyway to show the result on the barrier, but log it internally.
        }

        // 4. Return result to the UI Barrier
        return {
            success: true,
            acceso_concedido: estadoAcceso === "permitido",
            mensaje: motivo || "Acceso Concedido",
            socio: socio || null
        };

    } catch (e: any) {
        console.error("Critical error in verificarAccesoCedula:", e);
        return { success: false, error: "Error interno del servidor al verificar acceso." };
    }
}

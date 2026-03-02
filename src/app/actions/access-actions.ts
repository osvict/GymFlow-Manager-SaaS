"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Helper para limpiar números teléfonicos
const cleanPhone = (phone: string) => phone.replace(/\D/g, '');

export async function verificarAccesoSocio(searchQuery: string) {
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

        const tenant_id = profile.tenant_id;

        if (!searchQuery || searchQuery.trim() === '') {
            return { error: "Debes ingresar un número de socio, correo o teléfono." };
        }

        // 1. Buscar al Socio (por ID exacto, o coincidencias de correo/teléfono) dentro de ESTE tenant
        const queryTerm = searchQuery.trim();
        let socioFound = null;

        // Intentar parsear como UUID si la cadena lo parece, para búsqueda directa por ID de tarjeta/tag
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(queryTerm);

        if (isUUID) {
            const { data } = await supabase.from('socios').select('id, nombre, apellidos, correo, telefono, estado').eq('tenant_id', tenant_id).eq('id', queryTerm).single();
            socioFound = data;
        } else {
            // Buscar por correo exacto o teléfono (limpiando formatos)
            const cleanQuery = cleanPhone(queryTerm);

            const { data } = await supabase.from('socios')
                .select('id, nombre, apellidos, correo, telefono, estado')
                .eq('tenant_id', tenant_id)
                .or(`correo.ilike.${queryTerm},telefono.ilike.%${cleanQuery > '' ? cleanQuery : 'IMPOSSIBLE_NOTHING'}%`)
                .limit(1)
                .single();

            socioFound = data;
        }

        // Si no existe el socio
        if (!socioFound) {
            // Registramos el intento fallido
            await registrarAsistencia(supabase, tenant_id, null, 'denegado', 'Socio no encontrado', queryTerm);
            return { granted: false, error: "No se encontró ningún socio con esos datos.", socio: null };
        }

        // 2. Revisar si el socio está inactivo o con adeudo explícito
        if (socioFound.estado !== 'activo') {
            await registrarAsistencia(supabase, tenant_id, socioFound.id, 'denegado', `Estado del socio: ${socioFound.estado.toUpperCase()}`, queryTerm);
            return { granted: false, error: `Acceso denegado: Socio ${socioFound.estado}`, socio: socioFound };
        }

        // 3. Buscar la Membresía Activa
        const hoy = new Date().toISOString().split('T')[0]; // YYYY-MM-DD local UTC

        const { data: membresia } = await supabase
            .from('membresias')
            .select(`
                id, 
                fecha_fin, 
                estado,
                planes_suscripcion(nombre)
            `)
            .eq('socio_id', socioFound.id)
            .eq('estado', 'activa')
            .gte('fecha_fin', hoy) // La fecha de fin es mayor o igual a hoy
            .order('fecha_fin', { ascending: false })
            .limit(1)
            .single();

        if (!membresia) {
            // Buscar si de pura casualidad tiene una membresía pero vencida, para dar un error más claro
            const { data: memVencida } = await supabase
                .from('membresias')
                .select('fecha_fin')
                .eq('socio_id', socioFound.id)
                .order('fecha_fin', { ascending: false })
                .limit(1)
                .single();

            let motivo = 'Sin membresía registrada';
            if (memVencida) {
                motivo = `Membresía vencida el ${new Date(memVencida.fecha_fin).toLocaleDateString()}`;
            }

            // Opcional: auto-actualizar el estado del socio a 'con_adeudo'
            await supabase.from('socios').update({ estado: 'con_adeudo' }).eq('id', socioFound.id);

            await registrarAsistencia(supabase, tenant_id, socioFound.id, 'denegado', motivo, queryTerm);
            return { granted: false, error: motivo, socio: socioFound };
        }

        // 4. ACCESO PERMITIDO
        await registrarAsistencia(supabase, tenant_id, socioFound.id, 'permitido', 'Membresía Vigente', queryTerm);

        revalidatePath("/dashboard/access"); // Refrescar la tabla de historial

        return {
            granted: true,
            message: "¡Bienvenido!",
            socio: socioFound,
            membresia: {
                vencimiento: membresia.fecha_fin,
                plan: (membresia.planes_suscripcion as any)?.nombre || 'Plan Activo'
            }
        };

    } catch (e: any) {
        console.error("Error en verificación de acceso:", e);
        return { error: "Error interno del servidor al verificar acceso." };
    }
}

// Función auxiliar interna
async function registrarAsistencia(supabase: any, tenant_id: string, socio_id: string | null, estado: string, motivo: string, log_term: string) {
    try {
        await supabase.from('asistencias').insert({
            tenant_id,
            socio_id,
            estado_acceso: estado,
            motivo_denegacion: socio_id ? motivo : `Intento con: ${log_term} - ${motivo}`,
            metodo_entrada: 'manual_reception'
        });
    } catch (e) {
        console.error("No se pudo registrar log de asistencia", e);
    }
}

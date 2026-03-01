"use server";

import { createClient } from "@/lib/supabase/server";

export async function getDashboardMetrics() {
    try {
        const supabase = await createClient();

        // 1. Autenticación y Tenant
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: "No autenticado" };

        const { data: profile } = await supabase
            .from("perfiles")
            .select("tenant_id")
            .eq("id", user.id)
            .single();

        if (!profile || !profile.tenant_id) return { error: "Sin tenant asignado" };
        const tenant_id = profile.tenant_id;

        // 2. Fechas de Referencia
        const hoy = new Date();
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString();
        const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59).toISOString();
        const inicioHoy = new Date(hoy.setHours(0, 0, 0, 0)).toISOString();

        // 3. KPI: Total Socios Activos
        const { count: sociosActivos } = await supabase
            .from("socios")
            .select("*", { count: "exact", head: true })
            .eq("tenant_id", tenant_id)
            .eq("estado", "activo");

        // 4. KPI: Ingresos del Mes Actual
        const { data: pagosMes } = await supabase
            .from("pagos")
            .select("monto")
            .eq("tenant_id", tenant_id)
            .gte("fecha_pago", inicioMes)
            .lte("fecha_pago", finMes);

        const ingresosMes = pagosMes?.reduce((acc, curr) => acc + Number(curr.monto), 0) || 0;

        // 5. KPI: Asistencias de Hoy (Permitidas)
        const { count: checkinsHoy } = await supabase
            .from("asistencias")
            .select("*", { count: "exact", head: true })
            .eq("tenant_id", tenant_id)
            .eq("estado_acceso", "permitido")
            .gte("fecha_hora", inicioHoy);

        // 6. Actividad Reciente (Últimos 5 pagos)
        const { data: ultimosPagos } = await supabase
            .from("pagos")
            .select(`
                id,
                monto,
                fecha_pago,
                socios(nombre, apellidos)
            `)
            .eq("tenant_id", tenant_id)
            .order("fecha_pago", { ascending: false })
            .limit(5);

        // 7. Gráfica de Ingresos (Últimos 7 Días)
        // Recharts necesita un array de objetos: [{ name: 'Lun', total: 1500 }, { name: 'Mar', total: 3000 }]
        const hace7Dias = new Date();
        hace7Dias.setDate(hace7Dias.getDate() - 6);
        hace7Dias.setHours(0, 0, 0, 0);

        const { data: pagos7Dias } = await supabase
            .from("pagos")
            .select("monto, fecha_pago")
            .eq("tenant_id", tenant_id)
            .gte("fecha_pago", hace7Dias.toISOString());

        // Agrupar por día
        const chartDataMap: Record<string, number> = {};

        // Inicializar los últimos 7 días en 0
        for (let i = 0; i < 7; i++) {
            const d = new Date(hace7Dias);
            d.setDate(d.getDate() + i);
            const dateStr = d.toLocaleDateString('es-MX', { weekday: 'short' }); // "lun", "mar"
            chartDataMap[dateStr] = 0;
        }

        // Poblar con datos reales
        pagos7Dias?.forEach(pago => {
            const d = new Date(pago.fecha_pago);
            const dateStr = d.toLocaleDateString('es-MX', { weekday: 'short' });
            if (chartDataMap[dateStr] !== undefined) {
                chartDataMap[dateStr] += Number(pago.monto);
            }
        });

        const chartData = Object.keys(chartDataMap).map(key => ({
            name: key.charAt(0).toUpperCase() + key.slice(1),
            total: chartDataMap[key]
        }));

        return {
            kpis: {
                sociosActivos: sociosActivos || 0,
                ingresosMes,
                checkinsHoy: checkinsHoy || 0,
            },
            ultimosPagos: ultimosPagos || [],
            chartData
        };

    } catch (e) {
        console.error("Error obteniendo métricas del dashboard:", e);
        return { error: "Error interno" };
    }
}

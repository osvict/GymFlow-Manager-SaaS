"use client";
import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

export function LiveClock({ zonaHoraria }: { zonaHoraria: string }) {
    const [horaLocal, setHoraLocal] = useState("");

    useEffect(() => {
        const actualizarReloj = () => {
            try {
                const formateador = new Intl.DateTimeFormat("es-MX", {
                    timeZone: zonaHoraria,
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                });
                setHoraLocal(formateador.format(new Date()));
            } catch (e) {
                setHoraLocal("--:-- --");
            }
        };
        actualizarReloj(); // Ejecutar inmediatamente
        const intervalo = setInterval(actualizarReloj, 1000); // Actualizar cada segundo
        return () => clearInterval(intervalo);
    }, [zonaHoraria]);

    // Evitar mismatch de hidratación ocultando el componente hasta que esté montado
    if (!horaLocal) return null;

    return (
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 px-3 py-1.5 rounded-full border shadow-sm w-fit">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>Hora de Sucursal: <strong className="text-slate-700 dark:text-slate-200 uppercase">{horaLocal}</strong></span>
        </div>
    );
}

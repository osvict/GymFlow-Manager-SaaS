"use client";

import { useState, useEffect, useTransition } from "react";
import { Search, ShieldAlert, ShieldCheck, Clock, UserIcon, ScanLine } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { verificarAccesoSocio } from "@/app/actions/access-actions";

export default function ControlAsistencia() {
    const [searchQuery, setSearchQuery] = useState("");
    const [asistencias, setAsistencias] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    // Estado del Monitor
    const [monitorStatus, setMonitorStatus] = useState<"idle" | "granted" | "denied">("idle");
    const [monitorData, setMonitorData] = useState<any>(null);
    const [monitorMessage, setMonitorMessage] = useState("");

    const supabase = createClient();

    const fetchUltimosAccesos = async () => {
        setIsLoading(true);
        // Supabase RLS filters by tenant_id automatically
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
            .from("asistencias")
            .select(`
                id,
                fecha_hora,
                estado_acceso,
                motivo_denegacion,
                metodo_entrada,
                socios (nombre, apellidos)
            `)
            .gte("fecha_hora", hoy.toISOString())
            .order("fecha_hora", { ascending: false })
            .limit(10);

        if (error) {
            console.error(error);
        } else {
            setAsistencias(data || []);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchUltimosAccesos();

        // Configurar subscripción en tiempo real a la tabla asistencias (opcional pero ideal)
        const channel = supabase
            .channel('realtime_asistencias')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'asistencias'
            }, () => {
                fetchUltimosAccesos();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();

        if (!searchQuery.trim()) return;

        setMonitorStatus("idle");

        startTransition(async () => {
            const result = await verificarAccesoSocio(searchQuery);

            if (result.granted) {
                setMonitorStatus("granted");
                setMonitorData(result);
                setMonitorMessage(result.message || "Acceso Permitido");
                toast.success("Acceso concedido");
            } else {
                setMonitorStatus("denied");
                setMonitorData(result.socio ? { socio: result.socio } : null);
                setMonitorMessage(result.error || "Acceso Denegado");
                toast.error("Alerta: Acceso Denegado");
            }

            setSearchQuery(""); // Limpiar input para el siguiente escaneo

            // Regresar el monitor al estado neutro después de 5 segundos
            setTimeout(() => {
                setMonitorStatus("idle");
                setMonitorData(null);
            }, 5000);
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Control de Recepción</h1>
                    <p className="text-muted-foreground mt-1">Escanea credenciales o busca por correo/teléfono para validar el ingreso.</p>
                </div>
            </div>

            {/* MONITOR SECTION */}
            <div className={`w-full overflow-hidden rounded-xl border-4 transition-all duration-300 ${monitorStatus === 'idle' ? 'border-muted bg-card' :
                monitorStatus === 'granted' ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-lg shadow-emerald-500/20' :
                    'border-destructive bg-destructive/5 shadow-lg shadow-destructive/20'
                }`}>
                <div className="flex flex-col md:flex-row min-h-[300px]">
                    {/* Left: Search & Input Panel */}
                    <div className="w-full md:w-1/3 p-6 border-b md:border-b-0 md:border-r bg-card flex flex-col justify-center">
                        <Label htmlFor="search" className="mb-2 text-muted-foreground font-semibold flex items-center gap-2">
                            <ScanLine className="w-4 h-4" /> Escáner de Acceso
                        </Label>
                        <form onSubmit={handleSearch} className="flex gap-2">
                            <Input
                                id="search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="ID, Correo o Teléfono..."
                                className="h-12 text-lg focus-visible:ring-primary shadow-inner"
                                autoFocus
                                disabled={isPending}
                            />
                            <Button type="submit" className="h-12 w-12 shrink-0" disabled={isPending || !searchQuery}>
                                <Search className="w-5 h-5" />
                            </Button>
                        </form>
                        <p className="text-xs text-muted-foreground mt-4 text-center">
                            El sistema detectará automáticamente el tipo de dato ingresado.
                        </p>
                    </div>

                    {/* Right: Output Screen */}
                    <div className="w-full md:w-2/3 p-8 flex items-center justify-center">
                        {monitorStatus === 'idle' ? (
                            <div className="text-center animate-pulse opacity-70">
                                <ScanLine className="w-20 h-20 mx-auto text-muted-foreground/30 mb-4" />
                                <h2 className="text-2xl font-black text-muted-foreground/50 uppercase tracking-widest">Esperando ingreso...</h2>
                            </div>
                        ) : monitorStatus === 'granted' ? (
                            <div className="text-center w-full animate-in zoom-in duration-300">
                                <ShieldCheck className="w-24 h-24 mx-auto text-emerald-500 mb-4 drop-shadow-md" />
                                <h2 className="text-4xl font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tight mb-2">
                                    {monitorMessage}
                                </h2>
                                {monitorData?.socio && (
                                    <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4 mt-6 flex items-center justify-center gap-4 max-w-sm mx-auto border border-emerald-500/20">
                                        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900 border-2 border-emerald-500 flex items-center justify-center">
                                            <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300 uppercase">
                                                {monitorData.socio.nombre?.charAt(0)}{monitorData.socio.apellidos?.charAt(0)}
                                            </span>
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-lg text-foreground truncate max-w-[200px]">{monitorData.socio.nombre} {monitorData.socio.apellidos}</p>
                                            <p className="text-sm text-muted-foreground">{monitorData.membresia?.plan}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center w-full animate-in zoom-in-95 duration-200">
                                <ShieldAlert className="w-28 h-28 mx-auto text-destructive mb-4 drop-shadow-md animate-bounce" />
                                <h2 className="text-5xl font-black text-destructive uppercase tracking-tight mb-4">
                                    ¡ACCESO DENEGADO!
                                </h2>
                                <div className="bg-destructive/10 text-destructive border-2 border-destructive/20 rounded-lg p-3 inline-block font-mono text-lg font-bold mb-4">
                                    {monitorMessage.toUpperCase()}
                                </div>
                                {monitorData?.socio && (
                                    <p className="text-muted-foreground font-medium mt-2">
                                        Socio: {monitorData.socio.nombre} {monitorData.socio.apellidos}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* LOGS TABLE SECTION */}
            <div className="rounded-md border bg-card">
                <div className="p-4 border-b bg-muted/40 font-semibold flex items-center gap-2 text-sm text-foreground">
                    <Clock className="w-4 h-4" /> Bitácora de Accesos de Hoy
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Hora</TableHead>
                            <TableHead>Socio</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Motivo / Método</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                    Consultando la bitácora...
                                </TableCell>
                            </TableRow>
                        ) : asistencias.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-6 text-muted-foreground flex-col items-center">
                                    No hay ingresos registrados el día de hoy.
                                </TableCell>
                            </TableRow>
                        ) : (
                            asistencias.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="font-medium whitespace-nowrap text-muted-foreground">
                                        {new Date(log.fecha_hora).toLocaleTimeString('es-MX', {
                                            hour: '2-digit', minute: '2-digit', second: '2-digit'
                                        })}
                                    </TableCell>
                                    <TableCell>
                                        {log.socios ? (
                                            <span className="font-semibold flex items-center gap-1">
                                                <UserIcon className="w-3 h-3" /> {log.socios.nombre} {log.socios.apellidos}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground italic">Intento Anónimo</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={log.estado_acceso === "permitido" ? "default" : "destructive"}
                                            className={log.estado_acceso === "permitido" ? "bg-emerald-600" : ""}>
                                            {log.estado_acceso.toUpperCase()}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {log.motivo_denegacion || "Ingreso Exitoso"}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

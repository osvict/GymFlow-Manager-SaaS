import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Users, DollarSign, Fingerprint } from "lucide-react";

export default function DashboardPage() {
    return (
        <>
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard General</h1>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Miembros Activos</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">+2,350</div>
                        <p className="text-xs text-muted-foreground">+180 desde el mes pasado</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ingresos Mensuales</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">$45,231.89</div>
                        <p className="text-xs text-muted-foreground">+20.1% desde el mes pasado</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Accesos Hoy (Edge)</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">+573</div>
                        <p className="text-xs text-muted-foreground">Pico a las 18:00 hrs</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Latencia Promedio IoT</CardTitle>
                        <Fingerprint className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">142 ms</div>
                        <p className="text-xs text-green-500">Óptimo (&lt; 1s)</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Flujo de Accesos (24h)</CardTitle>
                        <CardDescription>
                            Frecuencia de entradas a través del torniquete de validación facial.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[200px] w-full flex items-center justify-center border-dashed border-2 border-border rounded-lg bg-muted/20">
                            <p className="text-muted-foreground text-sm">[Gráfico Recharts Aquí]</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Últimos Accesos</CardTitle>
                        <CardDescription>Log en tiempo real de los agentes Edge.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[
                                { name: "Carlos Mendoza", time: "Hace 2 min", status: "GRANTED", score: 0.92 },
                                { name: "Ana Sofia Ruiz", time: "Hace 14 min", status: "GRANTED", score: 0.98 },
                                { name: "Usuario Desconocido", time: "Hace 28 min", status: "DENIED", score: 0.45 },
                            ].map((log, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center border">
                                            <Fingerprint className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium leading-none">{log.name}</p>
                                            <p className="text-xs text-muted-foreground">{log.time}</p>
                                        </div>
                                    </div>
                                    <div className={`text-xs font-semibold px-2 py-1 rounded-full ${log.status === 'GRANTED' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                        }`}>
                                        {log.status} ({log.score})
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

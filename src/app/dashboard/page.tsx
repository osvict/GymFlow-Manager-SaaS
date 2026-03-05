import { Users, Activity, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDashboardMetrics } from "@/app/actions/dashboard-actions";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    const metrics = await getDashboardMetrics();

    if (metrics.error) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-[60vh]">
                <h2 className="text-2xl font-bold mb-2 text-destructive">Error de Acceso</h2>
                <p className="text-muted-foreground">{metrics.error}</p>
            </div>
        );
    }

    const { kpis } = metrics;

    // Mock data temporal
    const vencimientosMock = [
        { id: 1, nombre: "Carlos", apellidos: "Méndez", contacto: "carlos.md@email.com", dias: 1, mensaje: "Vence mañana" },
        { id: 2, nombre: "Ana", apellidos: "García", contacto: "+52 555 123 4567", dias: 2, mensaje: "Vence en 2 días" },
        { id: 3, nombre: "Luis", apellidos: "Rodríguez", contacto: "luis.r@email.com", dias: 3, mensaje: "Vence en 3 días" },
        { id: 4, nombre: "María", apellidos: "Fernández", contacto: "+52 555 987 6543", dias: 0, mensaje: "Vence hoy" },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Centro de Mando</h1>
                <p className="text-muted-foreground mt-2">Visión general del rendimiento y actividad de tu centro deportivo.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                <Card className="bg-card hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Socios Activos</CardTitle>
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{kpis?.sociosActivos || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Con membresía vigente o pagada</p>
                    </CardContent>
                </Card>

                <Card className="bg-card hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Asistencias de Hoy</CardTitle>
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                            <Activity className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{kpis?.checkinsHoy || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Check-ins verificados hoy</p>
                    </CardContent>
                </Card>

                <Card className="bg-card hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Fecha de Corte</CardTitle>
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                            <CalendarDays className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {new Date().toLocaleDateString('es-MX', { month: 'short', year: 'numeric' }).toUpperCase()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Periodo actual en curso</p>
                    </CardContent>
                </Card>
            </div>

            {/* Próximos Vencimientos */}
            <div className="mt-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Próximos Vencimientos</CardTitle>
                        <CardDescription>Socios con membresías por expirar pronto.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Socio</TableHead>
                                    <TableHead>Contacto</TableHead>
                                    <TableHead>Días Restantes</TableHead>
                                    <TableHead className="text-right">Estado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {vencimientosMock.map((socio) => (
                                    <TableRow key={socio.id}>
                                        <TableCell className="font-medium">
                                            {socio.nombre} {socio.apellidos}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {socio.contacto}
                                        </TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${socio.dias <= 1 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                                                }`}>
                                                {socio.mensaje}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className="text-yellow-600 dark:text-yellow-500 font-medium text-sm">
                                                Por Vencer
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

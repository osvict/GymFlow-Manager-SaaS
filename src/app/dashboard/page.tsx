import { Users, DollarSign, Activity, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Panel Principal</h1>
                <p className="text-muted-foreground mt-2">Visión general del estado de tu autolavado.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Servicios Activos</CardTitle>
                        <Users className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">1,248</div>
                        <p className="text-xs text-muted-foreground">+12% respecto al mes anterior</p>
                    </CardContent>
                </Card>
                <Card className="bg-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Ingresos del Mes</CardTitle>
                        <DollarSign className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">$45,231.89</div>
                        <p className="text-xs text-muted-foreground">+8.1% respecto al mes anterior</p>
                    </CardContent>
                </Card>
                <Card className="bg-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Accesos Hoy</CardTitle>
                        <Activity className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">342</div>
                        <p className="text-xs text-muted-foreground">Flujo normal esperado</p>
                    </CardContent>
                </Card>
                <Card className="bg-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Nuevos Registros</CardTitle>
                        <UserPlus className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">+24</div>
                        <p className="text-xs text-muted-foreground">Solo en los últimos 7 días</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Últimos Accesos</CardTitle>
                        <CardDescription>Monitoreo en tiempo real del ingreso a las instalaciones.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Hora</TableHead>
                                    <TableHead>Estado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {[
                                    { name: "Ford Mustang (Juan P.)", time: "Hace 2 min", status: "Completado", statusColor: "text-green-500" },
                                    { name: "Honda CR-V (María G.)", time: "Hace 5 min", status: "Completado", statusColor: "text-green-500" },
                                    { name: "Nissan Versa (Carlos L.)", time: "Hace 12 min", status: "Cancelado", statusColor: "text-red-500" },
                                    { name: "Toyota RAV4 (Ana T.)", time: "Hace 15 min", status: "Completado", statusColor: "text-green-500" },
                                ].map((row, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-medium">{row.name}</TableCell>
                                        <TableCell>{row.time}</TableCell>
                                        <TableCell className={`font-semibold ${row.statusColor}`}>{row.status}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Accesos Rápidos</CardTitle>
                        <CardDescription>Acciones principales del sistema.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button className="w-full justify-start" size="lg">
                            <UserPlus className="mr-2 h-4 w-4" />
                            + Nuevo Servicio
                        </Button>
                        <Button className="w-full justify-start" variant="secondary" size="lg">
                            <DollarSign className="mr-2 h-4 w-4" />
                            + Registrar Pago
                        </Button>
                        <Button className="w-full justify-start" variant="outline" size="lg">
                            <Activity className="mr-2 h-4 w-4" />
                            Evaluar Antigravity
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

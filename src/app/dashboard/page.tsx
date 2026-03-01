import { Users, DollarSign, Activity, CalendarDays, Banknote, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { getDashboardMetrics } from "@/app/actions/dashboard-actions";
import Link from "next/link";
import { RevenueChart } from "./components/RevenueChart";

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

    const { kpis, ultimosPagos, chartData } = metrics;

    // Helper para formato moneda
    const formatoMoneda = new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 0
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Centro de Mando</h1>
                <p className="text-muted-foreground mt-2">Visión general del rendimiento y actividad de tu centro deportivo.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-card hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos del Mes</CardTitle>
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                            <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                            {formatoMoneda.format(kpis?.ingresosMes || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center">
                            Flujo de efectivo mensual
                        </p>
                    </CardContent>
                </Card>

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
                        <p className="text-xs text-muted-foreground mt-1">Periodo fiscal actual</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts and Tables */}
            <div className="grid gap-6 lg:grid-cols-7">

                {/* Gráfica de Ingresos */}
                <Card className="lg:col-span-4 bg-card">
                    <CardHeader>
                        <CardTitle>Flujo de Ingresos (Últimos 7 Días)</CardTitle>
                        <CardDescription>Rendimiento financiero de ventas y renovaciones.</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-0 pb-4">
                        <RevenueChart data={chartData || []} />
                    </CardContent>
                </Card>

                {/* Últimos Pagos */}
                <Card className="lg:col-span-3">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Transacciones Recientes</CardTitle>
                            <CardDescription>Últimos cobros registrados en caja.</CardDescription>
                        </div>
                        <Link href="/dashboard/payments">
                            <Button variant="outline" size="icon" className="h-8 w-8">
                                <ArrowUpRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {ultimosPagos && ultimosPagos.length > 0 ? (
                            <div className="space-y-6">
                                {ultimosPagos.map((pago: any) => (
                                    <div key={pago.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
                                                <Banknote className="h-4 w-4 text-emerald-600" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium leading-none">
                                                    {pago.socios?.nombre} {pago.socios?.apellidos}
                                                </span>
                                                <span className="text-xs text-muted-foreground mt-1">
                                                    {new Date(pago.fecha_pago).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="font-semibold text-sm text-emerald-600">
                                            +{formatoMoneda.format(pago.monto)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground">
                                <Banknote className="h-8 w-8 mb-2 opacity-20" />
                                <p className="text-sm">No hay transacciones recientes.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

"use client";

import { useState, useEffect, useTransition } from "react";
import { CreditCard, Banknote, Landmark, User, ShoppingCart, Tag, Store, Receipt, Wallet, LockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { registrarPagoYMembresia, getSesionCajaActiva, abrirCaja, cerrarCaja, registrarEgreso } from "@/app/actions/payment-actions";

export default function CajaPOS() {
    const [sesion, setSesion] = useState<any>(null);
    const [balanceEfectivo, setBalanceEfectivo] = useState(0);
    const [balanceTarjeta, setBalanceTarjeta] = useState(0);
    const [balanceTransf, setBalanceTransf] = useState(0);

    const [socios, setSocios] = useState<any[]>([]);
    const [planes, setPlanes] = useState<any[]>([]);
    const [historial, setHistorial] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // React18 Transitions for all Server Action states
    const [isPendingVenta, startTransitionVenta] = useTransition();
    const [isPendingApertura, startTransitionApertura] = useTransition();
    const [isPendingEgreso, startTransitionEgreso] = useTransition();
    const [isPendingCierre, startTransitionCierre] = useTransition();

    const [planSeleccionado, setPlanSeleccionado] = useState<any>(null);

    const supabase = createClient();

    const fetchCajaData = async () => {
        setIsLoading(true);

        // 1. Evaluar si hay turno activo (Caja Abierta)
        const { data: activa, error: activaError } = await getSesionCajaActiva();

        if (activa) {
            setSesion(activa);
            // 2. Si está abierta, cargar catálogos
            const { data: sociosData } = await supabase.from("socios").select("id, nombre, apellidos, estado");
            setSocios(sociosData || []);

            const { data: planesData, error: planesError } = await supabase.from("planes").select("id, nombre, precio, periodo").eq("estado", "activo");
            if (planesError) { toast.error("Error al cargar planes."); setPlanes([]); }
            else if (!planesData || planesData.length === 0) { toast.warning("No hay planes activos."); setPlanes([]); }
            else { setPlanes(planesData); }

            // 3. Obtener Movimientos Financieros para las Tarjetas e Historial
            const { data: movimientos } = await supabase
                .from("movimientos_caja")
                .select("id, tipo, concepto, monto, metodo_pago, created_at, referencia_externa_id")
                .eq("sesion_caja_id", activa.id)
                .order("created_at", { ascending: false });

            let efec = Number(activa.monto_inicial);
            let tarj = 0;
            let trans = 0;
            let arrHistorial: any[] = [];

            if (movimientos && movimientos.length > 0) {
                // Para obtener nombres reales de los socios si el ingreso fue membresía
                const pagosIds = movimientos.filter(m => m.tipo === 'ingreso' && m.referencia_externa_id).map(m => m.referencia_externa_id);
                let pagosNombres: Record<string, string> = {};

                if (pagosIds.length > 0) {
                    const { data: pagosData } = await supabase
                        .from("pagos")
                        .select("id, socio_id:socios(nombre, apellidos)")
                        .in("id", pagosIds);

                    if (pagosData) {
                        pagosData.forEach((p: any) => {
                            // En supabase-js, las columnas foreign forzadas con alias llegan como objetos anidados
                            if (p.socio_id && !Array.isArray(p.socio_id)) {
                                pagosNombres[p.id] = `${p.socio_id.nombre} ${p.socio_id.apellidos}`;
                            }
                        });
                    }
                }

                arrHistorial = movimientos.map(mov => {
                    const factor = mov.tipo === 'ingreso' ? 1 : -1;
                    if (mov.metodo_pago === 'efectivo') efec += Number(mov.monto) * factor;
                    if (mov.metodo_pago === 'tarjeta') tarj += Number(mov.monto) * factor;
                    if (mov.metodo_pago === 'transferencia') trans += Number(mov.monto) * factor;

                    let conceptoFinal = mov.concepto;
                    if (mov.tipo === 'ingreso' && mov.referencia_externa_id && pagosNombres[mov.referencia_externa_id]) {
                        conceptoFinal = `Membresía - ${pagosNombres[mov.referencia_externa_id]}`;
                    }

                    return {
                        id: mov.id,
                        hora: mov.created_at,
                        concepto: conceptoFinal,
                        tipo: mov.tipo,
                        metodo: mov.metodo_pago,
                        monto: mov.monto
                    };
                });
            }

            setBalanceEfectivo(efec);
            setBalanceTarjeta(tarj);
            setBalanceTransf(trans);
            setHistorial(arrHistorial);
        } else {
            setSesion(null); // Caja Cerrada
            setHistorial([]);
        }

        setIsLoading(false);
    };

    useEffect(() => {
        fetchCajaData();
    }, []);

    const onPlanChange = (value: string) => { const plan = planes.find(p => p.id === value); setPlanSeleccionado(plan); };

    // --- MANEJADORES DE ACCIONES --- //

    const onAbrirSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransitionApertura(async () => {
            const result = await abrirCaja(formData);
            if (result?.error) toast.error(result.error);
            else if (result?.success) { toast.success(result.message); fetchCajaData(); }
        });
    };

    const onCloseSession = () => {
        if (!sesion) return;
        startTransitionCierre(async () => {
            const result = await cerrarCaja(sesion.id);
            if (result?.error) toast.error(result.error);
            else { toast.success(result.message); fetchCajaData(); }
        });
    }

    const onVentaSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransitionVenta(async () => {
            const result = await registrarPagoYMembresia(null, formData);
            if (result?.error) toast.error(result.error);
            else if (result?.success) {
                toast.success(result.message);
                (e.target as HTMLFormElement).reset();
                setPlanSeleccionado(null);
                fetchCajaData(); // Recargar tarjetas métricas
            }
        });
    };

    const onEgresoSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransitionEgreso(async () => {
            const result = await registrarEgreso(formData);
            if (result?.error) toast.error(result.error);
            else if (result?.success) {
                toast.success(result.message);
                (e.target as HTMLFormElement).reset();
                fetchCajaData(); // Impactar la resta en las métricas
            }
        });
    }

    const fmtMoneda = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

    if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Sincronizando Módulo Financiero...</div>;

    // --- VISTA A: CAJA CERRADA --- //
    if (!sesion) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] p-4">
                <Card className="w-full max-w-md border-2 border-slate-200 shadow-xl rounded-2xl overflow-hidden">
                    <div className="bg-slate-900 p-8 text-center">
                        <LockKeyhole className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-2">Cerrado por Turno</h2>
                        <p className="text-slate-400 text-sm">Debes declarar el fondo de caja físico para iniciar sistema.</p>
                    </div>
                    <CardContent className="p-8">
                        <form onSubmit={onAbrirSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-base text-slate-700 font-semibold flex gap-2 items-center">
                                    <Banknote className="w-4 h-4 text-emerald-600" /> Monto Inicial (Fondo en Efectivo)
                                </Label>
                                <Input type="number" name="monto_inicial" min="0" step="0.01" defaultValue="0" required
                                    className="h-14 text-2xl font-mono text-center" disabled={isPendingApertura} />
                            </div>
                            <Button type="submit" className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700" disabled={isPendingApertura}>
                                {isPendingApertura ? "Abriendo Turno..." : "Abrir Flujo de Caja"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // --- VISTA B: CAJA ABIERTA (DASHBOARD) --- //
    return (
        <div className="space-y-6 max-w-6xl mx-auto h-full p-4">
            {/* Header y Botón Cierre */}
            <div className="flex flex-col md:flex-row shadow-sm bg-card border rounded-2xl p-6 items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-3">
                        <Store className="w-8 h-8 text-emerald-600" /> Control Financiero
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm font-medium">
                        Sesión Abierta el: {new Date(sesion.fecha_apertura).toLocaleString()}
                    </p>
                </div>

                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="h-12 px-6 rounded-xl font-bold uppercase tracking-widest" disabled={isPendingCierre}>
                            Cerrar Turno Oficial
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Hacer corte de caja?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Se detendrán las transacciones. Este bloque sellará los montos recolectados. Se asume que el dinero en los cajones cuadra con los balances reportados por el sistema en este momento.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Mantener Abierta</AlertDialogCancel>
                            <AlertDialogAction onClick={onCloseSession} className="bg-red-600">Sí, Cerrar Caja</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>

            {/* Panel Superior Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-emerald-700 flex justify-between items-center text-base">
                            CAJÓN FÍSICO (Efectivo) <Banknote className="w-4 h-4" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-black text-emerald-700 font-mono tracking-tighter">{fmtMoneda(balanceEfectivo)}</p>
                    </CardContent>
                </Card>
                <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-blue-700 flex justify-between items-center text-base">
                            TERMINAL POS (Tarjeta) <CreditCard className="w-4 h-4" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-black text-blue-700 font-mono tracking-tighter">{fmtMoneda(balanceTarjeta)}</p>
                    </CardContent>
                </Card>
                <Card className="bg-purple-50/50 dark:bg-purple-950/20 border-purple-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-purple-700 flex justify-between items-center text-base">
                            BANCO (Transferencias) <Landmark className="w-4 h-4" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-black text-purple-700 font-mono tracking-tighter">{fmtMoneda(balanceTransf)}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Area de Trabajo Subordinada */}
            <Tabs defaultValue="ingreso" className="w-full mt-6">
                <TabsList className="grid w-full grid-cols-2 h-14 bg-muted/50 rounded-xl p-1 mb-6">
                    <TabsTrigger value="ingreso" className="rounded-lg text-base data-[state=active]:bg-emerald-600 data-[state=active]:text-white transition-all shadow-sm">
                        <ShoppingCart className="w-4 h-4 mr-2" /> Venta a Cliente
                    </TabsTrigger>
                    <TabsTrigger value="egreso" className="rounded-lg text-base data-[state=active]:bg-rose-600 data-[state=active]:text-white transition-all shadow-sm">
                        <Receipt className="w-4 h-4 mr-2" /> Extraer de Caja (Egreso)
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: EL FORMULARIO DE VENTAS (MODIFICADO LIGERAMENTE PARA ENCAJAR) */}
                <TabsContent value="ingreso" className="mt-0 outline-none">
                    <form onSubmit={onVentaSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                            {/* Tarjeta 1: Datos de Venta */}
                            <Card className="border shadow-sm rounded-xl bg-card">
                                <CardHeader className="bg-muted/10 pb-4 border-b rounded-t-xl gap-1">
                                    <CardTitle className="flex items-center gap-2 text-xl"><ShoppingCart className="w-5 h-5 text-emerald-600" /> Afiliar Suscripción</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-6 px-6">
                                    <div className="space-y-3">
                                        <label className="text-sm font-semibold flex items-center gap-2"><User className="w-4 h-4" /> 1. Seleccionar Socio</label>
                                        <Select name="socio_id" required disabled={isPendingVenta}>
                                            <SelectTrigger className="w-full h-12 bg-slate-50 dark:bg-slate-900 border-slate-300">
                                                <SelectValue placeholder="Busca al socio inactivo" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {socios.map(s => <SelectItem key={s.id} value={s.id}>{s.nombre} {s.apellidos} {s.estado !== 'activo' ? `(${s.estado})` : ''}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-sm font-semibold flex items-center gap-2"><Tag className="w-4 h-4" /> 2. Seleccionar Plan / Clase</label>
                                        <Select name="plan_id" required disabled={isPendingVenta} onValueChange={onPlanChange}>
                                            <SelectTrigger className="w-full h-12 bg-slate-50 dark:bg-slate-900 border-slate-300">
                                                <SelectValue placeholder="Elige la membresía" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {planes.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre} ({fmtMoneda(p.precio)})</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Tarjeta 2: Cobro Checkout */}
                            <Card className="border border-emerald-500/20 shadow-sm rounded-xl">
                                <CardHeader className="bg-emerald-50/50 dark:bg-emerald-950/20 pb-4 border-b border-emerald-500/10 rounded-t-xl gap-1">
                                    <CardTitle className="flex items-center gap-2 text-xl text-emerald-700 dark:text-emerald-400">
                                        <Banknote className="w-5 h-5" /> Checkout y Monetario
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-6 px-6">
                                    <div className="space-y-3">
                                        <label className="text-sm font-semibold">3. Vía de Pago de la Venta</label>
                                        <Select name="metodo_pago" required defaultValue="efectivo" disabled={isPendingVenta}>
                                            <SelectTrigger className="w-full h-12 border-emerald-300 bg-emerald-50/20">
                                                <SelectValue placeholder="¿Cómo paga?" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="efectivo"><div className="flex items-center gap-2"><Banknote className="w-4 h-4 text-green-600" /> Efectivo MN</div></SelectItem>
                                                <SelectItem value="tarjeta"><div className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-blue-600" /> Tarjeta B.</div></SelectItem>
                                                <SelectItem value="transferencia"><div className="flex items-center gap-2"><Landmark className="w-4 h-4 text-purple-600" /> SPEI</div></SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="mt-4 bg-slate-50 dark:bg-slate-900 p-6 rounded-xl text-center border border-emerald-200">
                                        <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Monto a Enviar a Caja</p>
                                        <h2 className="text-5xl font-black text-emerald-600 font-mono tracking-tighter">
                                            {planSeleccionado ? fmtMoneda(planSeleccionado.precio) : "$0.00"}
                                        </h2>
                                    </div>
                                    <Button type="submit" disabled={!planSeleccionado || isPendingVenta} className="w-full h-16 text-lg font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 mt-2 uppercase">
                                        {isPendingVenta ? "Procesando BD..." : "Ejecutar Transacción Fija"}
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </form>
                </TabsContent>

                {/* TAB 2: EGRESO OPERATORIO DE CAJA */}
                <TabsContent value="egreso" className="mt-0 outline-none">
                    <Card className="max-w-2xl mx-auto border-2 border-rose-100 shadow-md">
                        <CardHeader className="bg-rose-50/50 pb-6 border-b border-rose-100 dark:bg-rose-950/20">
                            <CardTitle className="flex items-center gap-2 text-2xl text-rose-700 dark:text-rose-400">
                                <Wallet className="w-6 h-6" /> Retirar de los Fondos (Egreso)
                            </CardTitle>
                            <CardDescription>Extrae dinero justificado de los balances actuales (Gastos Operativos).</CardDescription>
                        </CardHeader>
                        <form onSubmit={onEgresoSubmit}>
                            <CardContent className="space-y-6 pt-8">
                                <div className="space-y-2">
                                    <Label className="text-base font-semibold">¿De donde salió el dinero para pagar esto?</Label>
                                    <Select name="metodo_pago" required defaultValue="efectivo" disabled={isPendingEgreso}>
                                        <SelectTrigger className="w-full h-14 border-rose-200 bg-white dark:bg-slate-900">
                                            <SelectValue placeholder="Seleccione el balde" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="efectivo"><div className="flex items-center gap-2 font-medium"><Banknote className="text-emerald-600" /> Efectivo (Cajón Físico)</div></SelectItem>
                                            <SelectItem value="tarjeta"><div className="flex items-center gap-2 font-medium"><CreditCard className="text-blue-600" /> Balance de Tarjeta</div></SelectItem>
                                            <SelectItem value="transferencia"><div className="flex items-center gap-2 font-medium"><Landmark className="text-purple-600" /> Saldo de Banco</div></SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-base font-semibold">Monto del Retiro ($)</Label>
                                    <Input type="number" name="monto" min="0.01" step="0.01" placeholder="0.00" required className="h-14 text-xl font-mono border-rose-200" disabled={isPendingEgreso} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-base font-semibold">Concepto / Disposición</Label>
                                    <Input type="text" name="concepto" placeholder="Ej: Compra de garrafones, limpieza, sueldo..." required className="h-14 border-rose-200" disabled={isPendingEgreso} />
                                </div>
                                <Button type="submit" disabled={isPendingEgreso} className="w-full h-16 text-lg font-bold bg-rose-600 hover:bg-rose-700 uppercase tracking-widest mt-4">
                                    {isPendingEgreso ? "Procesando..." : "Mermar Fondo"}
                                </Button>
                            </CardContent>
                        </form>
                    </Card>
                </TabsContent>

            </Tabs>

            {/* HISTORIAL DE MOVIMIENTOS */}
            <Card className="mt-8 border shadow-sm rounded-xl overflow-hidden">
                <CardHeader className="bg-slate-50 border-b dark:bg-slate-900/50">
                    <CardTitle className="text-xl text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-slate-500" /> Historial de Movimientos
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {historial.length === 0 ? (
                        <div className="p-10 text-center text-muted-foreground font-medium">
                            Aún no hay movimientos en este turno.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow>
                                    <TableHead className="w-[100px] text-center">Hora</TableHead>
                                    <TableHead>Concepto</TableHead>
                                    <TableHead>Método</TableHead>
                                    <TableHead className="text-center">Tipo</TableHead>
                                    <TableHead className="text-right">Monto</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {historial.map((mov) => (
                                    <TableRow key={mov.id} className="hover:bg-slate-50/50">
                                        <TableCell className="text-center font-medium text-slate-500">
                                            {new Date(mov.hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </TableCell>
                                        <TableCell className="font-semibold text-slate-700 dark:text-slate-300">
                                            {mov.concepto}
                                        </TableCell>
                                        <TableCell className="capitalize text-slate-600">
                                            {mov.metodo}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={mov.tipo === 'ingreso' ? 'default' : 'destructive'}
                                                className={mov.tipo === 'ingreso'
                                                    ? 'bg-emerald-100/80 text-emerald-700 hover:bg-emerald-100 border-none'
                                                    : 'bg-rose-100/80 text-rose-700 hover:bg-rose-100 border-none'}>
                                                {mov.tipo}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className={`text-right font-mono font-bold text-lg ${mov.tipo === 'ingreso' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {mov.tipo === 'ingreso' ? '+' : '-'}{fmtMoneda(mov.monto)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

        </div>
    );
}

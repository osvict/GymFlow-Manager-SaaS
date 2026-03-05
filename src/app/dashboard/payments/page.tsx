"use client";

import { useState, useEffect, useTransition } from "react";
import { CreditCard, Banknote, Landmark, User, ShoppingCart, Tag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { registrarPagoYMembresia } from "@/app/actions/payment-actions";

export default function CajaPOS() {
    const [socios, setSocios] = useState<any[]>([]);
    const [planes, setPlanes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [planSeleccionado, setPlanSeleccionado] = useState<any>(null);

    const supabase = createClient();

    const fetchPOSData = async () => {
        setIsLoading(true);

        // 1. Cargar Socios Activos
        const { data: sociosData } = await supabase
            .from("socios")
            .select("id, nombre, apellidos, estado");
        setSocios(sociosData || []);

        // 2. Cargar Planes usando tabla nativa configurada 'planes'
        const { data: planesData, error: planesError } = await supabase
            .from("planes")
            .select("id, nombre, precio, periodo")
            .eq("estado", "activo");

        if (planesError) {
            console.error("Error Extrayendo Planes:", planesError);
            toast.error("Error al cargar los catálogos de planes.");
            setPlanes([]);
        } else if (!planesData || planesData.length === 0) {
            toast.warning("No hay planes activos registrados en este gimnasio.");
            setPlanes([]);
        } else {
            setPlanes(planesData);
        }

        setIsLoading(false);
    };

    useEffect(() => {
        fetchPOSData();
    }, []);

    const onPlanChange = (value: string) => {
        const plan = planes.find(p => p.id === value);
        setPlanSeleccionado(plan);
    };

    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        startTransition(async () => {
            const result = await registrarPagoYMembresia(null, formData);
            if (result?.error) {
                toast.error(result.error);
            } else if (result?.success) {
                toast.success(result.message);
                // Reset form completely handling native HTML wrapper workaround
                const target = e.target as HTMLFormElement;
                target.reset();
                setPlanSeleccionado(null);
            }
        });
    };

    const formatoMoneda = new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
    });

    return (
        <div className="space-y-6 max-w-5xl mx-auto h-full p-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Caja y Punto de Venta</h1>
                <p className="text-muted-foreground mt-1">Registra la venta de nuevas membresías, periodos y cobros físicos.</p>
            </div>

            <form onSubmit={onSubmit} className="mt-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    {/* Tarjeta 1: Datos de Venta */}
                    <Card className="border-2 shadow-sm rounded-xl">
                        <CardHeader className="bg-muted/30 pb-4 border-b rounded-t-xl gap-1">
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <ShoppingCart className="w-5 h-5 text-emerald-600" />
                                Datos de la Venta
                            </CardTitle>
                            <CardDescription className="text-sm">
                                Asigna el cliente y el modelo exacto que se consumirá en el recinto.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8 pt-8 px-6">

                            {/* Campo 1: Socio */}
                            <div className="space-y-3">
                                <label className="text-sm font-semibold flex items-center gap-2"><User className="w-4 h-4" /> 1. Seleccionar Socio (Cliente)</label>
                                <Select name="socio_id" required disabled={isPending || isLoading}>
                                    <SelectTrigger className="w-full h-12 bg-slate-50 dark:bg-slate-900 border-slate-300">
                                        <SelectValue placeholder="Busca al socio por base de datos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {socios.map(socio => (
                                            <SelectItem key={socio.id} value={socio.id} className="py-3">
                                                {socio.nombre} {socio.apellidos} {socio.estado !== 'activo' ? `(Estado: ${socio.estado})` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Campo 2: Plan */}
                            <div className="space-y-3">
                                <label className="text-sm font-semibold flex items-center gap-2"><Tag className="w-4 h-4" /> 2. Seleccionar Modelo / Pase</label>
                                <Select name="plan_id" required disabled={isPending || isLoading} onValueChange={onPlanChange}>
                                    <SelectTrigger className="w-full h-12 bg-slate-50 dark:bg-slate-900 border-slate-300">
                                        <SelectValue placeholder="Elige la membresía o pase a facturar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {planes.map(plan => (
                                            <SelectItem key={plan.id} value={plan.id} className="py-3">
                                                {plan.nombre} ({formatoMoneda.format(plan.precio)})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                        </CardContent>
                    </Card>

                    {/* Tarjeta 2: Cobro y Checkout */}
                    <Card className="border-2 border-emerald-500/20 shadow-sm rounded-xl">
                        <CardHeader className="bg-emerald-50/50 dark:bg-emerald-950/20 pb-4 border-b border-emerald-500/10 rounded-t-xl gap-1">
                            <CardTitle className="flex items-center gap-2 text-xl text-emerald-700 dark:text-emerald-400">
                                <Banknote className="w-5 h-5" />
                                Recepción Monetaria
                            </CardTitle>
                            <CardDescription className="text-sm">
                                Resumen financiero total y transacción final de caja.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8 pt-8 px-6">

                            {/* Campo 3: Método de Pago */}
                            <div className="space-y-3">
                                <label className="text-sm font-semibold">3. Vía de Pago</label>
                                <Select name="metodo_pago" required defaultValue="efectivo" disabled={isPending}>
                                    <SelectTrigger className="w-full h-12 border-emerald-300 focus:ring-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20">
                                        <SelectValue placeholder="¿Cómo pagará el socio?" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="efectivo" className="py-3 font-medium">
                                            <div className="flex items-center gap-3"><Banknote className="w-5 h-5 text-green-600" /> Efectivo Moneda Nacional</div>
                                        </SelectItem>
                                        <SelectItem value="tarjeta" className="py-3 font-medium">
                                            <div className="flex items-center gap-3"><CreditCard className="w-5 h-5 text-blue-600" /> Tarjeta Vía Terminal Bancaria (TPV)</div>
                                        </SelectItem>
                                        <SelectItem value="transferencia" className="py-3 font-medium">
                                            <div className="flex items-center gap-3"><Landmark className="w-5 h-5 text-purple-600" /> Transferencia o SPEI</div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Resumen Total */}
                            <div className="mt-6 bg-slate-50 dark:bg-slate-900/50 p-8 rounded-2xl text-center border-2 border-dashed border-emerald-200 dark:border-emerald-800">
                                <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-3">Total De La Factura</p>
                                <h2 className="text-6xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tighter">
                                    {planSeleccionado ? formatoMoneda.format(planSeleccionado.precio) : "$0.00"}
                                </h2>
                                {planSeleccionado && (
                                    <p className="text-sm font-medium text-muted-foreground mt-4 py-1.5 px-3 bg-slate-200 dark:bg-slate-800 rounded-full inline-block">
                                        Duración Otorgada: 1 <span className="text-slate-900 dark:text-slate-100 uppercase">{planSeleccionado.periodo}</span>
                                    </p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                disabled={!planSeleccionado || isPending}
                                className="w-full h-20 text-xl font-bold rounded-2xl bg-emerald-600 hover:bg-emerald-700 shadow-[0_10px_25px_-5px_rgba(16,185,129,0.4)] uppercase tracking-widest mt-6 transition-all border border-emerald-500"
                            >
                                {isPending ? "Validando Operación Bancaria..." : "Procesar Cobro de Venta"}
                            </Button>

                        </CardContent>
                    </Card>
                </div>
            </form>
        </div>
    );
}

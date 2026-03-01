"use client";

import { useState, useEffect, useTransition } from "react";
import { Plus, CreditCard, Banknote, Landmark, CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { registrarPagoYMembresia } from "@/app/actions/payment-actions";

export default function GestorMembresiasYPagos() {
    const [pagos, setPagos] = useState<any[]>([]);
    const [socios, setSocios] = useState<any[]>([]);
    const [planes, setPlanes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [open, setOpen] = useState(false);
    const [planSeleccionado, setPlanSeleccionado] = useState<any>(null);

    const supabase = createClient();

    const fetchData = async () => {
        setIsLoading(true);
        // Obtener historial de pagos enriquecido con información del socio
        const { data: pagosData, error: pagosError } = await supabase
            .from("pagos")
            .select(`
                *,
                socios (nombre, apellidos)
            `)
            .order("fecha_pago", { ascending: false });

        if (pagosError) {
            console.error(pagosError);
            toast.error("Error al cargar historial de pagos.");
        } else {
            setPagos(pagosData || []);
        }

        // Cargar Socios para el formulario
        const { data: sociosData } = await supabase
            .from("socios")
            .select("id, nombre, apellidos, estado");
        setSocios(sociosData || []);

        // Cargar Planes para el formulario
        const { data: planesData } = await supabase
            .from("planes_suscripcion")
            .select("id, nombre, precio, duracion_dias")
            .eq("estado", "activo");
        setPlanes(planesData || []);

        setIsLoading(false);
    };

    useEffect(() => {
        fetchData();
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
                setOpen(false);
                setPlanSeleccionado(null);
                fetchData();
            }
        });
    };

    const formatoMoneda = new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Caja y Membresías</h1>
                    <p className="text-muted-foreground mt-1">Registra cobros y renueva los accesos de tus socios.</p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            <Plus className="mr-2 h-4 w-4" />
                            Cobrar Nueva Membresía
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Nueva Venta de Membresía</DialogTitle>
                            <DialogDescription>
                                Selecciona al socio y el plan. El sistema calculará el vencimiento automáticamente.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={onSubmit}>
                            <div className="grid gap-6 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="socio_id">Socio</Label>
                                    <Select name="socio_id" required disabled={isPending}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona un socio" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {socios.map(socio => (
                                                <SelectItem key={socio.id} value={socio.id}>
                                                    {socio.nombre} {socio.apellidos} {socio.estado !== 'activo' ? `(${socio.estado})` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="plan_id">Plan / Paquete</Label>
                                    <Select name="plan_id" required disabled={isPending} onValueChange={onPlanChange}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona un plan" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {planes.map(plan => (
                                                <SelectItem key={plan.id} value={plan.id}>
                                                    {plan.nombre} ({plan.duracion_dias} días)
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {planSeleccionado && (
                                    <div className="bg-muted p-4 rounded-md space-y-2 border">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Monto Total a Cobrar:</span>
                                            <span className="font-bold text-lg text-emerald-600">{formatoMoneda.format(planSeleccionado.precio)}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="metodo_pago">Método de Pago</Label>
                                    <Select name="metodo_pago" required defaultValue="efectivo" disabled={isPending}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="¿Cómo pagará?" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="efectivo">Efectivo</SelectItem>
                                            <SelectItem value="tarjeta">Tarjeta (TPV)</SelectItem>
                                            <SelectItem value="transferencia">Transferencia / SPEI</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={!planSeleccionado || isPending} className="w-full bg-emerald-600 hover:bg-emerald-700">
                                    {isPending ? "Procesando Cobro..." : "Confirmar Recepción de Pago"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Socio</TableHead>
                            <TableHead>Monto Recibido</TableHead>
                            <TableHead>Forma de Pago</TableHead>
                            <TableHead className="text-right">Ticket</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    Cargando matriz de caja...
                                </TableCell>
                            </TableRow>
                        ) : pagos.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground flex-col items-center">
                                    <Banknote className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                                    No hay ingresos registrados en el sistema.
                                </TableCell>
                            </TableRow>
                        ) : (
                            pagos.map((pago) => (
                                <TableRow key={pago.id}>
                                    <TableCell className="font-medium whitespace-nowrap">
                                        {new Date(pago.fecha_pago).toLocaleString('es-MX', {
                                            dateStyle: 'medium',
                                            timeStyle: 'short'
                                        })}
                                    </TableCell>
                                    <TableCell>
                                        {pago.socios?.nombre} {pago.socios?.apellidos}
                                    </TableCell>
                                    <TableCell className="font-bold text-emerald-600">
                                        {formatoMoneda.format(pago.monto)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 text-muted-foreground text-sm capitalize">
                                            {pago.metodo_pago === 'efectivo' && <Banknote className="h-4 w-4" />}
                                            {pago.metodo_pago === 'tarjeta' && <CreditCard className="h-4 w-4" />}
                                            {pago.metodo_pago === 'transferencia' && <Landmark className="h-4 w-4" />}
                                            {pago.metodo_pago}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant="outline" className="text-xs font-mono text-muted-foreground">
                                            #{pago.id.split('-')[0]}
                                        </Badge>
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

"use client";

import { useState, useEffect, useTransition } from "react";
import { Plus, Edit, Tag, Clock, CircleDollarSign } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { crearPlan, toggleEstadoPlan } from "@/app/actions/plan-actions";

export default function GestorPlanes() {
    const [planes, setPlanes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [open, setOpen] = useState(false);

    const supabase = createClient();

    const fetchPlanes = async () => {
        setIsLoading(true);
        // Supabase RLS automágicamente filtra por tenant_id del usuario logueado
        const { data, error } = await supabase
            .from("planes")
            .select("*")
            .order("precio", { ascending: true });

        if (error) {
            console.error(error);
            toast.error("No se pudieron cargar los planes.");
        } else {
            setPlanes(data || []);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchPlanes();
    }, []);

    const toggleEstado = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === "activo" ? "inactivo" : "activo";

        // Optimistic UI Update
        setPlanes(
            planes.map((plan) =>
                plan.id === id
                    ? { ...plan, estado: newStatus }
                    : plan
            )
        );

        const result = await toggleEstadoPlan(id, currentStatus);

        if (result?.error) {
            toast.error(result.error);
            fetchPlanes(); // revert
        } else if (result?.success) {
            toast.success(result.message);
        }
    };

    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        startTransition(async () => {
            const result = await crearPlan(null, formData);
            if (result?.error) {
                toast.error(result.error);
            } else if (result?.success) {
                toast.success(result.message);
                setOpen(false);
                fetchPlanes();
            }
        });
    };

    // Helper para formatear moneda
    const formatoMoneda = new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Planes de Suscripción</h1>
                    <p className="text-muted-foreground mt-1">Configura las mensualidades y pases que ofreces.</p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            + Nuevo Plan
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Crear Paquete / Plan</DialogTitle>
                            <DialogDescription>
                                Define un nuevo modelo de cobro para tus socios.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={onSubmit}>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="nombre" className="text-right">
                                        Nombre
                                    </Label>
                                    <Input id="nombre" name="nombre" placeholder="Ej. Mensualidad Full" className="col-span-3" required disabled={isPending} />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="descripcion" className="text-right">
                                        Detalles
                                    </Label>
                                    <Input id="descripcion" name="descripcion" placeholder="Opcional. Ej: Incluye Regaderas" className="col-span-3" disabled={isPending} />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="precio" className="text-right">
                                        Precio
                                    </Label>
                                    <Input id="precio" name="precio" type="number" step="0.01" min="0" placeholder="500.00" className="col-span-3" required disabled={isPending} />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="periodo" className="text-right">
                                        Periodo
                                    </Label>
                                    <div className="col-span-3">
                                        <Select name="periodo" disabled={isPending} required>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona el periodo" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="DIARIO">Diario</SelectItem>
                                                <SelectItem value="MENSUAL">Mensual</SelectItem>
                                                <SelectItem value="TRIMESTRAL">Trimestral</SelectItem>
                                                <SelectItem value="SEMESTRAL">Semestral</SelectItem>
                                                <SelectItem value="ANUAL">Anual</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? "Guardando..." : "Crear Plan"}
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
                            <TableHead>Paquete / Plan</TableHead>
                            <TableHead>Tarifa</TableHead>
                            <TableHead>Vigencia</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Disponibilidad</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    Cargando catálogo de planes...
                                </TableCell>
                            </TableRow>
                        ) : planes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground flex-col items-center">
                                    <Tag className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                                    No tienes planes de suscripción configurados.
                                </TableCell>
                            </TableRow>
                        ) : (
                            planes.map((plan) => (
                                <TableRow key={plan.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span>{plan.nombre}</span>
                                            {plan.descripcion && (
                                                <span className="text-xs text-muted-foreground truncate max-w-[200px]">{plan.descripcion}</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 font-semibold">
                                            <CircleDollarSign className="h-4 w-4 text-emerald-600" />
                                            {formatoMoneda.format(plan.precio)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                                            <Clock className="h-4 w-4" />
                                            {plan.periodo.charAt(0).toUpperCase() + plan.periodo.slice(1).toLowerCase()}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={plan.estado === "activo" ? "default" : "secondary"} className={plan.estado === "activo" ? "bg-primary text-primary-foreground" : ""}>
                                            {plan.estado === "activo" ? "Activo" : "Oculto"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end items-center gap-2">
                                            <Label htmlFor={`status-${plan.id}`} className="sr-only">Toggle Plan</Label>
                                            <Switch
                                                id={`status-${plan.id}`}
                                                checked={plan.estado === "activo"}
                                                onCheckedChange={() => toggleEstado(plan.id, plan.estado)}
                                                disabled={isPending}
                                            />
                                        </div>
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

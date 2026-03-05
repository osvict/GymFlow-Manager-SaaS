"use client";

import { useState, useEffect, useTransition } from "react";
import { Plus, Edit, User, Mail, Phone, Calendar } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { crearSocio } from "@/app/actions/socio-actions";

export default function GestorSocios() {
    const [socios, setSocios] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [open, setOpen] = useState(false);

    const supabase = createClient();

    const fetchSocios = async () => {
        setIsLoading(true);
        // Supabase RLS will automatically filter these for the user's tenant_id!
        const { data, error } = await supabase
            .from("socios")
            .select("*")
            .order("fecha_registro", { ascending: false });

        if (error) {
            console.error(error);
            toast.error("No se pudieron cargar los socios.");
        } else {
            setSocios(data || []);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchSocios();
    }, []);

    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        startTransition(async () => {
            const result = await crearSocio(null, formData);
            if (!result?.success || result?.error) {
                toast.error(result?.error || "Error al procesar la solicitud.");
            } else {
                toast.success(result?.message || "Socio creado exitosamente.");
                setOpen(false);
                fetchSocios();
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Directorio de Socios</h1>
                    <p className="text-muted-foreground mt-1">Administra los miembros de tu gimnasio aquí.</p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            + Registrar Socio
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Registrar Nuevo Socio</DialogTitle>
                            <DialogDescription>
                                Agrega un integrante a la familia de tu gimnasio.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={onSubmit}>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="cedula" className="text-right">
                                        Cédula
                                    </Label>
                                    <Input
                                        id="cedula"
                                        name="cedula"
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        placeholder="Solo números"
                                        className="col-span-3"
                                        required
                                        disabled={isPending}
                                        onChange={(e) => {
                                            e.target.value = e.target.value.replace(/\D/g, '');
                                        }}
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="nombre" className="text-right">
                                        Nombre(s)
                                    </Label>
                                    <Input id="nombre" name="nombre" placeholder="Juan" className="col-span-3" required disabled={isPending} />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="apellidos" className="text-right">
                                        Apellidos
                                    </Label>
                                    <Input id="apellidos" name="apellidos" placeholder="Pérez" className="col-span-3" required disabled={isPending} />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="correo" className="text-right">
                                        Email
                                    </Label>
                                    <Input id="correo" name="correo" type="email" placeholder="Opcional" className="col-span-3" disabled={isPending} />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="telefono" className="text-right">
                                        Teléfono
                                    </Label>
                                    <Input id="telefono" name="telefono" type="tel" placeholder="+52..." className="col-span-3" disabled={isPending} />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? "Registrando..." : "Guardar Socio"}
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
                            <TableHead>Cédula</TableHead>
                            <TableHead>Nombre Completo</TableHead>
                            <TableHead>Contacto</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Fecha Ingreso</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    Cargando socios...
                                </TableCell>
                            </TableRow>
                        ) : socios.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground flex-col items-center">
                                    <User className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                                    No hay socios registrados aún.
                                </TableCell>
                            </TableRow>
                        ) : (
                            socios.map((socio) => (
                                <TableRow key={socio.id}>
                                    <TableCell className="font-mono text-sm">
                                        {socio.cedula}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                                                {socio.nombre.charAt(0)}{socio.apellidos.charAt(0)}
                                            </div>
                                            {socio.nombre} {socio.apellidos}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                                            {socio.correo && (
                                                <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {socio.correo}</span>
                                            )}
                                            {socio.telefono && (
                                                <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {socio.telefono}</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={socio.estado === "activo" ? "default" : (socio.estado === "inactivo" ? "secondary" : "destructive")}
                                            className={socio.estado === "activo" ? "bg-green-600 hover:bg-green-700 text-white" : ""}>
                                            {socio.estado.toUpperCase().replace("_", " ")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className="flex items-center gap-1 text-muted-foreground">
                                            <Calendar className="h-3 w-3" />
                                            {new Date(socio.fecha_registro).toLocaleDateString()}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon">
                                            <Edit className="h-4 w-4 text-muted-foreground" />
                                            <span className="sr-only">Editar Socio</span>
                                        </Button>
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

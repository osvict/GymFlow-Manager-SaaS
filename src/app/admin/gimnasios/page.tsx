"use client";

import { useState, useEffect, useTransition } from "react";
import { Plus, Edit } from "lucide-react";

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
import { crearGimnasio, editarGimnasio, toggleEstadoGimnasio } from "@/app/actions/tenant-actions";

export default function GestorGimnasios() {
    const [tenants, setTenants] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [open, setOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editingGym, setEditingGym] = useState<any>(null);

    const supabase = createClient();

    const fetchTenants = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from("tenants")
            .select("*")
            .order("fecha_creacion", { ascending: false });

        if (error) {
            console.error(error);
            toast.error("No se pudieron cargar los gimnasios.");
        } else {
            setTenants(data || []);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchTenants();
    }, []);

    const toggleEstado = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === "activo" ? "inactivo" : "activo";

        // Optimistic UI Update
        setTenants(
            tenants.map((gym) =>
                gym.id === id
                    ? { ...gym, estado: newStatus }
                    : gym
            )
        );

        const result = await toggleEstadoGimnasio(id, currentStatus);

        if (result?.error) {
            toast.error(result.error);
            fetchTenants(); // revert
        } else if (result?.success) {
            toast.success(result.message);
        }
    };

    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        startTransition(async () => {
            const result = await crearGimnasio(null, formData);
            if (result?.error) {
                toast.error(result.error);
            } else if (result?.success) {
                toast.success(result.message);
                setOpen(false);
                fetchTenants();
            }
        });
    };

    const onEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        startTransition(async () => {
            const result = await editarGimnasio(editingGym.id, formData);
            if (result?.error) {
                toast.error(result.error);
            } else if (result?.success) {
                toast.success(result.message);
                setEditOpen(false);
                setEditingGym(null);
                fetchTenants();
            }
        });
    };

    return (
        <div className="space-y-6 container mx-auto py-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestión de Gimnasios (Super Admin)</h1>
                    <p className="text-muted-foreground mt-1">Control maestro de tenants de GymFlow Manager.</p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            + Nuevo Gimnasio
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Registrar Nuevo Gimnasio</DialogTitle>
                            <DialogDescription>
                                Añade un nuevo tenant al sistema GymFlow.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={onSubmit}>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="nombre" className="text-right">
                                        Nombre
                                    </Label>
                                    <Input id="nombre" name="nombre" placeholder="Gym Titan" className="col-span-3" required disabled={isPending} />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="slug" className="text-right">
                                        Slug
                                    </Label>
                                    <Input id="slug" name="slug" placeholder="gym-titan" className="col-span-3" required disabled={isPending} />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="correo" className="text-right">
                                        Email
                                    </Label>
                                    <Input id="correo" name="correo" type="email" placeholder="contacto@titan.com" className="col-span-3" disabled={isPending} />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="telefono" className="text-right">
                                        Teléfono
                                    </Label>
                                    <Input id="telefono" name="telefono" type="tel" placeholder="+52 55..." className="col-span-3" disabled={isPending} />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? "Guardando..." : "Guardar Registro"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={editOpen} onOpenChange={(val) => {
                    setEditOpen(val);
                    if (!val) setEditingGym(null);
                }}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Editar Gimnasio</DialogTitle>
                            <DialogDescription>
                                Modifica los datos del gimnasio seleccionado.
                            </DialogDescription>
                        </DialogHeader>
                        {editingGym && (
                            <form onSubmit={onEditSubmit}>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="edit-nombre" className="text-right">
                                            Nombre
                                        </Label>
                                        <Input id="edit-nombre" name="nombre" defaultValue={editingGym.nombre} className="col-span-3" required disabled={isPending} />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="edit-slug" className="text-right">
                                            Slug
                                        </Label>
                                        <Input id="edit-slug" name="slug" defaultValue={editingGym.slug} className="col-span-3" required disabled={isPending} />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="edit-correo" className="text-right">
                                            Email
                                        </Label>
                                        <Input id="edit-correo" name="correo" type="email" defaultValue={editingGym.correo_contacto} className="col-span-3" disabled={isPending} />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="edit-telefono" className="text-right">
                                            Teléfono
                                        </Label>
                                        <Input id="edit-telefono" name="telefono" type="tel" defaultValue={editingGym.telefono} className="col-span-3" disabled={isPending} />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={isPending}>
                                        {isPending ? "Guardando..." : "Actualizar"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        )}
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Slug</TableHead>
                            <TableHead>Contacto</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Fecha de Registro</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    Cargando gimnasios...
                                </TableCell>
                            </TableRow>
                        ) : tenants.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    No hay gimnasios registrados.
                                </TableCell>
                            </TableRow>
                        ) : (
                            tenants.map((gym) => (
                                <TableRow key={gym.id}>
                                    <TableCell className="font-medium">{gym.nombre}</TableCell>
                                    <TableCell className="text-muted-foreground">{gym.slug}</TableCell>
                                    <TableCell>{gym.correo_contacto || gym.telefono || "N/A"}</TableCell>
                                    <TableCell>
                                        <Badge variant={gym.estado === "activo" ? "default" : "secondary"} className={gym.estado === "activo" ? "bg-green-600 hover:bg-green-700 text-white" : ""}>
                                            {gym.estado === "activo" ? "Activo" : "Inactivo"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{new Date(gym.fecha_creacion).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end items-center gap-2">
                                            <Button variant="outline" size="icon" onClick={() => {
                                                setEditingGym(gym);
                                                setEditOpen(true);
                                            }}>
                                                <Edit className="h-4 w-4" />
                                                <span className="sr-only">Editar</span>
                                            </Button>
                                            <div className="flex items-center gap-2 ml-2">
                                                <Label htmlFor={`status-${gym.id}`} className="sr-only">Toggle Status</Label>
                                                <Switch
                                                    id={`status-${gym.id}`}
                                                    checked={gym.estado === "activo"}
                                                    onCheckedChange={() => toggleEstado(gym.id, gym.estado)}
                                                />
                                            </div>
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

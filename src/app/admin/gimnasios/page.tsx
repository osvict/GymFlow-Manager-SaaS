"use client";

import { useState } from "react";
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

// Mock Data
const INITIAL_TENANTS = [
    {
        id: "1",
        nombre: "GymZona Centro",
        slug: "gymzona-centro",
        correoContacto: "admin@gymzona.com",
        estado: "activo",
        fechaCreacion: "2026-01-15",
    },
    {
        id: "2",
        nombre: "Fitness Sur",
        slug: "fitness-sur",
        correoContacto: "contacto@fitnesssur.com",
        estado: "activo",
        fechaCreacion: "2026-02-10",
    },
    {
        id: "3",
        nombre: "Iron Palace",
        slug: "iron-palace",
        correoContacto: "hello@ironpalace.mx",
        estado: "inactivo",
        fechaCreacion: "2025-11-05",
    },
];

export default function GestorGimnasios() {
    const [tenants, setTenants] = useState(INITIAL_TENANTS);

    const toggleEstado = (id: string, currentStatus: string) => {
        // Optimistic UI Update
        setTenants(
            tenants.map((gym) =>
                gym.id === id
                    ? { ...gym, estado: currentStatus === "activo" ? "inactivo" : "activo" }
                    : gym
            )
        );
    };

    return (
        <div className="space-y-6 container mx-auto py-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestión de Gimnasios (Super Admin)</h1>
                    <p className="text-muted-foreground mt-1">Control maestro de tenants de GymFlow Manager.</p>
                </div>
                <Dialog>
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
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="nombre" className="text-right">
                                    Nombre
                                </Label>
                                <Input id="nombre" placeholder="Gym Titan" className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="slug" className="text-right">
                                    Slug
                                </Label>
                                <Input id="slug" placeholder="gym-titan" className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="correo" className="text-right">
                                    Email
                                </Label>
                                <Input id="correo" type="email" placeholder="contacto@titan.com" className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="telefono" className="text-right">
                                    Teléfono
                                </Label>
                                <Input id="telefono" type="tel" placeholder="+52 55..." className="col-span-3" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit">Guardar Registro</Button>
                        </DialogFooter>
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
                        {tenants.map((gym) => (
                            <TableRow key={gym.id}>
                                <TableCell className="font-medium">{gym.nombre}</TableCell>
                                <TableCell className="text-muted-foreground">{gym.slug}</TableCell>
                                <TableCell>{gym.correoContacto}</TableCell>
                                <TableCell>
                                    <Badge variant={gym.estado === "activo" ? "default" : "secondary"} className={gym.estado === "activo" ? "bg-green-600 hover:bg-green-700 text-white" : ""}>
                                        {gym.estado === "activo" ? "Activo" : "Inactivo"}
                                    </Badge>
                                </TableCell>
                                <TableCell>{gym.fechaCreacion}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end items-center gap-2">
                                        <Button variant="outline" size="icon">
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
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

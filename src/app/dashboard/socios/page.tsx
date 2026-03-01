import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SociosPage() {
    // Datos de prueba (Mock Data) para visualización UI
    const mockSocios = [
        {
            id: "1",
            nombre: "Juan",
            apellidos: "Pérez García",
            correo: "juan.perez@email.com",
            telefono: "+525512345678",
            estado: "activo",
            fechaAlta: "12 Oct 2023",
        },
        {
            id: "2",
            nombre: "María Fernanda",
            apellidos: "Gómez López",
            correo: "mfgomez@email.com",
            telefono: "+528198765432",
            estado: "con_adeudo",
            fechaAlta: "05 Nov 2023",
        },
        {
            id: "3",
            nombre: "Carlos",
            apellidos: "Ramírez Silva",
            correo: "carlos.rs@email.com",
            telefono: "+523311223344",
            estado: "inactivo",
            fechaAlta: "20 Ago 2022",
        },
        {
            id: "4",
            nombre: "Ana",
            apellidos: "Martínez",
            correo: "ana.martinez@email.com",
            telefono: "+525544332211",
            estado: "activo",
            fechaAlta: "01 Ene 2024",
        }
    ];

    // Helper para renderizar el badge correcto según el estado
    const renderEstadoBadge = (estado: string) => {
        switch (estado) {
            case "activo":
                return <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border-emerald-500/20">Activo</Badge>;
            case "con_adeudo":
                return <Badge variant="destructive" className="bg-rose-500/15 text-rose-600 hover:bg-rose-500/25 border-rose-500/20">Con Adeudo</Badge>;
            case "inactivo":
                return <Badge variant="secondary" className="bg-slate-500/15 text-slate-500 hover:bg-slate-500/25 border-slate-500/20">Inactivo</Badge>;
            default:
                return <Badge variant="outline">{estado}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            {/* Cabecera Principal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Gestión de Socios</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Administra las membresías, contactos y el estado de pagos de todos tus clientes.
                    </p>
                </div>
                <Button className="shrink-0">
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Socio
                </Button>
            </div>

            {/* Tabla de Socios */}
            <Card>
                <CardHeader>
                    <CardTitle>Directorio de Socios</CardTitle>
                    <CardDescription>
                        Lista de todos los usuarios registrados en tu gimnasio.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-border">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="w-[300px]">Socio</TableHead>
                                    <TableHead>Contacto</TableHead>
                                    <TableHead>Fecha de Alta</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {mockSocios.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                            No hay socios registrados
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    mockSocios.map((socio) => (
                                        <TableRow key={socio.id} className="hover:bg-muted/50 transition-colors">
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <span>{socio.nombre} {socio.apellidos}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col space-y-1">
                                                    <span className="text-sm text-muted-foreground">{socio.correo}</span>
                                                    <span className="text-xs text-muted-foreground/80 font-mono">{socio.telefono}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {socio.fechaAlta}
                                            </TableCell>
                                            <TableCell>
                                                {renderEstadoBadge(socio.estado)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                                                        <Pencil className="h-4 w-4" />
                                                        <span className="sr-only">Editar</span>
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                        <span className="sr-only">Eliminar</span>
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

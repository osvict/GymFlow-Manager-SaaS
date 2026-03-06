"use client";

import { useState, useEffect, useTransition } from "react";
import { Settings, Save, MapPin, Phone, Building2, Globe } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getTenantConfig, updateTenantConfig } from "@/app/actions/tenant-actions";

export default function ConfiguracionPage() {
    const [config, setConfig] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [zonaSeleccionada, setZonaSeleccionada] = useState("America/Mexico_City");

    const fetchConfig = async () => {
        setIsLoading(true);
        const result = await getTenantConfig();
        if (result?.data) {
            setConfig(result.data);
            if (result.data.zona_horaria) {
                setZonaSeleccionada(result.data.zona_horaria);
            }
        } else {
            toast.error("Error al cargar configuración");
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
            const result = await updateTenantConfig(formData);
            if (result?.error) {
                toast.error(result.error);
            } else if (result?.success) {
                toast.success(result.message);
                fetchConfig();
            }
        });
    };

    if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Cargando configuración...</div>;

    const timezones = [
        "America/Mexico_City",
        "America/Bogota",
        "America/Argentina/Buenos_Aires",
        "America/New_York",
        "Europe/Madrid",
        "UTC"
    ];

    return (
        <div className="space-y-6 max-w-4xl mx-auto h-full p-4">
            <div className="flex flex-col md:flex-row shadow-sm bg-card border rounded-2xl p-6 items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-3">
                        <Settings className="w-8 h-8 text-primary" /> Configuración de la Sucursal
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm font-medium">
                        Administra los detalles operativos y zona horaria de tu gimnasio.
                    </p>
                </div>
            </div>

            <Card className="border shadow-sm rounded-xl overflow-hidden">
                <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b pb-6">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-slate-500" /> Perfil del Negocio
                    </CardTitle>
                    <CardDescription>
                        Esta información dictará cómo se visualiza tu gimnasio en el sistema principal.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={onSubmit}>
                    <CardContent className="space-y-6 pt-6 px-6">
                        <div className="space-y-2">
                            <Label className="text-base font-semibold flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-muted-foreground" /> Nombre del Gimnasio
                            </Label>
                            <Input
                                type="text"
                                name="nombre"
                                required
                                defaultValue={config?.nombre || ""}
                                className="h-12 border-slate-200 focus-visible:ring-primary"
                                disabled={isPending}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-base font-semibold flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-muted-foreground" /> Teléfono de Contacto
                                </Label>
                                <Input
                                    type="text"
                                    name="telefono"
                                    defaultValue={config?.telefono || ""}
                                    className="h-12 border-slate-200"
                                    disabled={isPending}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-base font-semibold flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-muted-foreground" /> Zona Horaria Central
                                </Label>

                                {/* Blindaje del Select para enviar el valor en FormData */}
                                <input type="hidden" name="zona_horaria" value={zonaSeleccionada} />

                                <Select required disabled={isPending} value={zonaSeleccionada} onValueChange={setZonaSeleccionada}>
                                    <SelectTrigger className="w-full h-12 border-slate-200 bg-white dark:bg-slate-950">
                                        <SelectValue placeholder="Selecciona zona horaria" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {timezones.map(tz => (
                                            <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                                        ))}
                                        <SelectItem value="America/Caracas">Venezuela (Hora de Venezuela, UTC-4)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground px-1">
                                    Dicta cómo se registra la creación de sesiones y vencimientos.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-base font-semibold flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-muted-foreground" /> Dirección Física
                            </Label>
                            <Input
                                type="text"
                                name="direccion"
                                defaultValue={config?.direccion || ""}
                                className="h-12 border-slate-200 focus-visible:ring-primary"
                                placeholder="Ej: Av. Principal 123, Colonia Centro..."
                                disabled={isPending}
                            />
                        </div>

                        <div className="pt-4 flex justify-end flex-col sm:flex-row gap-4 border-t pt-6 mt-6 border-slate-100 dark:border-slate-800">
                            <Button type="submit" disabled={isPending} className="h-12 px-8 text-base font-bold transition-all shadow-md">
                                {isPending ? "Aplicando..." : (
                                    <>
                                        <Save className="w-5 h-5 mr-2" /> Guardar Perfil
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </form>
            </Card>
        </div>
    );
}

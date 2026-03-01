"use client";

import { Bell, Search, Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import Link from "next/link";
import { Dumbbell, Home, Shield, Users, CreditCard, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function Header({ isSuperAdmin = false }: { isSuperAdmin?: boolean }) {
    const router = useRouter();
    const navItems = [
        { name: "Panel Principal", href: "/dashboard", icon: Home },
        { name: "Control de Accesos", href: "/dashboard/access", icon: Shield },
        { name: "Socios", href: "/dashboard/socios", icon: Users },
        { name: "Membresías y Pagos", href: "/dashboard/payments", icon: CreditCard },
        { name: "Configuración", href: "/dashboard/configuracion", icon: Settings },
    ];

    if (isSuperAdmin) {
        navItems.push({ name: "Gestión de Gimnasios", href: "/admin/gimnasios", icon: Dumbbell });
    }

    const handleSignOut = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.refresh();
        router.push("/login");
    };

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6 shadow-sm">
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="md:hidden shrink-0">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Abrir menú de navegación</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0 bg-sidebar border-r-0">
                    <SheetTitle className="sr-only">Menú de Navegación</SheetTitle>
                    <div className="flex h-16 items-center px-6 border-b border-sidebar-border">
                        <Dumbbell className="h-6 w-6 text-primary mr-3" />
                        <span className="text-lg font-bold tracking-tight text-sidebar-foreground">GymFlow</span>
                    </div>
                    <nav className="flex-1 space-y-2 p-4 text-sidebar-foreground">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                                >
                                    <Icon className="h-4 w-4" />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                </SheetContent>
            </Sheet>

            <div className="flex flex-1 items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
                <form className="ml-auto flex-1 sm:flex-initial">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Buscar socios o transacciones..."
                            className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px] bg-muted/50 border-none focus-visible:ring-1"
                        />
                    </div>
                </form>
                <Button variant="ghost" size="icon" className="relative group">
                    <Bell className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background"></span>
                    <span className="sr-only">Notificaciones</span>
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="rounded-full">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src="" alt="Avatar de usuario" />
                                <AvatarFallback className="bg-primary/20 text-primary">AD</AvatarFallback>
                            </Avatar>
                            <span className="sr-only">Menú de usuario</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Mi Perfil</DropdownMenuItem>
                        <DropdownMenuItem>Soporte Técnico</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:bg-destructive/10" onClick={handleSignOut}>
                            Cerrar Sesión
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}

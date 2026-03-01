import Link from "next/link";
import { Dumbbell, Home, Shield, Users, CreditCard, Settings } from "lucide-react";

export function Sidebar() {
    const navItems = [
        { name: "Panel Principal", href: "/dashboard", icon: Home },
        { name: "Control de Accesos", href: "/dashboard/access", icon: Shield },
        { name: "Socios", href: "/dashboard/members", icon: Users },
        { name: "Membresías y Pagos", href: "/dashboard/payments", icon: CreditCard },
        { name: "Configuración", href: "/dashboard/settings", icon: Settings },
    ];

    return (
        <aside className="hidden w-64 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
            <div className="flex h-16 items-center px-6 border-b border-sidebar-border">
                <Dumbbell className="h-6 w-6 text-primary mr-3" />
                <span className="text-lg font-bold tracking-tight">GymFlow</span>
            </div>
            <nav className="flex-1 space-y-2 p-4">
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
            <div className="p-4 border-t border-sidebar-border text-xs text-muted-foreground text-center">
                &copy; 2026 GymFlow Manager
            </div>
        </aside>
    );
}

import { Activity, Dumbbell, Users, CreditCard, Menu, Settings, LogOut } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/actions";

export default function GymAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-background text-foreground">
            {/* Sidebar */}
            <aside className="hidden w-64 flex-col border-r border-border bg-card md:flex">
                <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                    <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                        <Dumbbell className="h-6 w-6 text-primary" />
                        <span className="">GymFlow Manager</span>
                    </Link>
                </div>
                <div className="flex-1 overflow-auto py-2">
                    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
                        >
                            <Activity className="h-4 w-4" />
                            Resumen
                        </Link>
                        <Link
                            href="/dashboard/socios"
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-primary bg-muted transition-all hover:text-primary hover:bg-muted/80"
                        >
                            <Users className="h-4 w-4" />
                            Socios
                        </Link>
                        <Link
                            href="/dashboard/billing"
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
                        >
                            <CreditCard className="h-4 w-4" />
                            Pagos
                        </Link>
                    </nav>
                </div>
                <div className="mt-auto p-4 border-t">
                    <form action={signOut}>
                        <Button type="submit" variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive">
                            <LogOut className="mr-2 h-4 w-4" />
                            Cerrar Sesión
                        </Button>
                    </form>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex flex-1 flex-col">
                <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6 md:hidden">
                    <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle navigation menu</span>
                    </Button>
                    <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
                        <div className="font-semibold">GymFlow Manager</div>
                    </div>
                </header>
                <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}

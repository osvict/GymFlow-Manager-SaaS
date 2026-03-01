import { Link2, Activity, Shield, Users, LogOut } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-background text-foreground">
            {/* Super Admin Sidebar */}
            <aside className="hidden w-64 flex-col border-r border-border bg-card md:flex">
                <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                    <Link href="/admin" className="flex items-center gap-2 font-bold text-lg">
                        <Shield className="h-6 w-6 text-primary" />
                        <span className="">GF: Global Admin</span>
                    </Link>
                </div>
                <div className="flex-1 overflow-auto py-2">
                    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                        <Link
                            href="/admin"
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
                        >
                            <Activity className="h-4 w-4" />
                            Pulse (Overview)
                        </Link>
                        <Link
                            href="/admin/tenants"
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
                        >
                            <Users className="h-4 w-4" />
                            Tenants & Gymchains
                        </Link>
                        <Link
                            href="/admin/devices"
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
                        >
                            <Link2 className="h-4 w-4" />
                            IoT Devices Telemetry
                        </Link>
                    </nav>
                </div>
                <div className="mt-auto p-4 border-t">
                    <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive">
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex flex-1 flex-col">
                <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6 md:hidden">
                    <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
                        <Shield className="h-5 w-5 text-primary" />
                        <div className="font-semibold">GF: Global Admin</div>
                    </div>
                </header>
                <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-8 bg-muted/10">
                    {children}
                </main>
            </div>
        </div>
    );
}

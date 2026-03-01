import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    let isSuperAdmin = false;
    if (session) {
        const { data: profile } = await supabase
            .from("perfiles")
            .select("rol")
            .eq("id", session.user.id)
            .single();
        isSuperAdmin = profile?.rol === "super_admin";
    }

    return (
        <div className="flex min-h-screen w-full bg-background md:flex-row flex-col">
            <Sidebar isSuperAdmin={isSuperAdmin} />
            <div className="flex flex-1 flex-col min-w-0 bg-muted/20">
                <Header isSuperAdmin={isSuperAdmin} />
                <main className="flex-1 overflow-y-auto p-4 sm:px-6 md:p-8">
                    <div className="mx-auto w-full max-w-7xl">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}

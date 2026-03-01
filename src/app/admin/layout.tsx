import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Verificar el rol del usuario en la tabla perfiles
    const { data: profile, error } = await supabase
        .from("perfiles")
        .select("rol")
        .eq("id", user.id)
        .single();

    const isSuperAdmin = profile?.rol === "super_admin";

    // Redirigir si no es super admin
    if (!isSuperAdmin) {
        return (
            <div className="p-10 bg-red-900 text-white min-h-screen">
                <h1 className="text-2xl font-bold mb-4">ACCESO DENEGADO (DEBUG MODE)</h1>
                <p><strong>ID de Usuario:</strong> {user.id}</p>
                <p><strong>Perfil Encontrado:</strong> {JSON.stringify(profile)}</p>
                <p><strong>Error de Supabase:</strong> {JSON.stringify(error)}</p>
            </div>
        );
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

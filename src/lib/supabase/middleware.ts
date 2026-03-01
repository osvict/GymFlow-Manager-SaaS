import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ROLE_PERMISSIONS, Role } from "@/lib/utils/rbac";

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    // --- OPCIÓN NUCLEAR: INYECTAR LAS CREDENCIALES DIRECTAMENTE ---
    // TPM (Usuario): Pega aquí mismo entre comillas tu URL de Supabase y tu Llave ANON
    const supabaseUrl = "https://gnmutnrlarudaugrcmwu.supabase.co";
    const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdubXV0bnJsYXJ1ZGF1Z3JjbXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5ODIzMTMsImV4cCI6MjA4NzU1ODMxM30.t_VXLy5_0535kLDfpBU4HDKp4NLN-EukuYPBtRAfkrQ";

    const supabase = createServerClient(
        supabaseUrl,
        supabaseKey,

        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const isApiRoute = request.nextUrl.pathname.startsWith('/api');
    const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');

    // Protect admin and API routes (except webhooks and public routes)
    if (!user && (isAdminRoute || (isApiRoute && !request.nextUrl.pathname.startsWith('/api/webhooks')))) {
        if (isApiRoute) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    // Basic RBAC Validation for Edge Middleware
    if (user && isAdminRoute) {
        const role: Role = user.app_metadata?.role || "MEMBER";

        if (role !== "SUPER_ADMIN" && role !== "TENANT_ADMIN") {
            const url = request.nextUrl.clone();
            url.pathname = "/dashboard"; // Redirect non-admins to their dashboard
            return NextResponse.redirect(url);
        }
    }

    return supabaseResponse;
}

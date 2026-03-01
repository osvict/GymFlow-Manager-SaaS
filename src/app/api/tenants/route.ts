import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasPermission, Role } from "@/lib/utils/rbac";

export async function GET(request: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role: Role = user.app_metadata?.role || "MEMBER";

    // RBAC validation: Only Super Admin can view all tenants (or Tenant Admin their own via RLS)
    if (!hasPermission(role, "manage:tenants") && role !== "TENANT_ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch tenants - Postgres RLS will automatically filter for TENANT_ADMIN
    const { data: tenants, error } = await supabase.from("tenants").select("*");

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(tenants);
}

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role: Role = user.app_metadata?.role || "MEMBER";

    // Only SUPER_ADMIN can create a new tenant (a new Gym Chain)
    if (!hasPermission(role, "manage:tenants")) {
        return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { name, slug } = body;

        if (!name || !slug) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const { data: tenant, error } = await supabase
            .from("tenants")
            .insert({ name, slug })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(tenant, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

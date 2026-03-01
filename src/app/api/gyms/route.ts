import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasPermission, Role } from "@/lib/utils/rbac";

export async function GET(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch gyms - Postgres RLS inherently filters based on tenant_id
    const { data: gyms, error } = await supabase.from("gyms").select("*");

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(gyms);
}

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role: Role = user.app_metadata?.role || "MEMBER";

    if (!hasPermission(role, "manage:gyms")) {
        return NextResponse.json({ error: "Forbidden: Not enough permissions to manage gyms" }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { name, timezone } = body;

        // We get the tenant_id either from app_metadata or body (if Super Admin)
        const tenantId = role === 'SUPER_ADMIN' ? body.tenant_id : user.app_metadata?.tenant_id;

        if (!name || !tenantId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const { data: gym, error } = await supabase
            .from("gyms")
            .insert({ tenant_id: tenantId, name, timezone: timezone || 'UTC' })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(gym, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasPermission, Role } from "@/lib/utils/rbac";

export async function GET(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role: Role = user.app_metadata?.role || "MEMBER";

    // Only users with "view:users" permission can query the users table
    // (e.g. GYM_STAFF, TENANT_ADMIN, SUPER_ADMIN)
    if (!hasPermission(role, "view:users")) {
        return NextResponse.json({ error: "Forbidden: Not enough permissions to view users" }, { status: 403 });
    }

    // Postgres RLS automatically filters: 
    // - TENANT_ADMIN sees users in their tenant
    // - GYM_STAFF sees users in their tenant
    // - SUPER_ADMIN sees all users
    const { data: users, error } = await supabase.from("users").select("*");

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(users);
}

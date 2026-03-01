export type Role = "SUPER_ADMIN" | "TENANT_ADMIN" | "GYM_STAFF" | "MEMBER";

export type Permission =
    | "manage:tenants"
    | "manage:billing"
    | "manage:gyms"
    | "manage:staff"
    | "manage:users"
    | "manage:devices"
    | "view:tenant_billing"
    | "view:users"
    | "view:logs"
    | "view:own_logs"
    | "view:profile";

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
    SUPER_ADMIN: [
        "manage:tenants",
        "manage:billing",
        "manage:gyms",
        "manage:staff",
        "manage:users",
        "manage:devices",
        "view:tenant_billing",
        "view:users",
        "view:logs",
    ],
    TENANT_ADMIN: [
        "manage:gyms",
        "manage:staff",
        "manage:users",
        "manage:devices",
        "view:tenant_billing",
        "view:users",
        "view:logs",
    ],
    GYM_STAFF: [
        "manage:users",
        "view:users",
        "view:logs",
    ],
    MEMBER: [
        "view:profile",
        "view:own_logs"
    ]
};

export function hasPermission(role: Role, permission: Permission): boolean {
    if (role === "SUPER_ADMIN") return true;
    return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

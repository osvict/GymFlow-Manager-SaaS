-- ==========================================
-- Migration: 0006_strict_rls_policies.sql
-- Description: Implement strict RLS isolation using perfiles table.
-- ==========================================

-- 1. Tenants Table Policies (Aislamiento Total de Tenants)
DROP POLICY IF EXISTS "Allow authenticated users to read tenants" ON public.tenants;
DROP POLICY IF EXISTS "Allow authenticated users to insert tenants" ON public.tenants;
DROP POLICY IF EXISTS "Allow authenticated users to update tenants" ON public.tenants;
DROP POLICY IF EXISTS "Allow authenticated users to delete tenants" ON public.tenants;

-- REGLA SUPER ADMIN: Acceso total (ALL) a la tabla tenants
CREATE POLICY "Super admins can do everything on tenants"
    ON public.tenants FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'super_admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'super_admin'
        )
    );

-- REGLA TENANT (admin_gym, staff): Solo pueden ver su propio tenant (SELECT ONLY)
CREATE POLICY "Tenant users can read own tenant"
    ON public.tenants FOR SELECT
    TO authenticated
    USING (
        id = (SELECT tenant_id FROM public.perfiles WHERE id = auth.uid())
    );

-- 2. Socios Table Policies (Aislamiento Total de Socios)
DROP POLICY IF EXISTS "Seasons/Gym Admins can view own socios" ON public.socios;
DROP POLICY IF EXISTS "Gym Admins can insert socios into own tenant" ON public.socios;
DROP POLICY IF EXISTS "Gym Admins can update own socios" ON public.socios;
DROP POLICY IF EXISTS "Gym Admins can delete own socios" ON public.socios;

-- REGLA SUPER ADMIN: Acceso total a todos los socios
CREATE POLICY "Super admins can do everything on socios"
    ON public.socios FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'super_admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'super_admin'
        )
    );

-- REGLA TENANT: CRUD completo SOLO para socios de su propio tenant
CREATE POLICY "Tenant users can read own socios"
    ON public.socios FOR SELECT
    TO authenticated
    USING (
        tenant_id = (SELECT tenant_id FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin_gym', 'staff'))
    );

CREATE POLICY "Tenant users can insert own socios"
    ON public.socios FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id = (SELECT tenant_id FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin_gym', 'staff'))
    );

CREATE POLICY "Tenant users can update own socios"
    ON public.socios FOR UPDATE
    TO authenticated
    USING (
        tenant_id = (SELECT tenant_id FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin_gym', 'staff'))
    )
    WITH CHECK (
        tenant_id = (SELECT tenant_id FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin_gym', 'staff'))
    );

CREATE POLICY "Tenant users can delete own socios"
    ON public.socios FOR DELETE
    TO authenticated
    USING (
        tenant_id = (SELECT tenant_id FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin_gym', 'staff'))
    );

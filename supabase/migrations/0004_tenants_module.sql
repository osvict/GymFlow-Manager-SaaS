-- ==========================================
-- Migration: 0004_tenants_module.sql
-- Description: Creates the tenants table for the GymFlow Manager SaaS platform.
-- ==========================================

-- 1. Create the `tenants` table
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    correo_contacto TEXT,
    telefono TEXT,
    estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Enable Row Level Security
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
-- NOTE: For development/super admin purposes, we allow full CRUD.
-- In a real production scenario, this should be restricted to users with a specific 'super_admin' role
-- or handled via a secure backend that bypasses RLS using a service role key.

CREATE POLICY "Allow authenticated users to read tenants"
    ON public.tenants FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to insert tenants"
    ON public.tenants FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update tenants"
    ON public.tenants FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to delete tenants"
    ON public.tenants FOR DELETE
    TO authenticated
    USING (true);

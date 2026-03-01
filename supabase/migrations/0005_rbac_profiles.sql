-- ==========================================
-- Migration: 0005_rbac_profiles.sql
-- Description: Creates the perfiles table for RBAC, linking auth.users with tenants.
-- ==========================================

-- 1. Create the `perfiles` table
CREATE TABLE IF NOT EXISTS public.perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    rol TEXT NOT NULL DEFAULT 'admin_gym' CHECK (rol IN ('super_admin', 'admin_gym', 'staff')),
    tenant_id UUID REFERENCES public.tenants(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Enable Row Level Security
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies for `perfiles`
CREATE POLICY "Users can read own profile"
    ON public.perfiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Super admins can read all profiles"
    ON public.perfiles FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'super_admin'
        )
    );

-- 4. Create Trigger to automatically insert a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfiles (id, rol)
  VALUES (new.id, 'admin_gym'); -- Default role, can be modified later by super_admin
  RETURN new;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

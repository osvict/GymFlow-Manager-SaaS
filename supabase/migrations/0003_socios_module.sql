-- Sprint 5: Módulo de Socios (Members)

-- 1. Create a custom ENUM type for the member status
CREATE TYPE socio_estado AS ENUM ('activo', 'inactivo', 'con_adeudo');

-- 2. Create the 'socios' table
CREATE TABLE IF NOT EXISTS socios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    correo TEXT UNIQUE,
    telefono TEXT, -- Recomendar validar E.164 en el frontend/backend (+521234567890)
    estado socio_estado DEFAULT 'activo'::socio_estado NOT NULL,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE socios ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies (Auth Required + Exact Tenant Match)
-- Super Admins can see/manage everything.
-- Gym Admins (TENANT_ADMIN) can only see/manage socios in their own tenant.

-- SELECT Policy
CREATE POLICY "Seasons/Gym Admins can view own socios" 
ON socios
FOR SELECT 
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'SUPER_ADMIN') OR
    (
        tenant_id IN (
            SELECT tenant_id FROM users 
            WHERE id = auth.uid() 
            AND auth.jwt() -> 'app_metadata' ->> 'role' = 'TENANT_ADMIN'
        )
    )
);

-- INSERT Policy
CREATE POLICY "Gym Admins can insert socios into own tenant" 
ON socios
FOR INSERT 
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'SUPER_ADMIN') OR
    (
        tenant_id IN (
            SELECT tenant_id FROM users 
            WHERE id = auth.uid() 
            AND auth.jwt() -> 'app_metadata' ->> 'role' = 'TENANT_ADMIN'
        )
    )
);

-- UPDATE Policy
CREATE POLICY "Gym Admins can update own socios" 
ON socios
FOR UPDATE 
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'SUPER_ADMIN') OR
    (
        tenant_id IN (
            SELECT tenant_id FROM users 
            WHERE id = auth.uid() 
            AND auth.jwt() -> 'app_metadata' ->> 'role' = 'TENANT_ADMIN'
        )
    )
)
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'SUPER_ADMIN') OR
    (
        tenant_id IN (
            SELECT tenant_id FROM users 
            WHERE id = auth.uid() 
            AND auth.jwt() -> 'app_metadata' ->> 'role' = 'TENANT_ADMIN'
        )
    )
);

-- DELETE Policy
CREATE POLICY "Gym Admins can delete own socios" 
ON socios
FOR DELETE 
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'SUPER_ADMIN') OR
    (
        tenant_id IN (
            SELECT tenant_id FROM users 
            WHERE id = auth.uid() 
            AND auth.jwt() -> 'app_metadata' ->> 'role' = 'TENANT_ADMIN'
        )
    )
);

-- Triggers for updated_at
CREATE EXTENSION IF NOT EXISTS moddatetime schema extensions;
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON socios
  FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);

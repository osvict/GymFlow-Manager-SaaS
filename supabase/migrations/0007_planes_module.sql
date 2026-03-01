-- Sprint 6: Módulo de Planes de Suscripción

-- 1. Create a custom ENUM type for the plan status
CREATE TYPE plan_estado AS ENUM ('activo', 'inactivo');

-- 2. Create the 'planes_suscripcion' table
CREATE TABLE IF NOT EXISTS planes_suscripcion (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    precio NUMERIC(10, 2) NOT NULL,
    duracion_dias INTEGER NOT NULL,
    estado plan_estado DEFAULT 'activo'::plan_estado NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE planes_suscripcion ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies (Auth Required + Exact Tenant Match)
-- Super Admins can see/manage everything.
-- Gym Admins (TENANT_ADMIN) & Staff can only see/manage planes in their own tenant.

-- SELECT Policy
CREATE POLICY "Admins y Staff pueden ver sus propios planes" 
ON planes_suscripcion
FOR SELECT 
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'SUPER_ADMIN') OR
    (
        tenant_id IN (
            SELECT tenant_id FROM users 
            WHERE id = auth.uid() 
            AND (auth.jwt() -> 'app_metadata' ->> 'role' = 'TENANT_ADMIN' OR auth.jwt() -> 'app_metadata' ->> 'role' = 'STAFF')
        )
    )
);

-- INSERT Policy (Only Admins, Staff might not have permission to create pricing plans by default but keeping simple for MVP)
CREATE POLICY "Admins pueden crear planes para su tenant" 
ON planes_suscripcion
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
CREATE POLICY "Admins pueden actualizar sus propios planes" 
ON planes_suscripcion
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
CREATE POLICY "Admins pueden eliminar planes de su tenant" 
ON planes_suscripcion
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
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON planes_suscripcion
  FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);

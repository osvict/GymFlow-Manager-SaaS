-- Sprint 7: Módulo de Membresías y Pagos

-- 1. Create ENUMS
CREATE TYPE membresia_estado AS ENUM ('activa', 'vencida', 'cancelada');
CREATE TYPE metodo_pago AS ENUM ('efectivo', 'tarjeta', 'transferencia');

-- 2. Create the 'membresias' table
CREATE TABLE IF NOT EXISTS membresias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    socio_id UUID NOT NULL REFERENCES socios(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES planes_suscripcion(id) ON DELETE RESTRICT,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado membresia_estado DEFAULT 'activa'::membresia_estado NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create the 'pagos' table
CREATE TABLE IF NOT EXISTS pagos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    socio_id UUID NOT NULL REFERENCES socios(id) ON DELETE CASCADE,
    membresia_id UUID REFERENCES membresias(id) ON DELETE SET NULL,
    monto NUMERIC(10, 2) NOT NULL,
    metodo_pago metodo_pago NOT NULL,
    fecha_pago TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE membresias ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies (Auth Required + Exact Tenant Match)
-- Super Admins can see/manage everything.
-- Gym Admins (TENANT_ADMIN) & Staff can only see/manage data in their own tenant.

-- MEMBRESIAS POLICIES
CREATE POLICY "Admins y Staff pueden ver sus membresias" 
ON membresias FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'SUPER_ADMIN') OR
    (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid() AND (auth.jwt() -> 'app_metadata' ->> 'role' IN ('TENANT_ADMIN', 'STAFF'))))
);

CREATE POLICY "Admins y Staff pueden insertar membresias" 
ON membresias FOR INSERT WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'SUPER_ADMIN') OR
    (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid() AND (auth.jwt() -> 'app_metadata' ->> 'role' IN ('TENANT_ADMIN', 'STAFF'))))
);

CREATE POLICY "Admins y Staff pueden actualizar membresias" 
ON membresias FOR UPDATE USING (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'SUPER_ADMIN') OR
    (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid() AND (auth.jwt() -> 'app_metadata' ->> 'role' IN ('TENANT_ADMIN', 'STAFF'))))
) WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'SUPER_ADMIN') OR
    (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid() AND (auth.jwt() -> 'app_metadata' ->> 'role' IN ('TENANT_ADMIN', 'STAFF'))))
);

-- PAGOS POLICIES
CREATE POLICY "Admins y Staff pueden ver sus pagos" 
ON pagos FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'SUPER_ADMIN') OR
    (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid() AND (auth.jwt() -> 'app_metadata' ->> 'role' IN ('TENANT_ADMIN', 'STAFF'))))
);

CREATE POLICY "Admins y Staff pueden insertar pagos" 
ON pagos FOR INSERT WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'SUPER_ADMIN') OR
    (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid() AND (auth.jwt() -> 'app_metadata' ->> 'role' IN ('TENANT_ADMIN', 'STAFF'))))
);

-- Pagos should generally be immutable or only updatable by Admin
CREATE POLICY "Solo Admins pueden actualizar pagos" 
ON pagos FOR UPDATE USING (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'SUPER_ADMIN') OR
    (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid() AND auth.jwt() -> 'app_metadata' ->> 'role' = 'TENANT_ADMIN'))
) WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'SUPER_ADMIN') OR
    (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid() AND auth.jwt() -> 'app_metadata' ->> 'role' = 'TENANT_ADMIN'))
);

-- Triggers for updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON membresias
  FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);

-- Sprint 8: Módulo de Control de Accesos (Check-In)

-- 1. Create a custom ENUM type for access status
CREATE TYPE estado_acceso AS ENUM ('permitido', 'denegado');

-- 2. Create the 'asistencias' table
CREATE TABLE IF NOT EXISTS asistencias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    socio_id UUID REFERENCES socios(id) ON DELETE CASCADE, -- Could be null if someone tries to enter with a fake ID but we track the attempt
    fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    estado_acceso estado_acceso NOT NULL,
    motivo_denegacion TEXT, -- e.g. "Membresía Vencida", "Socio no encontrado", "Sin Membresía"
    metodo_entrada TEXT DEFAULT 'manual', -- e.g. 'manual', 'rfid', 'facial'
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE asistencias ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies (Auth Required + Exact Tenant Match)
-- Super Admins can see/manage everything.
-- Gym Admins (TENANT_ADMIN) & Staff can only see/manage asistencias in their own tenant.

-- SELECT Policy
CREATE POLICY "Admins y Staff pueden ver asistencias de su gimnasio" 
ON asistencias
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

-- INSERT Policy
CREATE POLICY "Staff y Admins pueden registrar asistencias" 
ON asistencias
FOR INSERT 
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'SUPER_ADMIN') OR
    (
        tenant_id IN (
            SELECT tenant_id FROM users 
            WHERE id = auth.uid() 
            AND (auth.jwt() -> 'app_metadata' ->> 'role' = 'TENANT_ADMIN' OR auth.jwt() -> 'app_metadata' ->> 'role' = 'STAFF')
        )
    )
);

-- UPDATE/DELETE is generally not allowed for audit logs, but we'll allow SUPER_ADMIN or TENANT_ADMIN just in case of errors.
CREATE POLICY "Admins pueden actualizar asistencias" 
ON asistencias FOR UPDATE USING (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'SUPER_ADMIN') OR
    (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid() AND auth.jwt() -> 'app_metadata' ->> 'role' = 'TENANT_ADMIN'))
) WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'SUPER_ADMIN') OR
    (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid() AND auth.jwt() -> 'app_metadata' ->> 'role' = 'TENANT_ADMIN'))
);

CREATE POLICY "Admins pueden borrar asistencias" 
ON asistencias FOR DELETE USING (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'SUPER_ADMIN') OR
    (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid() AND auth.jwt() -> 'app_metadata' ->> 'role' = 'TENANT_ADMIN'))
);

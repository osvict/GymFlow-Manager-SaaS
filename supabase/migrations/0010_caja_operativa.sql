-- Sprint 10: Control Operativo de Caja y Egresos

-- 1. Create a custom ENUM types for cash shift and movements
CREATE TYPE estado_caja AS ENUM ('abierta', 'cerrada');
CREATE TYPE tipo_movimiento_caja AS ENUM ('ingreso', 'egreso');
CREATE TYPE metodo_pago_caja AS ENUM ('efectivo', 'tarjeta', 'transferencia');

-- 2. Create the 'sesiones_caja' table
CREATE TABLE IF NOT EXISTS sesiones_caja (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    monto_inicial NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    estado estado_caja DEFAULT 'abierta'::estado_caja NOT NULL,
    fecha_apertura TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    fecha_cierre TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create the 'movimientos_caja' table
CREATE TABLE IF NOT EXISTS movimientos_caja (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sesion_caja_id UUID NOT NULL REFERENCES sesiones_caja(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tipo tipo_movimiento_caja NOT NULL,
    concepto TEXT NOT NULL,
    monto NUMERIC(10, 2) NOT NULL,
    metodo_pago metodo_pago_caja NOT NULL,
    referencia_externa_id UUID, -- Opcional: Para atarlo al ID de pago de membresia u otros.
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE sesiones_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_caja ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies (Auth Required + Exact Tenant Match)

-- SELECT Policy `sesiones_caja`
CREATE POLICY "Usuarios pueden ver sesiones de su tenant" 
ON sesiones_caja
FOR SELECT 
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'SUPER_ADMIN') OR
    (
        tenant_id IN (
            SELECT tenant_id FROM users WHERE id = auth.uid()
        )
    )
);

-- INSERT Policy `sesiones_caja` (Staff y Admins operan caja)
CREATE POLICY "Usuarios autorizados pueden abrir caja" 
ON sesiones_caja
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

-- UPDATE Policy `sesiones_caja` (Cierre de Caja)
CREATE POLICY "Usuarios autorizados pueden cerrar su caja" 
ON sesiones_caja
FOR UPDATE
USING (
    usuario_id = auth.uid() OR
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
    usuario_id = auth.uid() OR
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'SUPER_ADMIN') OR
    (
        tenant_id IN (
            SELECT tenant_id FROM users 
            WHERE id = auth.uid() 
            AND auth.jwt() -> 'app_metadata' ->> 'role' = 'TENANT_ADMIN'
        )
    )
);

-- SELECT Policy `movimientos_caja`
CREATE POLICY "Usuarios pueden ver movimientos de su tenant" 
ON movimientos_caja
FOR SELECT 
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'SUPER_ADMIN') OR
    (
        tenant_id IN (
            SELECT tenant_id FROM users WHERE id = auth.uid()
        )
    )
);

-- INSERT Policy `movimientos_caja` (Egresos y Ventas)
CREATE POLICY "Usuarios autorizados pueden apuntar movimientos" 
ON movimientos_caja
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

-- Triggers for updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON sesiones_caja
  FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);

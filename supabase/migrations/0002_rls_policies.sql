-- Función para obtener el tenant_id del JWT generado por Supabase Auth
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
    SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::UUID;
$$ LANGUAGE SQL STABLE;

-- Función para obtener el rol del JWT
CREATE OR REPLACE FUNCTION current_user_role() RETURNS VARCHAR AS $$
    SELECT auth.jwt() -> 'app_metadata' ->> 'role';
$$ LANGUAGE SQL STABLE;

-- Habilitar RLS en todas las tablas
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE iot_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE facial_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

-------------------------------------------------------------------------------
-- POLÍTICAS: TENANTS
-------------------------------------------------------------------------------
-- Super Admins pueden ver todos los tenants
CREATE POLICY "Super Admins can view all tenants" ON tenants
    FOR SELECT TO authenticated USING (current_user_role() = 'SUPER_ADMIN');

-- Tenant Admins solo ven su propio tenant
CREATE POLICY "Tenant Admins can view own tenant" ON tenants
    FOR SELECT TO authenticated USING (id = current_tenant_id() AND current_user_role() = 'TENANT_ADMIN');

-------------------------------------------------------------------------------
-- POLÍTICAS: GYMS
-------------------------------------------------------------------------------
CREATE POLICY "Super Admins access all gyms" ON gyms
    FOR ALL TO authenticated USING (current_user_role() = 'SUPER_ADMIN');

CREATE POLICY "Tenant users can view gyms in their tenant" ON gyms
    FOR SELECT TO authenticated USING (tenant_id = current_tenant_id());

-------------------------------------------------------------------------------
-- POLÍTICAS: USERS
-------------------------------------------------------------------------------
CREATE POLICY "Super Admins access all users" ON users
    FOR ALL TO authenticated USING (current_user_role() = 'SUPER_ADMIN');

CREATE POLICY "Tenant Admins manage users in their tenant" ON users
    FOR ALL TO authenticated USING (tenant_id = current_tenant_id() AND current_user_role() = 'TENANT_ADMIN');

CREATE POLICY "Gym Staff view users in their tenant" ON users
    FOR SELECT TO authenticated USING (tenant_id = current_tenant_id() AND current_user_role() = 'GYM_STAFF');

CREATE POLICY "Members view only their own profile" ON users
    FOR SELECT TO authenticated USING (id = auth.uid());

-- Permitir actualización de perfil propio
CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-------------------------------------------------------------------------------
-- POLÍTICAS: IOT_DEVICES
-------------------------------------------------------------------------------
CREATE POLICY "Super Admins manage all devices" ON iot_devices
    FOR ALL TO authenticated USING (current_user_role() = 'SUPER_ADMIN');

CREATE POLICY "Tenant Admins view devices in their tenant" ON iot_devices
    FOR SELECT TO authenticated USING (tenant_id = current_tenant_id() AND current_user_role() = 'TENANT_ADMIN');

-------------------------------------------------------------------------------
-- POLÍTICAS: FACIAL_EMBEDDINGS
-------------------------------------------------------------------------------
CREATE POLICY "Super Admins access all embeddings" ON facial_embeddings
    FOR ALL TO authenticated USING (current_user_role() = 'SUPER_ADMIN');

CREATE POLICY "Tenant Admins manage embeddings in their tenant" ON facial_embeddings
    FOR ALL TO authenticated USING (tenant_id = current_tenant_id() AND current_user_role() = 'TENANT_ADMIN');

CREATE POLICY "Members can view their own embeddings" ON facial_embeddings
    FOR SELECT TO authenticated USING (user_id = auth.uid());

-------------------------------------------------------------------------------
-- POLÍTICAS: ACCESS_LOGS
-------------------------------------------------------------------------------
CREATE POLICY "Super Admins access all logs" ON access_logs
    FOR ALL TO authenticated USING (current_user_role() = 'SUPER_ADMIN');

CREATE POLICY "Tenant Admins view logs in their tenant" ON access_logs
    FOR SELECT TO authenticated USING (tenant_id = current_tenant_id() AND current_user_role() = 'TENANT_ADMIN');

CREATE POLICY "Gym Staff view logs in their own gym" ON access_logs
    -- Nota: Asumimos que los GYM_STAFF tienen default_gym_id configurado para ver logs de su gym
    FOR SELECT TO authenticated USING (
        tenant_id = current_tenant_id() 
        AND current_user_role() = 'GYM_STAFF'
        AND gym_id = (SELECT default_gym_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Members view their own logs" ON access_logs
    FOR SELECT TO authenticated USING (user_id = auth.uid());

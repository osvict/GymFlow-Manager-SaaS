-- Sprint 11: Anniversary Billing - Socios Membership Sync

-- 1. Añadir campos requeridos a tabla socios
ALTER TABLE socios
ADD COLUMN IF NOT EXISTS vencimiento_membresia DATE,
ADD COLUMN IF NOT EXISTS ultimo_pago TIMESTAMP WITH TIME ZONE;

-- (Opcional) Podemos iniciar el vencimiento_membresia con la fecha actual o NULL por defecto,
-- Para evitar errores de legacy, lo mantenenmos permitiendo valores nulos al principio.

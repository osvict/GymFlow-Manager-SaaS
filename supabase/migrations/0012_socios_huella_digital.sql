-- Sprint 12: Multimodal Biometrics - Fingerprint Support

-- 1. Añadir campo de template_huella a la tabla socios
ALTER TABLE socios
ADD COLUMN IF NOT EXISTS huella_digital TEXT;

-- Indexing para velocidad de cotejo en la puerta (Si se usaran busquedas exactas MD5/SHA)
CREATE INDEX IF NOT EXISTS idx_socios_huella ON socios(huella_digital) WHERE huella_digital IS NOT NULL;

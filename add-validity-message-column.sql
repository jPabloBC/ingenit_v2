-- Agregar columna validity_message a la tabla quotes
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS validity_message TEXT DEFAULT 'Cotización válida hasta "{fecha}" por disponibilidad de equipos y cambios en costos de procesos';

-- Crear comentario para documentar la columna
COMMENT ON COLUMN quotes.validity_message IS 'Mensaje personalizado de validez para el PDF';

-- Verificar que la columna se agregó correctamente
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'quotes' 
AND column_name = 'validity_message';

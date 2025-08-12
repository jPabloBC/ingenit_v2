-- Agregar columnas de descuento a la tabla quotes
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'none' CHECK (discount_type IN ('none', 'percentage', 'amount')),
ADD COLUMN IF NOT EXISTS discount_value DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_description TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS final_total DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS validity_message TEXT DEFAULT 'Cotización válida hasta "{fecha}" por disponibilidad de equipos y cambios en costos de procesos';

-- Crear comentarios para documentar las columnas
COMMENT ON COLUMN quotes.discount_type IS 'Tipo de descuento: none, percentage, amount';
COMMENT ON COLUMN quotes.discount_value IS 'Valor del descuento (porcentaje o monto fijo)';
COMMENT ON COLUMN quotes.discount_description IS 'Descripción del descuento aplicado';
COMMENT ON COLUMN quotes.final_total IS 'Total final después de aplicar descuentos';
COMMENT ON COLUMN quotes.validity_message IS 'Mensaje personalizado de validez para el PDF';

-- Verificar que las columnas se agregaron correctamente
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'quotes' 
AND column_name IN ('discount_type', 'discount_value', 'discount_description', 'final_total', 'validity_message')
ORDER BY column_name;

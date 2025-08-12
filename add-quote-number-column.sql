-- Script para agregar la columna quote_number a la tabla quotes
-- Ejecutar en Supabase SQL Editor

-- Verificar si la columna ya existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'quotes' 
        AND column_name = 'quote_number'
    ) THEN
        -- Agregar la columna quote_number
        ALTER TABLE quotes ADD COLUMN quote_number VARCHAR(50);
        
        -- Crear índice para búsquedas eficientes
        CREATE INDEX idx_quotes_quote_number ON quotes(quote_number);
        
        -- Crear índice para búsquedas globales del número de cotización
        CREATE INDEX idx_quotes_quote_number_global ON quotes(quote_number) WHERE quote_number IS NOT NULL;
        
        RAISE NOTICE 'Columna quote_number agregada exitosamente';
    ELSE
        RAISE NOTICE 'La columna quote_number ya existe';
    END IF;
END $$;

-- Verificar la estructura actual de la tabla
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'quotes' 
ORDER BY ordinal_position;

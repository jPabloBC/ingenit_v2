# Verificación y Actualización de Base de Datos - Companies

## 🔍 **PASO 1: Verificar estructura actual**

Ejecuta este script en **Supabase SQL Editor**:

```sql
-- Ver estructura de la tabla pr_companies
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'app_pr' 
  AND table_name = 'pr_companies'
ORDER BY ordinal_position;
```

## 📋 **Campos que DEBEN existir para el modal:**

### ✅ **Campos básicos** (probablemente ya existen):
- `id` (UUID, PRIMARY KEY)
- `name` (VARCHAR, NOT NULL)
- `description` (TEXT, nullable)
- `industry` (VARCHAR, NOT NULL)
- `website` (VARCHAR, nullable)
- `email` (VARCHAR, nullable)
- `phone` (VARCHAR, nullable)
- `address` (TEXT, nullable)
- `city` (VARCHAR, nullable)
- `country` (VARCHAR, nullable)
- `employee_count` (INTEGER, nullable)
- `status` (VARCHAR, NOT NULL, default 'prospect')
- `created_at` (TIMESTAMP, NOT NULL)
- `updated_at` (TIMESTAMP, nullable)

### 🆕 **Campos nuevos** (probablemente faltan):
- `region` (VARCHAR(100), nullable) - **NUEVO**
- `comuna` (VARCHAR(100), nullable) - **NUEVO**
- `logo_url` (TEXT, nullable) - **NUEVO para upload**

## 🔧 **PASO 2: Agregar campos faltantes**

Si faltan campos, ejecuta:

```sql
-- Agregar campos faltantes
ALTER TABLE app_pr.pr_companies ADD COLUMN IF NOT EXISTS region VARCHAR(100);
ALTER TABLE app_pr.pr_companies ADD COLUMN IF NOT EXISTS comuna VARCHAR(100);
ALTER TABLE app_pr.pr_companies ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Verificar que el campo country sea VARCHAR(10) para códigos de país
ALTER TABLE app_pr.pr_companies ALTER COLUMN country TYPE VARCHAR(10);
```

## 🪣 **PASO 3: Configurar Storage para logos**

Ejecuta en Supabase SQL Editor:

```sql
-- Crear bucket para logos de companies si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('companies', 'companies', true)
ON CONFLICT (id) DO NOTHING;

-- Configurar políticas de acceso
CREATE POLICY "Permitir lectura pública de logos" ON storage.objects
FOR SELECT USING (bucket_id = 'companies');

CREATE POLICY "Permitir subida autenticada" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'companies' AND auth.role() = 'authenticated');
```

## 🔄 **PASO 4: Actualizar vista espejo**

```sql
-- Recrear la vista para incluir nuevos campos
DROP VIEW IF EXISTS public.pr_companies;
CREATE VIEW public.pr_companies AS 
SELECT * FROM app_pr.pr_companies;
```

## ✅ **PASO 5: Verificación final**

```sql
-- Verificar estructura final
\d app_pr.pr_companies

-- Verificar que la vista funcione
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'pr_companies' AND table_schema = 'public';

-- Test básico
SELECT COUNT(*) FROM public.pr_companies;
```

## 📝 **Resultado esperado:**

La tabla debe tener **18 campos total**:
1. id
2. name  
3. description
4. industry
5. website
6. email
7. phone
8. address
9. city
10. **region** ← NUEVO
11. **comuna** ← NUEVO  
12. country
13. employee_count
14. status
15. created_at
16. updated_at
17. **logo_url** ← NUEVO
18. Cualquier otro campo existente

---

Una vez completados estos pasos, el modal funcionará completamente con todos los países de Sudamérica, sus regiones/departamentos, comunas/provincias y upload de logos.
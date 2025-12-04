# 🚨 SOLUCIÓN URGENTE - Configurar PR Companies

## 🎯 Problema Identificado
La vista `pr_companies` existe pero tiene una estructura incompleta. Faltan columnas esenciales como `industry`, `city`, etc.

## ✅ Solución - Ejecutar este SQL en Supabase Dashboard

### 📋 Ve a: supabase.com → Tu Proyecto → SQL Editor

```sql
-- SOLUCIÓN COMPLETA PARA PR COMPANIES
-- Ejecutar TODO este bloque de una vez

-- 1. Eliminar vista problemática
DROP VIEW IF EXISTS public.pr_companies CASCADE;

-- 2. Crear schema app_pr si no existe  
CREATE SCHEMA IF NOT EXISTS app_pr;

-- 3. Eliminar tabla existente para empezar limpio
DROP TABLE IF EXISTS app_pr.companies CASCADE;

-- 4. Crear tabla companies en app_pr con estructura completa
CREATE TABLE app_pr.companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  industry VARCHAR(100) NOT NULL,
  website VARCHAR(500),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Chile',
  employee_count INTEGER,
  status VARCHAR(20) DEFAULT 'prospect' CHECK (status IN ('active', 'inactive', 'prospect')),
  logo_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Crear índices para performance
CREATE INDEX idx_app_pr_companies_status ON app_pr.companies(status);
CREATE INDEX idx_app_pr_companies_industry ON app_pr.companies(industry);
CREATE INDEX idx_app_pr_companies_name ON app_pr.companies(name);

-- 6. Recrear vista pr_companies con TODAS las columnas
CREATE VIEW public.pr_companies AS 
SELECT 
  id,
  name,
  description,
  industry,
  website,
  email,
  phone,
  address,
  city,
  country,
  employee_count,
  status,
  logo_url,
  created_at,
  updated_at
FROM app_pr.companies;

-- 7. Configurar seguridad
ALTER TABLE app_pr.companies ENABLE ROW LEVEL SECURITY;

-- Políticas para la tabla real
CREATE POLICY "Allow anonymous read companies" ON app_pr.companies
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow authenticated full access companies" ON app_pr.companies
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 8. Otorgar permisos completos en la vista
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pr_companies TO authenticated;
GRANT SELECT ON public.pr_companies TO anon;

-- 9. Insertar datos de ejemplo
INSERT INTO app_pr.companies (name, description, industry, website, email, phone, address, city, country, employee_count, status) VALUES
('IngenIT Solutions', 'Empresa líder en desarrollo de software y soluciones tecnológicas innovadoras.', 'Tecnología', 'https://ingenit.cl', 'contacto@ingenit.cl', '+56912345678', 'Av. Providencia 123, Oficina 456', 'Santiago', 'Chile', 25, 'active'),
('TechCorp Chile', 'Consultoría especializada en transformación digital para empresas.', 'Consultoría', 'https://techcorp.cl', 'info@techcorp.cl', '+56987654321', 'Las Condes 789', 'Santiago', 'Chile', 50, 'active'),
('Innovación Médica S.A.', 'Desarrollo de software para el sector salud y equipos médicos.', 'Salud', 'https://innovamed.cl', 'contacto@innovamed.cl', '+56911223344', 'Vitacura 456', 'Santiago', 'Chile', 15, 'prospect'),
('EduTech Solutions', 'Plataformas educativas y e-learning para instituciones.', 'Educación', 'https://edutech.cl', 'info@edutech.cl', '+56955667788', 'Ñuñoa 123', 'Santiago', 'Chile', 8, 'prospect'),
('RetailPro S.A.', 'Sistemas de gestión para el sector retail y comercio.', 'Retail', 'https://retailpro.cl', 'ventas@retailpro.cl', '+56944556677', 'Mall Plaza Norte', 'Santiago', 'Chile', 35, 'inactive');

-- 10. Verificar que todo funciona
SELECT 'Tabla creada correctamente' as status, count(*) as total_companies FROM app_pr.companies;
SELECT 'Vista funcionando correctamente' as status, count(*) as total_companies FROM public.pr_companies;
```

## 🎯 Resultado Esperado

Después de ejecutar el SQL:
- ✅ Tabla real: `app_pr.companies` (con 5 empresas)
- ✅ Vista espejo: `public.pr_companies` (con todas las columnas)
- ✅ Datos de ejemplo listos para usar
- ✅ Permisos configurados correctamente

## 🚀 Verificación

1. **Recarga** la página `/admin/pr/companies`
2. **Deberías ver** 5 empresas de ejemplo
3. **Podrás crear, editar y eliminar** empresas
4. **Todos los filtros funcionarán**

## 📞 Si hay problemas

Si encuentras algún error al ejecutar el SQL, copia el mensaje de error completo y compártelo conmigo para ayudarte.
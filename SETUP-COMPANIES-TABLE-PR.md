# 🏢 Configuración de Tabla Companies - Estructura PR

## 📋 Estructura de Schemas
- **Schema `app_pr`:** Tablas reales donde se almacenan los datos
- **Schema `public`:** Vistas espejo de `app_pr` con prefijo `pr_`

## 🛠️ SQL para crear la estructura completa

### 1. Crear tabla real en schema app_pr
```sql
-- Crear schema app_pr si no existe
CREATE SCHEMA IF NOT EXISTS app_pr;

-- Crear tabla companies en app_pr (tabla real)
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

-- Crear índices en la tabla real
CREATE INDEX idx_app_pr_companies_status ON app_pr.companies(status);
CREATE INDEX idx_app_pr_companies_industry ON app_pr.companies(industry);
CREATE INDEX idx_app_pr_companies_name ON app_pr.companies(name);
CREATE INDEX idx_app_pr_companies_created_at ON app_pr.companies(created_at);
```

### 2. Crear vista espejo en public con prefijo pr_
```sql
-- Crear vista pr_companies en schema public
CREATE OR REPLACE VIEW public.pr_companies AS 
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

-- Comentario para documentar la vista
COMMENT ON VIEW public.pr_companies IS 'Vista espejo de app_pr.companies para acceso desde aplicación';
```

### 3. Configurar políticas de seguridad
```sql
-- Habilitar RLS en la tabla real
ALTER TABLE app_pr.companies ENABLE ROW LEVEL SECURITY;

-- Políticas para la tabla real
CREATE POLICY "Allow anonymous read access companies" ON app_pr.companies
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow authenticated full access companies" ON app_pr.companies
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Otorgar permisos en la vista
GRANT SELECT ON public.pr_companies TO anon;
GRANT SELECT ON public.pr_companies TO authenticated;
```

### 4. Insertar datos de ejemplo
```sql
-- Insertar datos de ejemplo en la tabla real
INSERT INTO app_pr.companies (name, description, industry, website, email, phone, address, city, country, employee_count, status) VALUES
('IngenIT Solutions', 'Empresa líder en desarrollo de software y soluciones tecnológicas innovadoras.', 'Tecnología', 'https://ingenit.cl', 'contacto@ingenit.cl', '+56912345678', 'Av. Providencia 123, Oficina 456', 'Santiago', 'Chile', 25, 'active'),
('TechCorp Chile', 'Consultoría especializada en transformación digital para empresas.', 'Consultoría', 'https://techcorp.cl', 'info@techcorp.cl', '+56987654321', 'Las Condes 789', 'Santiago', 'Chile', 50, 'active'),
('Innovación Médica S.A.', 'Desarrollo de software para el sector salud y equipos médicos.', 'Salud', 'https://innovamed.cl', 'contacto@innovamed.cl', '+56911223344', 'Vitacura 456', 'Santiago', 'Chile', 15, 'prospect'),
('EduTech Solutions', 'Plataformas educativas y e-learning para instituciones.', 'Educación', 'https://edutech.cl', 'info@edutech.cl', '+56955667788', 'Ñuñoa 123', 'Santiago', 'Chile', 8, 'prospect'),
('RetailPro S.A.', 'Sistemas de gestión para el sector retail y comercio.', 'Retail', 'https://retailpro.cl', 'ventas@retailpro.cl', '+56944556677', 'Mall Plaza Norte', 'Santiago', 'Chile', 35, 'inactive');
```

### 5. Verificar la estructura
```sql
-- Verificar que la tabla existe en app_pr
SELECT * FROM app_pr.companies LIMIT 1;

-- Verificar que la vista existe en public
SELECT * FROM public.pr_companies LIMIT 1;

-- Verificar estructura de la vista
\d public.pr_companies;
```

## 📋 Instrucciones de Ejecución

1. **Ve a Supabase Dashboard**
   - Proyecto: `juupotamdjqzpxuqdtco` 
   - SQL Editor

2. **Ejecuta los bloques SQL en orden:**
   - Bloque 1: Crear tabla en `app_pr`
   - Bloque 2: Crear vista en `public`  
   - Bloque 3: Configurar seguridad
   - Bloque 4: Insertar datos de ejemplo
   - Bloque 5: Verificar (opcional)

3. **Resultado esperado:**
   - Tabla real: `app_pr.companies`
   - Vista espejo: `public.pr_companies`
   - 5 empresas de ejemplo

## ✅ Verificación
Después de ejecutar el SQL, la aplicación debería:
- Conectarse a `public.pr_companies` (vista)
- Mostrar las 5 empresas de ejemplo
- Permitir CRUD completo
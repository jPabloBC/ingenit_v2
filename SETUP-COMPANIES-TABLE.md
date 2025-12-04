# 🏢 Configuración de Tabla Companies - Supabase

## 📋 Instrucciones para crear la tabla companies

### 1. Acceder a Supabase Dashboard
1. Ve a [supabase.com](https://supabase.com) e inicia sesión
2. Selecciona tu proyecto: **juupotamdjqzpxuqdtco**
3. Ve a **SQL Editor** en el menú lateral

### 2. Ejecutar SQL de Creación
Copia y pega el siguiente SQL en el editor y ejecuta:

```sql
-- Crear tabla companies
CREATE TABLE public.companies (
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

-- Crear índices para mejorar performance
CREATE INDEX idx_companies_status ON public.companies(status);
CREATE INDEX idx_companies_industry ON public.companies(industry);
CREATE INDEX idx_companies_name ON public.companies(name);
CREATE INDEX idx_companies_created_at ON public.companies(created_at);

-- Habilitar Row Level Security
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Política para permitir acceso anónimo de lectura
CREATE POLICY "Allow anonymous read access" ON public.companies
  FOR SELECT TO anon USING (true);

-- Política para permitir acceso autenticado completo
CREATE POLICY "Allow authenticated full access" ON public.companies
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insertar datos de ejemplo
INSERT INTO public.companies (name, description, industry, website, email, phone, address, city, country, employee_count, status) VALUES
('IngenIT Solutions', 'Empresa líder en desarrollo de software y soluciones tecnológicas innovadoras.', 'Tecnología', 'https://ingenit.cl', 'contacto@ingenit.cl', '+56912345678', 'Av. Providencia 123, Oficina 456', 'Santiago', 'Chile', 25, 'active'),
('TechCorp Chile', 'Consultoría especializada en transformación digital para empresas.', 'Consultoría', 'https://techcorp.cl', 'info@techcorp.cl', '+56987654321', 'Las Condes 789', 'Santiago', 'Chile', 50, 'active'),
('Innovación Médica S.A.', 'Desarrollo de software para el sector salud y equipos médicos.', 'Salud', 'https://innovamed.cl', 'contacto@innovamed.cl', '+56911223344', 'Vitacura 456', 'Santiago', 'Chile', 15, 'prospect'),
('EduTech Solutions', 'Plataformas educativas y e-learning para instituciones.', 'Educación', 'https://edutech.cl', 'info@edutech.cl', '+56955667788', 'Ñuñoa 123', 'Santiago', 'Chile', 8, 'prospect'),
('RetailPro S.A.', 'Sistemas de gestión para el sector retail y comercio.', 'Retail', 'https://retailpro.cl', 'ventas@retailpro.cl', '+56944556677', 'Mall Plaza Norte', 'Santiago', 'Chile', 35, 'inactive');
```

### 3. Verificar la Creación
Después de ejecutar el SQL:
1. Ve a **Table Editor** en el menú lateral
2. Deberías ver la tabla `companies` en la lista
3. La tabla debería tener 5 registros de ejemplo

### 4. Configuración de Permisos (Opcional)
Si tienes problemas de permisos, también puedes ejecutar:

```sql
-- Otorgar permisos adicionales si es necesario
GRANT ALL ON public.companies TO authenticated;
GRANT SELECT ON public.companies TO anon;
```

## ✅ Verificación
Una vez creada la tabla, regresa a tu aplicación y recarga la página `/admin/pr/companies` para ver los datos.

## 🚀 Estructura de la Tabla

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | ID único (auto-generado) |
| `name` | VARCHAR(255) | Nombre de la empresa (requerido) |
| `description` | TEXT | Descripción de la empresa |
| `industry` | VARCHAR(100) | Sector/industria (requerido) |
| `website` | VARCHAR(500) | Sitio web |
| `email` | VARCHAR(255) | Email de contacto |
| `phone` | VARCHAR(50) | Teléfono |
| `address` | TEXT | Dirección |
| `city` | VARCHAR(100) | Ciudad |
| `country` | VARCHAR(100) | País (default: 'Chile') |
| `employee_count` | INTEGER | Número de empleados |
| `status` | VARCHAR(20) | Estado: 'active', 'inactive', 'prospect' |
| `logo_url` | VARCHAR(500) | URL del logo |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Fecha de última actualización |

## 📞 ¿Problemas?
Si tienes algún problema ejecutando el SQL, avísame y te ayudo a resolverlo.
# Configuración de Tablas con Prefijo `rt_`

Este documento contiene las instrucciones para configurar todas las tablas de la base de datos con el prefijo `rt_`.

## 📋 Problema Resuelto

Se han actualizado todas las conexiones de la base de datos en el código para usar el prefijo `rt_` en los nombres de las tablas:

- `messages` → `rt_messages`
- `pricing_library` → `rt_pricing_library`
- `quotes` → `rt_quotes`
- `profiles` → `rt_profiles`
- `contacts` → `rt_contacts`
- `processes` → `rt_processes`
- `whatsapp_flows` → `rt_whatsapp_flows`
- `clients` → `rt_clients`
- `web_chat` → `rt_web_chat`

## 🚀 Pasos para Configurar la Base de Datos

### 1. Acceder a Supabase Dashboard

1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto `ingenit_v2`
3. Ve a la sección **SQL Editor**

### 2. Ejecutar el Script Principal

Copia y pega el contenido del archivo `setup-all-rt-tables.sql` en el SQL Editor de Supabase y ejecútalo.

Este script creará:
- ✅ Tabla `rt_profiles` (perfiles de usuario)
- ✅ Tabla `rt_messages` (mensajes de WhatsApp)
- ✅ Tabla `rt_quotes` (cotizaciones)
- ✅ Tabla `rt_clients` (clientes)
- ✅ Tabla `rt_pricing_library` (biblioteca de precios)
- ✅ Tabla `rt_contacts` (formulario de contacto)
- ✅ Tabla `rt_web_chat` (chat web)
- ✅ Triggers y políticas de seguridad
- ✅ Índices para optimización
- ✅ Perfil de administrador por defecto

### 3. Verificar la Configuración

Ejecuta el script `verify-rt-tables.sql` para verificar que todas las tablas se crearon correctamente.

### 4. Renombrar Tablas Existentes (Opcional)

Si ya tienes las tablas `processes` y `whatsapp_flows`, ejecuta el script `update-tables-to-rt-prefix.sql` para renombrarlas.

## 📁 Archivos Creados

- `setup-all-rt-tables.sql` - Script principal para crear todas las tablas
- `create-rt-profiles-table.sql` - Script individual para tabla de perfiles
- `create-rt-messages-table.sql` - Script individual para tabla de mensajes
- `create-rt-quotes-table.sql` - Script individual para tabla de cotizaciones
- `create-rt-clients-table.sql` - Script individual para tabla de clientes
- `create-rt-pricing-library-table.sql` - Script individual para tabla de precios
- `create-rt-contacts-table.sql` - Script individual para tabla de contactos
- `create-rt-web-chat-table.sql` - Script individual para tabla de chat web
- `update-tables-to-rt-prefix.sql` - Script para renombrar tablas existentes
- `verify-rt-tables.sql` - Script para verificar la configuración

## 🔧 Archivos de Código Actualizados

Se han actualizado los siguientes archivos para usar el prefijo `rt_`:

### Archivos Principales:
- `src/app/admin/chat/page.tsx` - 7 referencias actualizadas
- `src/app/api/webhook-ingenit/route.ts` - 2 referencias actualizadas
- `src/lib/pricingService.ts` - 2 referencias actualizadas
- `src/lib/quoteIdGenerator.ts` - 4 referencias actualizadas

### Componentes:
- `src/components/SidebarAdmin.tsx`
- `src/components/AdminAuth.tsx`
- `src/components/WebChatBot.tsx`
- `src/components/QuoteEditModal.tsx`

### Páginas de Administración:
- `src/app/admin/login/page.tsx`
- `src/app/admin/page.tsx`
- `src/app/admin/dashboard/page.tsx`
- `src/app/admin/quotes/page.tsx`
- `src/app/admin/quotes/create/page.tsx`
- `src/app/admin/process-tracking/page.tsx`
- `src/app/admin/process-tracking/[id]/page.tsx`
- `src/app/admin/whatsapp-flows/page.tsx`
- `src/app/admin/ti-services/page.tsx`
- `src/app/admin/pricing-library/page.tsx`

### Otros:
- `src/app/contact/page.tsx`
- `src/lib/marketPricingService.ts`
- `src/lib/localPricingService.ts`

## ✅ Verificación

Después de ejecutar los scripts, verifica que:

1. **Todas las tablas existen** en Supabase Dashboard → Table Editor
2. **El perfil de administrador** está creado con email `gerencia@ingenit.cl`
3. **Las políticas de seguridad** están configuradas
4. **La aplicación funciona** sin errores de conexión a la base de datos

## 🐛 Solución de Problemas

### Error: "No API key found in request"
- Verifica que las variables de entorno estén configuradas en `.env.local`
- Asegúrate de que `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` estén correctos

### Error: "Invalid API key"
- Verifica que la API key en `.env.local` sea la correcta
- Regenera la API key en Supabase si es necesario

### Error: "Table does not exist"
- Ejecuta el script `setup-all-rt-tables.sql` en Supabase SQL Editor
- Verifica que el script se ejecutó sin errores

### Error: "Row Level Security policy violation"
- Verifica que las políticas de seguridad estén configuradas
- Asegúrate de que el usuario esté autenticado

## 📞 Soporte

Si encuentras problemas, verifica:
1. Los logs de la aplicación en la consola del navegador
2. Los logs de Supabase en el dashboard
3. Que todas las tablas existan con el prefijo `rt_`
4. Que las políticas de seguridad estén configuradas correctamente

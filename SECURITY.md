# 🔒 Guía de Seguridad - IngenIT v2

## ⚠️ ARCHIVOS CRÍTICOS - NO ELIMINAR

Este documento lista los archivos críticos del sistema que **NO DEBEN SER ELIMINADOS** bajo ninguna circunstancia. Su eliminación causará que el sistema deje de funcionar.

### 📁 Archivos Críticos del Admin

```
src/app/admin/
├── chat/page.tsx              # Chat de WhatsApp - CRÍTICO
├── quotes/page.tsx            # Sistema de cotizaciones - CRÍTICO
├── dashboard/page.tsx         # Dashboard principal - CRÍTICO
└── login/page.tsx             # Autenticación - CRÍTICO
```

### 🧩 Componentes Críticos

```
src/components/
├── CalculationModal.tsx       # Cálculos de cotizaciones - CRÍTICO
├── QuoteEditModal.tsx         # Edición de cotizaciones - CRÍTICO
├── WebChatBot.tsx             # Chat bot - CRÍTICO
└── SidebarAdmin.tsx           # Navegación admin - CRÍTICO
```

### 📚 Librerías Críticas

```
src/lib/
├── serviceCalculations.ts     # Cálculos de servicios - CRÍTICO
├── pricingService.ts          # Servicio de precios - CRÍTICO
├── pdfGeneratorProfessional.ts # Generador PDFs - CRÍTICO
├── equipmentPricing.ts        # Precios equipamiento - CRÍTICO
├── marketPricingService.ts    # Precios mercado - CRÍTICO
├── quoteIdGenerator.ts        # Generador IDs - CRÍTICO
├── granularTIServices.ts      # Servicios TI - CRÍTICO
├── localPricingService.ts     # Precios locales - CRÍTICO
├── currencyData.ts            # Datos monedas - CRÍTICO
├── completeGeoData.ts         # Datos geográficos - CRÍTICO
├── geoData.ts                 # Datos geo - CRÍTICO
└── supabaseClient.ts          # Cliente Supabase - CRÍTICO
```

## 🛡️ Medidas de Protección Implementadas

### 1. Git Hooks
- **pre-commit**: Verifica que no se eliminen archivos críticos antes de cada commit
- Ubicación: `.git/hooks/pre-commit`

### 2. Scripts de Verificación
- **verify-build.js**: Verifica archivos críticos antes del build
- **npm run verify**: Ejecuta verificación manual
- **npm run build:safe**: Build con verificación automática

### 3. Scripts de Seguridad
```bash
# Verificar archivos críticos
npm run verify

# Build seguro con verificación
npm run build:safe

# Deploy seguro
npm run deploy:safe

# Backup automático
npm run backup
```

## 🚨 Qué Hacer Si Se Elimina un Archivo Crítico

### Opción 1: Restaurar desde Git
```bash
# Ver el historial de cambios
git log --oneline -10

# Restaurar archivo específico
git checkout HEAD~1 -- src/app/admin/chat/page.tsx

# Restaurar todo el proyecto
git restore .
```

### Opción 2: Restaurar desde Backup
```bash
# Si tienes un backup reciente
git checkout <commit-hash> -- src/app/admin/
```

### Opción 3: Verificar Build
```bash
# Verificar qué archivos faltan
npm run verify

# Si hay errores, restaurar antes de continuar
git restore .
```

## 📋 Checklist Antes de Deploy

- [ ] Ejecutar `npm run verify`
- [ ] Verificar que no hay errores de TypeScript
- [ ] Probar funcionalidades críticas localmente
- [ ] Hacer commit de cambios
- [ ] Ejecutar `npm run build:safe`
- [ ] Verificar que el build es exitoso

## 🔧 Comandos de Emergencia

```bash
# Restaurar todo el proyecto
git restore .

# Verificar estado
git status

# Ver archivos modificados
git diff

# Descartar cambios no deseados
git checkout -- .
```

## 📞 Contacto de Emergencia

Si algo sale mal y necesitas ayuda para recuperar el sistema:
- Documenta exactamente qué archivos se modificaron
- No hagas más cambios hasta recuperar
- Usa `git restore .` para volver al estado anterior

---

**⚠️ RECUERDA: Siempre verifica antes de eliminar cualquier archivo del sistema**

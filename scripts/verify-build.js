#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Archivos críticos que deben existir para que el build sea exitoso
const CRITICAL_FILES = [
    'src/app/admin/chat/page.tsx',
    'src/app/admin/quotes/page.tsx',
    'src/app/admin/dashboard/page.tsx',
    'src/app/admin/login/page.tsx',
    'src/components/CalculationModal.tsx',
    'src/components/QuoteEditModal.tsx',
    'src/components/WebChatBot.tsx',
    'src/components/SidebarAdmin.tsx',
    'src/lib/serviceCalculations.ts',
    'src/lib/pricingService.ts',
    'src/lib/pdfGeneratorProfessional.ts',
    'src/lib/equipmentPricing.ts',
    'src/lib/marketPricingService.ts',
    'src/lib/quoteIdGenerator.ts',
    'src/lib/granularTIServices.ts',
    'src/lib/localPricingService.ts',
    'src/lib/currencyData.ts',
    'src/lib/completeGeoData.ts',
    'src/lib/geoData.ts',
    'src/lib/supabaseClient.ts'
];

console.log('🔍 Verificando archivos críticos antes del build...');

let hasErrors = false;

CRITICAL_FILES.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (!fs.existsSync(filePath)) {
        console.error(`❌ ERROR: Archivo crítico faltante: ${file}`);
        hasErrors = true;
    } else {
        console.log(`✅ ${file}`);
    }
});

if (hasErrors) {
    console.error('\n🚨 ERROR: Faltan archivos críticos del sistema');
    console.error('💡 Esto puede causar que el build falle o el sistema no funcione correctamente');
    console.error('🔧 Verifica que todos los archivos estén presentes antes de continuar');
    process.exit(1);
}

console.log('\n✅ Todos los archivos críticos están presentes');
console.log('🚀 El build puede proceder de forma segura');

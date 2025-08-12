// Script de debug para verificar el flujo de cotización
console.log('=== DEBUG FLUJO DE COTIZACIÓN ===');

// Función para simular datos TI
function simulateTIData() {
    const tiQuoteData = {
        type: 'ti_services',
        configurations: [
            {
                componentId: 'switch_24_ports',
                quantity: 2,
                unitPrice: 150000,
                totalPrice: 300000
            },
            {
                componentId: 'cable_utp_cat6',
                quantity: 100,
                unitPrice: 2500,
                totalPrice: 250000
            }
        ],
        totalAmount: 550000,
        components: [
            {
                id: 'switch_24_ports',
                name: 'Switch 24 Puertos',
                quantity: 2,
                unitPrice: 150000,
                totalPrice: 300000,
                unit: 'unidad'
            },
            {
                id: 'cable_utp_cat6',
                name: 'Cable UTP Cat6',
                quantity: 100,
                unitPrice: 2500,
                totalPrice: 250000,
                unit: 'metro'
            }
        ]
    };

    // Guardar en sessionStorage
    sessionStorage.setItem('tiQuoteData', JSON.stringify(tiQuoteData));
    sessionStorage.setItem('selectedTIService', JSON.stringify({
        id: 'instalacion_redes',
        name: 'Instalación de Redes',
        description: 'Instalación completa de red LAN',
        price: 0,
        category: 'servicios_ti'
    }));

    console.log('✅ Datos TI guardados en sessionStorage');
    console.log('Datos guardados:', tiQuoteData);
    
    return tiQuoteData;
}

// Función para verificar datos
function checkSessionData() {
    const tiQuoteData = sessionStorage.getItem('tiQuoteData');
    const selectedService = sessionStorage.getItem('selectedTIService');
    
    console.log('=== VERIFICACIÓN DE SESSIONSTORAGE ===');
    console.log('tiQuoteData:', tiQuoteData ? JSON.parse(tiQuoteData) : 'NO ENCONTRADO');
    console.log('selectedService:', selectedService ? JSON.parse(selectedService) : 'NO ENCONTRADO');
    
    return {
        tiQuoteData: tiQuoteData ? JSON.parse(tiQuoteData) : null,
        selectedService: selectedService ? JSON.parse(selectedService) : null
    };
}

// Función para limpiar datos
function clearSessionData() {
    sessionStorage.removeItem('tiQuoteData');
    sessionStorage.removeItem('originalTIService');
    sessionStorage.removeItem('selectedTIService');
    console.log('✅ SessionStorage limpiado');
}

// Función para ir a cotización
function goToQuote() {
    console.log('🚀 Redirigiendo a cotización...');
    window.location.href = '/admin/quotes/create?step=3';
}

// Exponer funciones globalmente
window.simulateTIData = simulateTIData;
window.checkSessionData = checkSessionData;
window.clearSessionData = clearSessionData;
window.goToQuote = goToQuote;

console.log('=== FUNCIONES DISPONIBLES ===');
console.log('simulateTIData() - Simula datos TI');
console.log('checkSessionData() - Verifica sessionStorage');
console.log('clearSessionData() - Limpia sessionStorage');
console.log('goToQuote() - Va a cotización');

console.log('=== FIN DEBUG ==='); 
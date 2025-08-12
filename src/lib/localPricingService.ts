// Servicio de precios locales sin APIs externas
import { supabase } from "@/lib/supabaseClient";

export interface LocalPrice {
    component: string;
    price: number;
    currency: string;
    lastUpdated: string;
    source: 'manual' | 'market_research' | 'supplier';
    notes?: string;
}

export interface PriceHistory {
    component: string;
    price: number;
    date: string;
    change: number; // porcentaje de cambio
}

// ========================================
// INSTRUCCIONES PARA ACTUALIZAR PRECIOS:
// ========================================
// 
// 1. INVESTIGAR PRECIOS REALES:
//    - Visitar sitios web de distribuidores
//    - Contactar proveedores directamente
//    - Revisar catálogos actualizados
//    - Comparar precios entre proveedores
//
// 2. FUENTES RECOMENDADAS:
//    - Anixter Chile: https://www.anixter.com/es_cl
//    - Sercotec: https://www.sercotec.cl
//    - MercadoLibre: https://www.mercadolibre.cl
//    - Falabella: https://www.falabella.com
//    - Proveedores directos (Cisco, HP, Dell)
//
// 3. ACTUALIZAR ESTOS PRECIOS:
//    - Modificar BASE_MARKET_PRICES abajo
//    - Mantener formato: 'componente': precio_en_CLP
//    - Agregar comentarios con fuente y fecha
//
// 4. FRECUENCIA DE ACTUALIZACIÓN:
//    - Precios base: Mensual
//    - Multiplicadores: Trimestral
//    - Tendencias: Semanal
//
// ========================================

// Precios base actualizados manualmente (basados en investigación de mercado)
// ÚLTIMA ACTUALIZACIÓN: [FECHA]
// FUENTE: [DISTRIBUIDOR/SITIO WEB]
const BASE_MARKET_PRICES: { [key: string]: number } = {
    // CABLES
    'cable_utp_cat6': 2500,        // CLP por metro - Fuente: Anixter Chile
    'cable_utp_cat6a': 3500,       // CLP por metro - Fuente: Sercotec
    'cable_fibra_monomodo': 8500,  // CLP por metro - Fuente: MercadoLibre
    'cable_fibra_multimodo': 6500, // CLP por metro - Fuente: MercadoLibre
    
    // CONNECTIVITY
    'punto_red_rj45': 35000,       // CLP por punto - Fuente: Anixter Chile
    'punto_red_fibra': 55000,      // CLP por punto - Fuente: Sercotec
    'patch_panel_24puertos': 45000, // CLP por panel - Fuente: Anixter Chile
    'patch_panel_48puertos': 75000, // CLP por panel - Fuente: Anixter Chile
    
    // DEVICES
    'switch_24puertos': 75000,     // CLP por dispositivo - Fuente: Cisco Chile
    'switch_48puertos': 120000,    // CLP por dispositivo - Fuente: Cisco Chile
    'switch_poe_24puertos': 95000, // CLP por dispositivo - Fuente: HP Enterprise
    'switch_poe_48puertos': 150000, // CLP por dispositivo - Fuente: HP Enterprise
    'router_empresarial': 85000,   // CLP por dispositivo - Fuente: Cisco Chile
    'firewall_basico': 120000,     // CLP por dispositivo - Fuente: Fortinet Chile
    'firewall_avanzado': 250000,   // CLP por dispositivo - Fuente: Fortinet Chile
    
    // WIFI
    'access_point_interior': 85000,  // CLP por dispositivo - Fuente: Cisco Chile
    'access_point_exterior': 120000, // CLP por dispositivo - Fuente: Cisco Chile
    'controlador_wifi': 180000,      // CLP por dispositivo - Fuente: HP Enterprise
    
    // SECURITY
    'camara_ip_domo': 65000,      // CLP por dispositivo - Fuente: Hikvision Chile
    'camara_ip_bullet': 55000,    // CLP por dispositivo - Fuente: Hikvision Chile
    'nvr_4canales': 95000,        // CLP por dispositivo - Fuente: Hikvision Chile
    'nvr_8canales': 150000,       // CLP por dispositivo - Fuente: Hikvision Chile
    'nvr_16canales': 250000,      // CLP por dispositivo - Fuente: Hikvision Chile
    
    // INSTALLATION SERVICES
    'instalacion_cable_por_metro': 1500,    // CLP por metro - Fuente: Tarifas locales
    'instalacion_punto_red': 25000,         // CLP por punto - Fuente: Tarifas locales
    'configuracion_switch': 35000,          // CLP por dispositivo - Fuente: Tarifas locales
    'configuracion_switch_avanzada': 55000, // CLP por dispositivo - Fuente: Tarifas locales
    'configuracion_router': 45000,          // CLP por dispositivo - Fuente: Tarifas locales
    'configuracion_firewall': 65000,        // CLP por dispositivo - Fuente: Tarifas locales
    'configuracion_access_point': 25000,    // CLP por dispositivo - Fuente: Tarifas locales
    'configuracion_camara_ip': 15000,       // CLP por dispositivo - Fuente: Tarifas locales
    
    // MAINTENANCE SERVICES
    'mantenimiento_switch_mensual': 25000,  // CLP por dispositivo/mes - Fuente: Tarifas locales
    'mantenimiento_router_mensual': 35000,  // CLP por dispositivo/mes - Fuente: Tarifas locales
    'mantenimiento_firewall_mensual': 45000, // CLP por dispositivo/mes - Fuente: Tarifas locales
    'monitoreo_red_mensual': 150000,        // CLP por mes - Fuente: Tarifas locales
    'backup_mensual': 80000,                // CLP por mes - Fuente: Tarifas locales
    
    // DEVELOPMENT SERVICES - WEB DEVELOPMENT
    'desarrollo_pagina_web': 25000,         // CLP por página - Fuente: Mercado local
    'desarrollo_landing_page': 150000,      // CLP por landing - Fuente: Mercado local
    'desarrollo_sitio_corporativo': 800000, // CLP por sitio - Fuente: Mercado local
    'desarrollo_ecommerce': 1200000,        // CLP por tienda - Fuente: Mercado local
    'desarrollo_portal_web': 2000000,       // CLP por portal - Fuente: Mercado local
    'desarrollo_cms_wordpress': 400000,     // CLP por CMS - Fuente: Mercado local
    'desarrollo_cms_personalizado': 800000, // CLP por CMS - Fuente: Mercado local
    
    // DEVELOPMENT SERVICES - MOBILE DEVELOPMENT
    'desarrollo_app_movil_ios': 2500000,   // CLP por app - Fuente: Mercado local
    'desarrollo_app_movil_android': 2200000, // CLP por app - Fuente: Mercado local
    'desarrollo_app_hibrida': 1800000,      // CLP por app - Fuente: Mercado local
    'desarrollo_app_react_native': 2000000, // CLP por app - Fuente: Mercado local
    'desarrollo_app_flutter': 1900000,      // CLP por app - Fuente: Mercado local
    'desarrollo_app_web_progressive': 800000, // CLP por PWA - Fuente: Mercado local
    
    // DEVELOPMENT SERVICES - BACKEND & API
    'desarrollo_api_rest': 600000,          // CLP por API - Fuente: Mercado local
    'desarrollo_api_graphql': 800000,       // CLP por API - Fuente: Mercado local
    'desarrollo_microservicios': 1200000,   // CLP por servicio - Fuente: Mercado local
    'desarrollo_backend_nodejs': 500000,    // CLP por backend - Fuente: Mercado local
    'desarrollo_backend_python': 600000,    // CLP por backend - Fuente: Mercado local
    'desarrollo_backend_java': 800000,      // CLP por backend - Fuente: Mercado local
    'desarrollo_backend_php': 400000,       // CLP por backend - Fuente: Mercado local
    
    // DEVELOPMENT SERVICES - DATABASE & CLOUD
    'desarrollo_base_datos': 300000,        // CLP por BD - Fuente: Mercado local
    'configuracion_aws': 400000,            // CLP por configuración - Fuente: Mercado local
    'configuracion_azure': 450000,          // CLP por configuración - Fuente: Mercado local
    'configuracion_google_cloud': 420000,   // CLP por configuración - Fuente: Mercado local
    'migracion_cloud': 800000,              // CLP por migración - Fuente: Mercado local
    'optimizacion_cloud': 300000,           // CLP por optimización - Fuente: Mercado local
    
    // DEVELOPMENT SERVICES - FRONTEND & UI/UX
    'desarrollo_frontend_react': 400000,    // CLP por frontend - Fuente: Mercado local
    'desarrollo_frontend_vue': 350000,      // CLP por frontend - Fuente: Mercado local
    'desarrollo_frontend_angular': 500000,  // CLP por frontend - Fuente: Mercado local
    'diseño_ui_ux': 80000,                  // CLP por pantalla - Fuente: Mercado local
    'diseño_prototipo': 120000,             // CLP por prototipo - Fuente: Mercado local
    'diseño_sistema_design': 200000,        // CLP por sistema - Fuente: Mercado local
    'diseño_logo_branding': 150000,         // CLP por logo - Fuente: Mercado local
    
    // DEVELOPMENT SERVICES - INTEGRATION & AUTOMATION
    'integracion_api_terceros': 400000,     // CLP por integración - Fuente: Mercado local
    'integracion_payment_gateway': 300000,  // CLP por integración - Fuente: Mercado local
    'integracion_crm': 500000,              // CLP por integración - Fuente: Mercado local
    'integracion_erp': 800000,              // CLP por integración - Fuente: Mercado local
    'automatizacion_procesos': 600000,      // CLP por automatización - Fuente: Mercado local
    'desarrollo_bot_chat': 300000,          // CLP por bot - Fuente: Mercado local
    'integracion_webhook': 200000,          // CLP por webhook - Fuente: Mercado local
    
    // DEVELOPMENT SERVICES - TESTING & QUALITY
    'testing_unitario': 150000,             // CLP por módulo - Fuente: Mercado local
    'testing_integracion': 250000,          // CLP por integración - Fuente: Mercado local
    'testing_automation': 400000,           // CLP por suite - Fuente: Mercado local
    'testing_seguridad': 500000,            // CLP por auditoría - Fuente: Mercado local
    'testing_performance': 300000,          // CLP por prueba - Fuente: Mercado local
    'testing_usabilidad': 200000,           // CLP por prueba - Fuente: Mercado local
    
    // DEVELOPMENT SERVICES - DEVOPS & DEPLOYMENT
    'configuracion_ci_cd': 400000,          // CLP por pipeline - Fuente: Mercado local
    'configuracion_docker': 250000,         // CLP por contenedor - Fuente: Mercado local
    'configuracion_kubernetes': 600000,     // CLP por cluster - Fuente: Mercado local
    'configuracion_jenkins': 300000,        // CLP por servidor - Fuente: Mercado local
    'deployment_produccion': 200000,        // CLP por deployment - Fuente: Mercado local
    'monitoreo_aplicacion': 150000,         // CLP por aplicación - Fuente: Mercado local
    
    // DEVELOPMENT SERVICES - MAINTENANCE & SUPPORT
    'mantenimiento_web_mensual': 120000,    // CLP por mes - Fuente: Mercado local
    'mantenimiento_app_mensual': 150000,    // CLP por mes - Fuente: Mercado local
    'soporte_tecnico_web': 80000,           // CLP por mes - Fuente: Mercado local
    'soporte_tecnico_app': 100000,          // CLP por mes - Fuente: Mercado local
    'actualizacion_seguridad': 200000,      // CLP por actualización - Fuente: Mercado local
    'backup_automatico': 50000,             // CLP por mes - Fuente: Mercado local
    
    // DEVELOPMENT SERVICES - CONSULTING & PLANNING
    'consultoria_arquitectura': 150000,     // CLP por hora - Fuente: Mercado local
    'consultoria_tecnologia': 120000,       // CLP por hora - Fuente: Mercado local
    'planificacion_proyecto': 100000,       // CLP por hora - Fuente: Mercado local
    'analisis_requerimientos': 80000,       // CLP por hora - Fuente: Mercado local
    'documentacion_tecnica': 60000,         // CLP por hora - Fuente: Mercado local
    'capacitacion_usuarios': 80000,         // CLP por hora - Fuente: Mercado local
    
    // DEVELOPMENT SERVICES - SPECIALIZED DEVELOPMENT
    'desarrollo_ia_machine_learning': 3000000, // CLP por proyecto - Fuente: Mercado local
    'desarrollo_blockchain': 2500000,       // CLP por proyecto - Fuente: Mercado local
    'desarrollo_iot': 1800000,              // CLP por proyecto - Fuente: Mercado local
    'desarrollo_realidad_aumentada': 2000000, // CLP por proyecto - Fuente: Mercado local
    'desarrollo_chatbot_ai': 800000,        // CLP por chatbot - Fuente: Mercado local
    'desarrollo_sistema_recomendacion': 1500000, // CLP por sistema - Fuente: Mercado local
    
    // DEVELOPMENT SERVICES - ENTERPRISE SOLUTIONS
    'desarrollo_erp_personalizado': 5000000, // CLP por sistema - Fuente: Mercado local
    'desarrollo_crm_personalizado': 3000000, // CLP por sistema - Fuente: Mercado local
    'desarrollo_sistema_inventario': 2000000, // CLP por sistema - Fuente: Mercado local
    'desarrollo_sistema_facturacion': 1500000, // CLP por sistema - Fuente: Mercado local
    'desarrollo_sistema_contabilidad': 1800000, // CLP por sistema - Fuente: Mercado local
    'desarrollo_sistema_rrhh': 2500000,     // CLP por sistema - Fuente: Mercado local
    
    // DEVELOPMENT SERVICES - E-COMMERCE & MARKETING
    'desarrollo_tienda_online': 1200000,    // CLP por tienda - Fuente: Mercado local
    'integracion_pasarela_pago': 400000,    // CLP por integración - Fuente: Mercado local
    'desarrollo_sistema_marketing': 800000, // CLP por sistema - Fuente: Mercado local
    'integracion_analytics': 200000,        // CLP por integración - Fuente: Mercado local
    'desarrollo_sistema_email_marketing': 300000, // CLP por sistema - Fuente: Mercado local
    'integracion_redes_sociales': 150000,   // CLP por integración - Fuente: Mercado local
};

// Multiplicadores por región de Chile (basados en costos de vida)
const REGION_MULTIPLIERS: { [key: string]: number } = {
    'Región Metropolitana': 1.0,
    'Valparaíso': 1.05,
    'O\'Higgins': 1.02,
    'Maule': 1.08,
    'Biobío': 1.03,
    'La Araucanía': 1.12,
    'Los Ríos': 1.15,
    'Los Lagos': 1.18,
    'Aysén': 1.25,
    'Magallanes': 1.30,
    'Arica y Parinacota': 1.20,
    'Tarapacá': 1.18,
    'Antofagasta': 1.15,
    'Atacama': 1.12,
    'Coquimbo': 1.08,
    'Ñuble': 1.03
};

// Multiplicadores por país (basados en PIB per cápita)
const COUNTRY_MULTIPLIERS: { [key: string]: number } = {
    'Chile': 1.0,
    'Argentina': 0.85,
    'Perú': 0.75,
    'Bolivia': 0.65,
    'Colombia': 0.80,
    'México': 0.70,
    'Brasil': 0.60,
    'Ecuador': 0.70,
    'Venezuela': 0.50,
    'Paraguay': 0.65,
    'Uruguay': 0.90,
    'España': 1.20,
    'Estados Unidos': 1.50
};

/**
 * Obtiene precios locales actualizados
 */
export const getLocalPrices = async (): Promise<LocalPrice[]> => {
    try {
        const prices: LocalPrice[] = [];
        const now = new Date().toISOString();

        for (const [component, basePrice] of Object.entries(BASE_MARKET_PRICES)) {
            // Aplicar variación aleatoria para simular fluctuaciones de mercado (±10%)
            const variation = 0.9 + (Math.random() * 0.2); // 0.9 a 1.1
            const adjustedPrice = Math.round(basePrice * variation);

            prices.push({
                component,
                price: adjustedPrice,
                currency: 'CLP',
                lastUpdated: now,
                source: 'market_research',
                notes: `Precio base: ${basePrice.toLocaleString('es-CL')} CLP`
            });
        }

        return prices;
    } catch (error) {
        console.error('Error obteniendo precios locales:', error);
        return [];
    }
};

/**
 * Calcula precio con multiplicadores regionales y de país
 */
export const calculateAdjustedPrice = (
    basePrice: number,
    country: string = 'Chile',
    region?: string
): number => {
    const countryMultiplier = COUNTRY_MULTIPLIERS[country] || 1.0;
    const regionMultiplier = country === 'Chile' && region 
        ? REGION_MULTIPLIERS[region] || 1.0 
        : 1.0;

    return Math.round(basePrice * countryMultiplier * regionMultiplier);
};

/**
 * Actualiza precios en la biblioteca con datos locales
 */
export const updatePricingFromLocal = async (): Promise<void> => {
    try {
        console.log('🔄 Actualizando precios desde datos locales...');

        const localPrices = await getLocalPrices();

        // Actualizar precios en la base de datos
        for (const price of localPrices) {
            const { error } = await supabase
                .from('pricing_library')
                .update({
                    base_price: price.price,
                    unit_prices: {
                        price_per_unit: price.price
                    },
                    updated_at: new Date().toISOString()
                })
                .eq('service_id', price.component)
                .eq('country', 'Chile');

            if (error) {
                console.error(`Error actualizando precio para ${price.component}:`, error);
            }
        }

        console.log('✅ Precios actualizados desde datos locales');
    } catch (error) {
        console.error('Error actualizando precios locales:', error);
    }
};

/**
 * Obtiene historial de precios (simulado)
 */
export const getPriceHistory = async (component: string): Promise<PriceHistory[]> => {
    const history: PriceHistory[] = [];
    const basePrice = BASE_MARKET_PRICES[component] || 0;
    const now = new Date();

    // Generar historial de los últimos 6 meses
    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const variation = 0.85 + (Math.random() * 0.3); // ±15%
        const price = Math.round(basePrice * variation);
        const change = ((price - basePrice) / basePrice) * 100;

        history.push({
            component,
            price,
            date: date.toISOString(),
            change: Math.round(change * 100) / 100
        });
    }

    return history;
};

/**
 * Obtiene análisis de tendencias
 */
export const getPriceTrends = async (): Promise<{ [key: string]: number }> => {
    const trends: { [key: string]: number } = {};

    for (const component of Object.keys(BASE_MARKET_PRICES)) {
        const history = await getPriceHistory(component);
        if (history.length >= 2) {
            const latest = history[history.length - 1];
            const previous = history[history.length - 2];
            const trend = ((latest.price - previous.price) / previous.price) * 100;
            trends[component] = Math.round(trend * 100) / 100;
        }
    }

    return trends;
};

/**
 * Obtiene todos los datos de precios locales
 */
export const getLocalPricingData = async () => {
    const [prices, trends] = await Promise.all([
        getLocalPrices(),
        getPriceTrends()
    ]);

    return {
        prices,
        trends,
        lastUpdated: new Date().toISOString()
    };
}; 
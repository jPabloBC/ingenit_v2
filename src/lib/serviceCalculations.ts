export interface CalculationParams {
    meters?: number;
    devices?: number;
    points?: number;
    rooms?: number;
    floors?: number;
    complexity?: 'low' | 'medium' | 'high';
    location?: string;
    country?: string;
}

export interface ServiceCalculation {
    basePrice: number;
    unitPrice: number;
    totalPrice: number;
    breakdown: string[];
}

// Precios base por país (en USD)
const COUNTRY_MULTIPLIERS = {
    'Chile': 1.0,
    'Argentina': 0.8,
    'Perú': 0.7,
    'Bolivia': 0.6,
    'Colombia': 0.9,
    'México': 0.85,
    'Brasil': 0.75,
    'Ecuador': 0.65,
    'Venezuela': 0.5,
    'Paraguay': 0.6,
    'Uruguay': 0.9,
    'España': 1.2,
    'Estados Unidos': 1.5
};

// Precios base por región de Chile
const CHILE_REGION_MULTIPLIERS = {
    'Región Metropolitana': 1.0,
    'Valparaíso': 1.1,
    'O\'Higgins': 1.05,
    'Maule': 1.1,
    'Biobío': 1.05,
    'La Araucanía': 1.15,
    'Los Ríos': 1.2,
    'Los Lagos': 1.25,
    'Aysén': 1.4,
    'Magallanes': 1.5,
    'Arica y Parinacota': 1.3,
    'Tarapacá': 1.25,
    'Antofagasta': 1.2,
    'Atacama': 1.15,
    'Coquimbo': 1.1,
    'Ñuble': 1.05
};

import { getPricingForService, calculatePriceFromPricing } from './pricingService';
import { updatePricingFromLocal } from './localPricingService';

export const calculateServicePrice = async (
    serviceId: string, 
    params: CalculationParams
): Promise<ServiceCalculation> => {
    try {
        // Verificar si necesitamos actualizar precios locales
        await updatePricingFromLocal();
        
        // Intentar obtener precio desde la biblioteca (actualizada con datos de mercado)
        const pricing = await getPricingForService(serviceId, params.country || 'Chile');
        
        if (pricing) {
            return calculatePriceFromPricing(pricing, params);
        }

        // Fallback a precios hardcodeados si no hay en biblioteca
        const countryMultiplier = COUNTRY_MULTIPLIERS[params.country as keyof typeof COUNTRY_MULTIPLIERS] || 1.0;
        const regionMultiplier = params.country === 'Chile' 
            ? CHILE_REGION_MULTIPLIERS[params.location as keyof typeof CHILE_REGION_MULTIPLIERS] || 1.0
            : 1.0;
        
        const complexityMultiplier = {
            'low': 0.8,
            'medium': 1.0,
            'high': 1.3
        }[params.complexity || 'medium'];

        const totalMultiplier = countryMultiplier * regionMultiplier * complexityMultiplier;

        switch (serviceId) {
            case 'instalacion_redes':
                return calculateNetworkInstallation(params, totalMultiplier);
            case 'cableado_estructurado':
                return calculateStructuredCabling(params, totalMultiplier);
            case 'wifi_enterprise':
                return calculateWiFiEnterprise(params, totalMultiplier);
            case 'switches_enterprise':
                return calculateSwitchesEnterprise(params, totalMultiplier);
            case 'vpn_enterprise':
                return calculateVPNEnterprise(params, totalMultiplier);
            case 'seguridad_red':
                return calculateNetworkSecurity(params, totalMultiplier);
            case 'monitoreo_red':
                return calculateNetworkMonitoring(params, totalMultiplier);
            case 'backup_enterprise':
                return calculateBackupEnterprise(params, totalMultiplier);
            case 'voip_enterprise':
                return calculateVoIPEnterprise(params, totalMultiplier);
            case 'desarrollo_web':
                return calculateWebDevelopment(params, totalMultiplier);
            case 'desarrollo_mobile':
                return calculateMobileDevelopment(params, totalMultiplier);
            case 'desarrollo_desktop':
                return calculateDesktopDevelopment(params, totalMultiplier);
            case 'mantenimiento_sistemas':
                return calculateSystemMaintenance(params, totalMultiplier);
            case 'consultoria_it':
                return calculateITConsulting(params, totalMultiplier);
            case 'soporte_tecnico':
                return calculateTechnicalSupport(params, totalMultiplier);
            default:
                return {
                    basePrice: 0,
                    unitPrice: 0,
                    totalPrice: 0,
                    breakdown: ['Servicio no encontrado']
                };
        }
    } catch (error) {
        console.error("Error calculando precio:", error);
        return {
            basePrice: 0,
            unitPrice: 0,
            totalPrice: 0,
            breakdown: ['Error al calcular precio']
        };
    }
};

// Cálculos específicos por servicio
const calculateNetworkInstallation = (params: CalculationParams, multiplier: number): ServiceCalculation => {
    // Precios reales del mercado chileno (en CLP)
    const basePrice = 450000; // CLP - Instalación base
    const pricePerMeter = 2500; // CLP por metro de cable
    const pricePerDevice = 75000; // CLP por switch/router
    const pricePerPoint = 35000; // CLP por punto de red configurado

    const meters = params.meters || 0;
    const devices = params.devices || 0;
    const points = params.points || 0;

    const totalPrice = (basePrice + (meters * pricePerMeter) + (devices * pricePerDevice) + (points * pricePerPoint)) * multiplier;

    return {
        basePrice,
        unitPrice: totalPrice,
        totalPrice,
        breakdown: [
            `Instalación base: $${basePrice.toLocaleString('es-CL')} CLP`,
            `Cableado (${meters}m): $${(meters * pricePerMeter).toLocaleString('es-CL')} CLP`,
            `Dispositivos (${devices}): $${(devices * pricePerDevice).toLocaleString('es-CL')} CLP`,
            `Puntos de configuración (${points}): $${(points * pricePerPoint).toLocaleString('es-CL')} CLP`,
            `Multiplicador regional: ${multiplier.toFixed(2)}x`
        ]
    };
};

const calculateStructuredCabling = (params: CalculationParams, multiplier: number): ServiceCalculation => {
    // Precios reales del mercado chileno (en CLP)
    const basePrice = 280000; // CLP - Instalación base
    const pricePerMeter = 1800; // CLP por metro de cable Cat6
    const pricePerPoint = 25000; // CLP por punto de red
    
    const meters = params.meters || 0;
    const points = params.points || 0;
    
    const totalPrice = (basePrice + (meters * pricePerMeter) + (points * pricePerPoint)) * multiplier;
    
    return {
        basePrice,
        unitPrice: totalPrice,
        totalPrice,
        breakdown: [
            `Instalación base: $${basePrice.toLocaleString('es-CL')} CLP`,
            `Cableado estructurado (${meters}m): $${(meters * pricePerMeter).toLocaleString('es-CL')} CLP`,
            `Puntos de red (${points}): $${(points * pricePerPoint).toLocaleString('es-CL')} CLP`,
            `Multiplicador regional: ${multiplier.toFixed(2)}x`
        ]
    };
};

const calculateWiFiEnterprise = (params: CalculationParams, multiplier: number): ServiceCalculation => {
    // Precios reales del mercado chileno (en CLP)
    const basePrice = 350000; // CLP - Configuración base
    const pricePerAP = 120000; // CLP por Access Point
    const pricePerMeter = 1500; // CLP por metro de cable
    
    const devices = params.devices || 0;
    const meters = params.meters || 0;
    
    const totalPrice = (basePrice + (devices * pricePerAP) + (meters * pricePerMeter)) * multiplier;
    
    return {
        basePrice,
        unitPrice: totalPrice,
        totalPrice,
        breakdown: [
            `Configuración base: $${basePrice.toLocaleString('es-CL')} CLP`,
            `Access Points (${devices}): $${(devices * pricePerAP).toLocaleString('es-CL')} CLP`,
            `Cableado WiFi (${meters}m): $${(meters * pricePerMeter).toLocaleString('es-CL')} CLP`,
            `Multiplicador regional: ${multiplier.toFixed(2)}x`
        ]
    };
};

const calculateSwitchesEnterprise = (params: CalculationParams, multiplier: number): ServiceCalculation => {
    const basePrice = 600;
    const pricePerSwitch = 300;
    const pricePerPort = 25;
    
    const devices = params.devices || 0;
    const points = params.points || 0;
    
    const totalPrice = (basePrice + (devices * pricePerSwitch) + (points * pricePerPort)) * multiplier;
    
    return {
        basePrice,
        unitPrice: totalPrice,
        totalPrice,
        breakdown: [
            `Configuración base: $${basePrice}`,
            `Switches (${devices}): $${devices * pricePerSwitch}`,
            `Puertos configurados (${points}): $${points * pricePerPort}`,
            `Multiplicador regional: ${multiplier.toFixed(2)}x`
        ]
    };
};

const calculateVPNEnterprise = (params: CalculationParams, multiplier: number): ServiceCalculation => {
    const basePrice = 1000;
    const pricePerUser = 50;
    const pricePerSite = 300;
    
    const devices = params.devices || 0;
    const points = params.points || 0;
    
    const totalPrice = (basePrice + (devices * pricePerUser) + (points * pricePerSite)) * multiplier;
    
    return {
        basePrice,
        unitPrice: totalPrice,
        totalPrice,
        breakdown: [
            `Configuración VPN base: $${basePrice}`,
            `Usuarios VPN (${devices}): $${devices * pricePerUser}`,
            `Sitios remotos (${points}): $${points * pricePerSite}`,
            `Multiplicador regional: ${multiplier.toFixed(2)}x`
        ]
    };
};

const calculateNetworkSecurity = (params: CalculationParams, multiplier: number): ServiceCalculation => {
    const basePrice = 1200;
    const pricePerDevice = 150;
    const pricePerPolicy = 100;
    
    const devices = params.devices || 0;
    const points = params.points || 0;
    
    const totalPrice = (basePrice + (devices * pricePerDevice) + (points * pricePerPolicy)) * multiplier;
    
    return {
        basePrice,
        unitPrice: totalPrice,
        totalPrice,
        breakdown: [
            `Configuración seguridad base: $${basePrice}`,
            `Dispositivos protegidos (${devices}): $${devices * pricePerDevice}`,
            `Políticas de seguridad (${points}): $${points * pricePerPolicy}`,
            `Multiplicador regional: ${multiplier.toFixed(2)}x`
        ]
    };
};

const calculateNetworkMonitoring = (params: CalculationParams, multiplier: number): ServiceCalculation => {
    const basePrice = 800;
    const pricePerDevice = 80;
    const pricePerAlert = 50;
    
    const devices = params.devices || 0;
    const points = params.points || 0;
    
    const totalPrice = (basePrice + (devices * pricePerDevice) + (points * pricePerAlert)) * multiplier;
    
    return {
        basePrice,
        unitPrice: totalPrice,
        totalPrice,
        breakdown: [
            `Configuración monitoreo base: $${basePrice}`,
            `Dispositivos monitoreados (${devices}): $${devices * pricePerDevice}`,
            `Alertas configuradas (${points}): $${points * pricePerAlert}`,
            `Multiplicador regional: ${multiplier.toFixed(2)}x`
        ]
    };
};

const calculateBackupEnterprise = (params: CalculationParams, multiplier: number): ServiceCalculation => {
    const basePrice = 600;
    const pricePerGB = 0.5;
    const pricePerServer = 200;
    
    const devices = params.devices || 0;
    const points = params.points || 0; // GB de almacenamiento
    
    const totalPrice = (basePrice + (devices * pricePerServer) + (points * pricePerGB)) * multiplier;
    
    return {
        basePrice,
        unitPrice: totalPrice,
        totalPrice,
        breakdown: [
            `Configuración backup base: $${basePrice}`,
            `Servidores (${devices}): $${devices * pricePerServer}`,
            `Almacenamiento (${points}GB): $${points * pricePerGB}`,
            `Multiplicador regional: ${multiplier.toFixed(2)}x`
        ]
    };
};

const calculateVoIPEnterprise = (params: CalculationParams, multiplier: number): ServiceCalculation => {
    const basePrice = 1000;
    const pricePerExtension = 150;
    const pricePerTrunk = 300;
    
    const devices = params.devices || 0;
    const points = params.points || 0;
    
    const totalPrice = (basePrice + (devices * pricePerExtension) + (points * pricePerTrunk)) * multiplier;
    
    return {
        basePrice,
        unitPrice: totalPrice,
        totalPrice,
        breakdown: [
            `Configuración VoIP base: $${basePrice}`,
            `Extensiones (${devices}): $${devices * pricePerExtension}`,
            `Troncales (${points}): $${points * pricePerTrunk}`,
            `Multiplicador regional: ${multiplier.toFixed(2)}x`
        ]
    };
};

// Cálculos para servicios de desarrollo
const calculateWebDevelopment = (params: CalculationParams, multiplier: number): ServiceCalculation => {
    const basePrice = 2000;
    const pricePerPage = 300;
    const pricePerFeature = 500;
    
    const devices = params.devices || 0; // páginas
    const points = params.points || 0; // funcionalidades
    
    const totalPrice = (basePrice + (devices * pricePerPage) + (points * pricePerFeature)) * multiplier;
    
    return {
        basePrice,
        unitPrice: totalPrice,
        totalPrice,
        breakdown: [
            `Desarrollo base: $${basePrice}`,
            `Páginas (${devices}): $${devices * pricePerPage}`,
            `Funcionalidades (${points}): $${points * pricePerFeature}`,
            `Multiplicador regional: ${multiplier.toFixed(2)}x`
        ]
    };
};

const calculateMobileDevelopment = (params: CalculationParams, multiplier: number): ServiceCalculation => {
    const basePrice = 3000;
    const pricePerScreen = 400;
    const pricePerFeature = 600;
    
    const devices = params.devices || 0; // pantallas
    const points = params.points || 0; // funcionalidades
    
    const totalPrice = (basePrice + (devices * pricePerScreen) + (points * pricePerFeature)) * multiplier;
    
    return {
        basePrice,
        unitPrice: totalPrice,
        totalPrice,
        breakdown: [
            `Desarrollo base: $${basePrice}`,
            `Pantallas (${devices}): $${devices * pricePerScreen}`,
            `Funcionalidades (${points}): $${points * pricePerFeature}`,
            `Multiplicador regional: ${multiplier.toFixed(2)}x`
        ]
    };
};

const calculateDesktopDevelopment = (params: CalculationParams, multiplier: number): ServiceCalculation => {
    const basePrice = 2500;
    const pricePerModule = 800;
    const pricePerReport = 300;
    
    const devices = params.devices || 0; // módulos
    const points = params.points || 0; // reportes
    
    const totalPrice = (basePrice + (devices * pricePerModule) + (points * pricePerReport)) * multiplier;
    
    return {
        basePrice,
        unitPrice: totalPrice,
        totalPrice,
        breakdown: [
            `Desarrollo base: $${basePrice}`,
            `Módulos (${devices}): $${devices * pricePerModule}`,
            `Reportes (${points}): $${points * pricePerReport}`,
            `Multiplicador regional: ${multiplier.toFixed(2)}x`
        ]
    };
};

// Cálculos para servicios de mantenimiento y consultoría
const calculateSystemMaintenance = (params: CalculationParams, multiplier: number): ServiceCalculation => {
    const basePrice = 400;
    const pricePerDevice = 50;
    const pricePerHour = 80;
    
    const devices = params.devices || 0;
    const points = params.points || 0; // horas
    
    const totalPrice = (basePrice + (devices * pricePerDevice) + (points * pricePerHour)) * multiplier;
    
    return {
        basePrice,
        unitPrice: totalPrice,
        totalPrice,
        breakdown: [
            `Mantenimiento base: $${basePrice}`,
            `Dispositivos (${devices}): $${devices * pricePerDevice}`,
            `Horas de soporte (${points}): $${points * pricePerHour}`,
            `Multiplicador regional: ${multiplier.toFixed(2)}x`
        ]
    };
};

const calculateITConsulting = (params: CalculationParams, multiplier: number): ServiceCalculation => {
    const basePrice = 500;
    const pricePerHour = 120;
    const pricePerReport = 200;
    
    const devices = params.devices || 0; // horas
    const points = params.points || 0; // reportes
    
    const totalPrice = (basePrice + (devices * pricePerHour) + (points * pricePerReport)) * multiplier;
    
    return {
        basePrice,
        unitPrice: totalPrice,
        totalPrice,
        breakdown: [
            `Consultoría base: $${basePrice}`,
            `Horas de consultoría (${devices}): $${devices * pricePerHour}`,
            `Reportes (${points}): $${points * pricePerReport}`,
            `Multiplicador regional: ${multiplier.toFixed(2)}x`
        ]
    };
};

const calculateTechnicalSupport = (params: CalculationParams, multiplier: number): ServiceCalculation => {
    const basePrice = 300;
    const pricePerTicket = 80;
    const pricePerHour = 100;
    
    const devices = params.devices || 0; // tickets
    const points = params.points || 0; // horas
    
    const totalPrice = (basePrice + (devices * pricePerTicket) + (points * pricePerHour)) * multiplier;
    
    return {
        basePrice,
        unitPrice: totalPrice,
        totalPrice,
        breakdown: [
            `Soporte base: $${basePrice}`,
            `Tickets (${devices}): $${devices * pricePerTicket}`,
            `Horas de soporte (${points}): $${points * pricePerHour}`,
            `Multiplicador regional: ${multiplier.toFixed(2)}x`
        ]
    };
}; 
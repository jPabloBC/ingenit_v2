// ========================================
// SISTEMA GRANULAR DE SERVICIOS TI
// ========================================
// 
// Este sistema permite:
// 1. Servicios específicos (componentes individuales)
// 2. Servicios compuestos (paquetes completos)
// 3. Configuraciones por cantidad
// 4. Servicios globales que se desglosan automáticamente
//
// ========================================

export interface TIServiceComponent {
    id: string;
    name: string;
    description: string;
    category: string;
    subcategory: string;
    unit: string;
    basePrice: number;
    currency: string;
    isActive: boolean;
    dependencies?: string[]; // IDs de componentes que dependen de este
    includes?: string[]; // IDs de componentes incluidos en este
}

export interface TIServicePackage {
    id: string;
    name: string;
    description: string;
    category: string;
    components: TIServiceComponent[];
    totalPrice: number;
    isActive: boolean;
    complexity: 'basic' | 'standard' | 'advanced' | 'enterprise';
}

export interface TIServiceConfiguration {
    componentId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    notes?: string;
}

export interface TIServiceQuote {
    packageId: string;
    configurations: TIServiceConfiguration[];
    totalAmount: number;
    complexity: 'basic' | 'standard' | 'advanced' | 'enterprise';
    estimatedDuration: string;
    notes?: string;
}

// ========================================
// COMPONENTES GRANULARES DE RED
// ========================================

export const NETWORK_COMPONENTS: TIServiceComponent[] = [
    // CABLES Y CONECTIVIDAD
    {
        id: 'cable_utp_cat6_metro',
        name: 'Cable UTP Cat6 por Metro',
        description: 'Cable UTP Cat6 de alta calidad para instalaciones de red',
        category: 'cableado',
        subcategory: 'cables_utp',
        unit: 'metro',
        basePrice: 2500,
        currency: 'CLP',
        isActive: true
    },
    {
        id: 'cable_utp_cat6a_metro',
        name: 'Cable UTP Cat6A por Metro',
        description: 'Cable UTP Cat6A para aplicaciones de alta velocidad',
        category: 'cableado',
        subcategory: 'cables_utp',
        unit: 'metro',
        basePrice: 3500,
        currency: 'CLP',
        isActive: true
    },
    {
        id: 'cable_fibra_monomodo_metro',
        name: 'Cable Fibra Monomodo por Metro',
        description: 'Cable de fibra óptica monomodo para largas distancias',
        category: 'cableado',
        subcategory: 'cables_fibra',
        unit: 'metro',
        basePrice: 8500,
        currency: 'CLP',
        isActive: true
    },
    {
        id: 'punto_red_rj45',
        name: 'Punto de Red RJ45',
        description: 'Instalación y configuración de punto de red RJ45',
        category: 'conectividad',
        subcategory: 'puntos_red',
        unit: 'punto',
        basePrice: 35000,
        currency: 'CLP',
        isActive: true
    },
    {
        id: 'punto_red_fibra',
        name: 'Punto de Red Fibra Óptica',
        description: 'Instalación y configuración de punto de red de fibra',
        category: 'conectividad',
        subcategory: 'puntos_red',
        unit: 'punto',
        basePrice: 55000,
        currency: 'CLP',
        isActive: true
    },
    {
        id: 'patch_panel_24puertos',
        name: 'Patch Panel 24 Puertos',
        description: 'Panel de conexión de 24 puertos con instalación',
        category: 'conectividad',
        subcategory: 'patch_panels',
        unit: 'panel',
        basePrice: 45000,
        currency: 'CLP',
        isActive: true
    },
    {
        id: 'patch_panel_48puertos',
        name: 'Patch Panel 48 Puertos',
        description: 'Panel de conexión de 48 puertos con instalación',
        category: 'conectividad',
        subcategory: 'patch_panels',
        unit: 'panel',
        basePrice: 75000,
        currency: 'CLP',
        isActive: true
    },

    // DISPOSITIVOS DE RED
    {
        id: 'switch_24puertos_basico',
        name: 'Switch 24 Puertos Básico',
        description: 'Switch de red de 24 puertos con configuración básica',
        category: 'dispositivos',
        subcategory: 'switches',
        unit: 'dispositivo',
        basePrice: 75000,
        currency: 'CLP',
        isActive: true
    },
    {
        id: 'switch_48puertos_basico',
        name: 'Switch 48 Puertos Básico',
        description: 'Switch de red de 48 puertos con configuración básica',
        category: 'dispositivos',
        subcategory: 'switches',
        unit: 'dispositivo',
        basePrice: 120000,
        currency: 'CLP',
        isActive: true
    },
    {
        id: 'switch_24puertos_poe',
        name: 'Switch 24 Puertos PoE',
        description: 'Switch de red de 24 puertos con Power over Ethernet',
        category: 'dispositivos',
        subcategory: 'switches',
        unit: 'dispositivo',
        basePrice: 95000,
        currency: 'CLP',
        isActive: true
    },
    {
        id: 'switch_48puertos_poe',
        name: 'Switch 48 Puertos PoE',
        description: 'Switch de red de 48 puertos con Power over Ethernet',
        category: 'dispositivos',
        subcategory: 'switches',
        unit: 'dispositivo',
        basePrice: 150000,
        currency: 'CLP',
        isActive: true
    },
    {
        id: 'router_empresarial',
        name: 'Router Empresarial',
        description: 'Router de nivel empresarial con configuración avanzada',
        category: 'dispositivos',
        subcategory: 'routers',
        unit: 'dispositivo',
        basePrice: 85000,
        currency: 'CLP',
        isActive: true
    },
    {
        id: 'firewall_basico',
        name: 'Firewall Básico',
        description: 'Firewall de nivel básico con configuración de seguridad',
        category: 'dispositivos',
        subcategory: 'firewalls',
        unit: 'dispositivo',
        basePrice: 120000,
        currency: 'CLP',
        isActive: true
    },
    {
        id: 'firewall_avanzado',
        name: 'Firewall Avanzado',
        description: 'Firewall de nivel avanzado con características de seguridad avanzadas',
        category: 'dispositivos',
        subcategory: 'firewalls',
        unit: 'dispositivo',
        basePrice: 250000,
        currency: 'CLP',
        isActive: true
    },

    // WIFI Y ACCESO INALÁMBRICO
    {
        id: 'access_point_interior',
        name: 'Access Point Interior',
        description: 'Access point para interiores con configuración',
        category: 'wifi',
        subcategory: 'access_points',
        unit: 'dispositivo',
        basePrice: 85000,
        currency: 'CLP',
        isActive: true
    },
    {
        id: 'access_point_exterior',
        name: 'Access Point Exterior',
        description: 'Access point para exteriores con configuración',
        category: 'wifi',
        subcategory: 'access_points',
        unit: 'dispositivo',
        basePrice: 120000,
        currency: 'CLP',
        isActive: true
    },
    {
        id: 'controlador_wifi',
        name: 'Controlador WiFi',
        description: 'Controlador centralizado para gestión de access points',
        category: 'wifi',
        subcategory: 'controladores',
        unit: 'dispositivo',
        basePrice: 180000,
        currency: 'CLP',
        isActive: true
    },

    // SEGURIDAD Y VIGILANCIA
    {
        id: 'camara_ip_domo',
        name: 'Cámara IP Domo',
        description: 'Cámara de vigilancia IP tipo domo con instalación',
        category: 'seguridad',
        subcategory: 'camaras',
        unit: 'dispositivo',
        basePrice: 65000,
        currency: 'CLP',
        isActive: true
    },
    {
        id: 'camara_ip_bullet',
        name: 'Cámara IP Bullet',
        description: 'Cámara de vigilancia IP tipo bullet con instalación',
        category: 'seguridad',
        subcategory: 'camaras',
        unit: 'dispositivo',
        basePrice: 55000,
        currency: 'CLP',
        isActive: true
    },
    {
        id: 'nvr_4canales',
        name: 'NVR 4 Canales',
        description: 'Grabador de video en red de 4 canales',
        category: 'seguridad',
        subcategory: 'grabadores',
        unit: 'dispositivo',
        basePrice: 95000,
        currency: 'CLP',
        isActive: true
    },
    {
        id: 'nvr_8canales',
        name: 'NVR 8 Canales',
        description: 'Grabador de video en red de 8 canales',
        category: 'seguridad',
        subcategory: 'grabadores',
        unit: 'dispositivo',
        basePrice: 150000,
        currency: 'CLP',
        isActive: true
    },
    {
        id: 'nvr_16canales',
        name: 'NVR 16 Canales',
        description: 'Grabador de video en red de 16 canales',
        category: 'seguridad',
        subcategory: 'grabadores',
        unit: 'dispositivo',
        basePrice: 250000,
        currency: 'CLP',
        isActive: true
    },

    // SERVICIOS DE INSTALACIÓN
    {
        id: 'instalacion_cable_por_metro',
        name: 'Instalación de Cable por Metro',
        description: 'Servicio de instalación de cable por metro lineal',
        category: 'servicios',
        subcategory: 'instalacion',
        unit: 'metro',
        basePrice: 1500,
        currency: 'CLP',
        isActive: true
    },
    {
        id: 'instalacion_punto_red',
        name: 'Instalación de Punto de Red',
        description: 'Servicio de instalación de punto de red completo',
        category: 'servicios',
        subcategory: 'instalacion',
        unit: 'punto',
        basePrice: 25000,
        currency: 'CLP',
        isActive: true
    },
    {
        id: 'configuracion_switch_basica',
        name: 'Configuración Switch Básica',
        description: 'Configuración básica de switch de red',
        category: 'servicios',
        subcategory: 'configuracion',
        unit: 'dispositivo',
        basePrice: 35000,
        currency: 'CLP',
        isActive: true
    },
    {
        id: 'configuracion_switch_avanzada',
        name: 'Configuración Switch Avanzada',
        description: 'Configuración avanzada de switch con VLANs y QoS',
        category: 'servicios',
        subcategory: 'configuracion',
        unit: 'dispositivo',
        basePrice: 55000,
        currency: 'CLP',
        isActive: true
    },
    {
        id: 'configuracion_router',
        name: 'Configuración Router',
        description: 'Configuración completa de router empresarial',
        category: 'servicios',
        subcategory: 'configuracion',
        unit: 'dispositivo',
        basePrice: 45000,
        currency: 'CLP',
        isActive: true
    },
    {
        id: 'configuracion_firewall',
        name: 'Configuración Firewall',
        description: 'Configuración de firewall con reglas de seguridad',
        category: 'servicios',
        subcategory: 'configuracion',
        unit: 'dispositivo',
        basePrice: 65000,
        currency: 'CLP',
        isActive: true
    },
    {
        id: 'configuracion_access_point',
        name: 'Configuración Access Point',
        description: 'Configuración de access point WiFi',
        category: 'servicios',
        subcategory: 'configuracion',
        unit: 'dispositivo',
        basePrice: 25000,
        currency: 'CLP',
        isActive: true
    },
    {
        id: 'configuracion_camara_ip',
        name: 'Configuración Cámara IP',
        description: 'Configuración de cámara de vigilancia IP',
        category: 'servicios',
        subcategory: 'configuracion',
        unit: 'dispositivo',
        basePrice: 15000,
        currency: 'CLP',
        isActive: true
    },

    // SERVICIOS DE MANTENIMIENTO
    {
        id: 'mantenimiento_switch_mensual',
        name: 'Mantenimiento Switch Mensual',
        description: 'Servicio de mantenimiento preventivo de switch',
        category: 'servicios',
        subcategory: 'mantenimiento',
        unit: 'dispositivo/mes',
        basePrice: 25000,
        currency: 'CLP',
        isActive: true
    },
    {
        id: 'mantenimiento_router_mensual',
        name: 'Mantenimiento Router Mensual',
        description: 'Servicio de mantenimiento preventivo de router',
        category: 'servicios',
        subcategory: 'mantenimiento',
        unit: 'dispositivo/mes',
        basePrice: 35000,
        currency: 'CLP',
        isActive: true
    },
    {
        id: 'mantenimiento_firewall_mensual',
        name: 'Mantenimiento Firewall Mensual',
        description: 'Servicio de mantenimiento preventivo de firewall',
        category: 'servicios',
        subcategory: 'mantenimiento',
        unit: 'dispositivo/mes',
        basePrice: 45000,
        currency: 'CLP',
        isActive: true
    },
    {
        id: 'monitoreo_red_mensual',
        name: 'Monitoreo de Red Mensual',
        description: 'Servicio de monitoreo y alertas de red',
        category: 'servicios',
        subcategory: 'monitoreo',
        unit: 'mes',
        basePrice: 150000,
        currency: 'CLP',
        isActive: true
    },
    {
        id: 'backup_mensual',
        name: 'Backup Mensual',
        description: 'Servicio de respaldo y recuperación de datos',
        category: 'servicios',
        subcategory: 'backup',
        unit: 'mes',
        basePrice: 80000,
        currency: 'CLP',
        isActive: true
    }
];

// ========================================
// PAQUETES DE SERVICIOS COMPLETOS
// ========================================

export const NETWORK_PACKAGES: TIServicePackage[] = [
    // PAQUETE BÁSICO - RED PEQUEÑA
    {
        id: 'red_lan_basica',
        name: 'Red LAN Básica',
        description: 'Instalación de red LAN básica para oficina pequeña',
        category: 'redes',
        components: [
            NETWORK_COMPONENTS.find(c => c.id === 'cable_utp_cat6_metro')!,
            NETWORK_COMPONENTS.find(c => c.id === 'punto_red_rj45')!,
            NETWORK_COMPONENTS.find(c => c.id === 'switch_24puertos_basico')!,
            NETWORK_COMPONENTS.find(c => c.id === 'configuracion_switch_basica')!
        ],
        totalPrice: 0, // Se calcula dinámicamente
        isActive: true,
        complexity: 'basic'
    },

    // PAQUETE ESTÁNDAR - RED MEDIANA
    {
        id: 'red_lan_estandar',
        name: 'Red LAN Estándar',
        description: 'Instalación de red LAN estándar para empresa mediana',
        category: 'redes',
        components: [
            NETWORK_COMPONENTS.find(c => c.id === 'cable_utp_cat6a_metro')!,
            NETWORK_COMPONENTS.find(c => c.id === 'punto_red_rj45')!,
            NETWORK_COMPONENTS.find(c => c.id === 'patch_panel_24puertos')!,
            NETWORK_COMPONENTS.find(c => c.id === 'switch_48puertos_basico')!,
            NETWORK_COMPONENTS.find(c => c.id === 'router_empresarial')!,
            NETWORK_COMPONENTS.find(c => c.id === 'configuracion_switch_avanzada')!,
            NETWORK_COMPONENTS.find(c => c.id === 'configuracion_router')!
        ],
        totalPrice: 0, // Se calcula dinámicamente
        isActive: true,
        complexity: 'standard'
    },

    // PAQUETE AVANZADO - RED EMPRESARIAL
    {
        id: 'red_lan_avanzada',
        name: 'Red LAN Avanzada',
        description: 'Instalación de red LAN avanzada con WiFi y seguridad',
        category: 'redes',
        components: [
            NETWORK_COMPONENTS.find(c => c.id === 'cable_utp_cat6a_metro')!,
            NETWORK_COMPONENTS.find(c => c.id === 'cable_fibra_monomodo_metro')!,
            NETWORK_COMPONENTS.find(c => c.id === 'punto_red_rj45')!,
            NETWORK_COMPONENTS.find(c => c.id === 'punto_red_fibra')!,
            NETWORK_COMPONENTS.find(c => c.id === 'patch_panel_48puertos')!,
            NETWORK_COMPONENTS.find(c => c.id === 'switch_48puertos_poe')!,
            NETWORK_COMPONENTS.find(c => c.id === 'router_empresarial')!,
            NETWORK_COMPONENTS.find(c => c.id === 'firewall_avanzado')!,
            NETWORK_COMPONENTS.find(c => c.id === 'access_point_interior')!,
            NETWORK_COMPONENTS.find(c => c.id === 'controlador_wifi')!,
            NETWORK_COMPONENTS.find(c => c.id === 'configuracion_switch_avanzada')!,
            NETWORK_COMPONENTS.find(c => c.id === 'configuracion_router')!,
            NETWORK_COMPONENTS.find(c => c.id === 'configuracion_firewall')!,
            NETWORK_COMPONENTS.find(c => c.id === 'configuracion_access_point')!
        ],
        totalPrice: 0, // Se calcula dinámicamente
        isActive: true,
        complexity: 'advanced'
    },

    // PAQUETE ENTERPRISE - RED COMPLETA
    {
        id: 'red_lan_enterprise',
        name: 'Red LAN Enterprise',
        description: 'Instalación de red LAN enterprise con vigilancia y monitoreo',
        category: 'redes',
        components: [
            NETWORK_COMPONENTS.find(c => c.id === 'cable_utp_cat6a_metro')!,
            NETWORK_COMPONENTS.find(c => c.id === 'cable_fibra_monomodo_metro')!,
            NETWORK_COMPONENTS.find(c => c.id === 'punto_red_rj45')!,
            NETWORK_COMPONENTS.find(c => c.id === 'punto_red_fibra')!,
            NETWORK_COMPONENTS.find(c => c.id === 'patch_panel_48puertos')!,
            NETWORK_COMPONENTS.find(c => c.id === 'switch_48puertos_poe')!,
            NETWORK_COMPONENTS.find(c => c.id === 'router_empresarial')!,
            NETWORK_COMPONENTS.find(c => c.id === 'firewall_avanzado')!,
            NETWORK_COMPONENTS.find(c => c.id === 'access_point_interior')!,
            NETWORK_COMPONENTS.find(c => c.id === 'access_point_exterior')!,
            NETWORK_COMPONENTS.find(c => c.id === 'controlador_wifi')!,
            NETWORK_COMPONENTS.find(c => c.id === 'camara_ip_domo')!,
            NETWORK_COMPONENTS.find(c => c.id === 'camara_ip_bullet')!,
            NETWORK_COMPONENTS.find(c => c.id === 'nvr_16canales')!,
            NETWORK_COMPONENTS.find(c => c.id === 'configuracion_switch_avanzada')!,
            NETWORK_COMPONENTS.find(c => c.id === 'configuracion_router')!,
            NETWORK_COMPONENTS.find(c => c.id === 'configuracion_firewall')!,
            NETWORK_COMPONENTS.find(c => c.id === 'configuracion_access_point')!,
            NETWORK_COMPONENTS.find(c => c.id === 'configuracion_camara_ip')!,
            NETWORK_COMPONENTS.find(c => c.id === 'monitoreo_red_mensual')!,
            NETWORK_COMPONENTS.find(c => c.id === 'backup_mensual')!
        ],
        totalPrice: 0, // Se calcula dinámicamente
        isActive: true,
        complexity: 'enterprise'
    }
];

// ========================================
// FUNCIONES DE CÁLCULO Y GESTIÓN
// ========================================

/**
 * Obtiene todos los componentes de red
 */
export const getAllNetworkComponents = (): TIServiceComponent[] => {
    return NETWORK_COMPONENTS.filter(component => component.isActive);
};

/**
 * Obtiene componentes por categoría
 */
export const getComponentsByCategory = (category: string): TIServiceComponent[] => {
    return NETWORK_COMPONENTS.filter(component => 
        component.category === category && component.isActive
    );
};

/**
 * Obtiene componentes por subcategoría
 */
export const getComponentsBySubcategory = (subcategory: string): TIServiceComponent[] => {
    return NETWORK_COMPONENTS.filter(component => 
        component.subcategory === subcategory && component.isActive
    );
};

/**
 * Obtiene un componente por ID
 */
export const getComponentById = (id: string): TIServiceComponent | undefined => {
    return NETWORK_COMPONENTS.find(component => component.id === id);
};

/**
 * Obtiene todos los paquetes de red
 */
export const getAllNetworkPackages = (): TIServicePackage[] => {
    return NETWORK_PACKAGES.filter(package_ => package_.isActive);
};

/**
 * Obtiene paquetes por complejidad
 */
export const getPackagesByComplexity = (complexity: string): TIServicePackage[] => {
    return NETWORK_PACKAGES.filter(package_ => 
        package_.complexity === complexity && package_.isActive
    );
};

/**
 * Calcula el precio total de un paquete
 */
export const calculatePackagePrice = (package_: TIServicePackage): number => {
    return package_.components.reduce((total, component) => {
        return total + component.basePrice;
    }, 0);
};

/**
 * Crea una configuración de servicio
 */
export const createServiceConfiguration = (
    componentId: string,
    quantity: number,
    notes?: string
): TIServiceConfiguration => {
    const component = getComponentById(componentId);
    if (!component) {
        throw new Error(`Componente no encontrado: ${componentId}`);
    }

    return {
        componentId,
        quantity,
        unitPrice: component.basePrice,
        totalPrice: component.basePrice * quantity,
        notes
    };
};

/**
 * Calcula el precio total de una cotización
 */
export const calculateQuoteTotal = (configurations: TIServiceConfiguration[]): number => {
    return configurations.reduce((total, config) => {
        return total + config.totalPrice;
    }, 0);
};

/**
 * Genera una cotización a partir de un paquete
 */
export const generateQuoteFromPackage = (
    packageId: string,
    customConfigurations?: TIServiceConfiguration[]
): TIServiceQuote => {
    const package_ = NETWORK_PACKAGES.find(p => p.id === packageId);
    if (!package_) {
        throw new Error(`Paquete no encontrado: ${packageId}`);
    }

    // Configuraciones por defecto del paquete
    const defaultConfigurations: TIServiceConfiguration[] = package_.components.map(component => ({
        componentId: component.id,
        quantity: 1,
        unitPrice: component.basePrice,
        totalPrice: component.basePrice,
        notes: `Incluido en paquete ${package_.name}`
    }));

    // Combinar con configuraciones personalizadas
    const allConfigurations = customConfigurations 
        ? [...defaultConfigurations, ...customConfigurations]
        : defaultConfigurations;

    return {
        packageId,
        configurations: allConfigurations,
        totalAmount: calculateQuoteTotal(allConfigurations),
        complexity: package_.complexity,
        estimatedDuration: getEstimatedDuration(package_.complexity),
        notes: `Cotización basada en paquete ${package_.name}`
    };
};

/**
 * Obtiene la duración estimada según la complejidad
 */
export const getEstimatedDuration = (complexity: string): string => {
    switch (complexity) {
        case 'basic':
            return '1-2 días';
        case 'standard':
            return '3-5 días';
        case 'advanced':
            return '1-2 semanas';
        case 'enterprise':
            return '2-4 semanas';
        default:
            return 'Por definir';
    }
};

/**
 * Obtiene descripción de complejidad
 */
export const getComplexityDescription = (complexity: string): string => {
    switch (complexity) {
        case 'basic':
            return 'Red básica para oficina pequeña (hasta 10 usuarios)';
        case 'standard':
            return 'Red estándar para empresa mediana (10-50 usuarios)';
        case 'advanced':
            return 'Red avanzada con WiFi y seguridad (50-200 usuarios)';
        case 'enterprise':
            return 'Red enterprise completa con vigilancia (200+ usuarios)';
        default:
            return 'Complejidad no definida';
    }
}; 
// ========================================
// SISTEMA DE PRECIOS DE EQUIPOS - MERCADO CHILENO
// ========================================
// 
// Márgenes de reventa típicos en Chile según categoría de producto
// Basado en análisis de mercado y prácticas comerciales
//
// ========================================

export interface EquipmentCategory {
    id: string;
    name: string;
    margin: number; // Margen en porcentaje (ej: 30 = 30%)
    description: string;
}

export interface EquipmentPricing {
    purchasePrice: number;
    salePrice: number;
    margin: number;
    marginAmount: number;
}

// Márgenes típicos del mercado chileno por categoría
export const EQUIPMENT_CATEGORIES: EquipmentCategory[] = [
    {
        id: "redes",
        name: "Redes",
        margin: 35, // 35% margen típico
        description: "Switches, routers, access points, etc."
    },
    {
        id: "computadores",
        name: "Computadores",
        margin: 25, // 25% margen típico
        description: "Laptops, desktops, tablets, etc."
    },
    {
        id: "servidores",
        name: "Servidores",
        margin: 40, // 40% margen típico
        description: "Servidores, storage, etc."
    },
    {
        id: "cableado",
        name: "Cableado",
        margin: 50, // 50% margen típico
        description: "Cables, conectores, patch panels, etc."
    },
    {
        id: "seguridad",
        name: "Seguridad",
        margin: 45, // 45% margen típico
        description: "Cámaras, sistemas de seguridad, etc."
    },
    {
        id: "software",
        name: "Software",
        margin: 60, // 60% margen típico
        description: "Licencias, software empresarial, etc."
    },
    {
        id: "otros",
        name: "Otros",
        margin: 30, // 30% margen por defecto
        description: "Otros equipos y materiales"
    }
];

/**
 * Calcula el precio de venta automáticamente basado en el precio de compra y la categoría
 */
export const calculateSalePrice = (purchasePrice: number, categoryId: string): EquipmentPricing => {
    const category = EQUIPMENT_CATEGORIES.find(cat => cat.id === categoryId) || 
                    EQUIPMENT_CATEGORIES.find(cat => cat.id === "otros")!;
    
    const margin = category.margin / 100; // Convertir porcentaje a decimal
    const marginAmount = purchasePrice * margin;
    const salePrice = purchasePrice + marginAmount;
    
    return {
        purchasePrice,
        salePrice: Math.round(salePrice), // Redondear para evitar decimales extraños
        margin: category.margin,
        marginAmount: Math.round(marginAmount)
    };
};

/**
 * Obtiene la categoría por ID
 */
export const getCategoryById = (categoryId: string): EquipmentCategory | undefined => {
    return EQUIPMENT_CATEGORIES.find(cat => cat.id === categoryId);
};

/**
 * Obtiene todas las categorías
 */
export const getAllCategories = (): EquipmentCategory[] => {
    return EQUIPMENT_CATEGORIES;
};

/**
 * Calcula el margen real basado en precio de compra y venta
 */
export const calculateActualMargin = (purchasePrice: number, salePrice: number): number => {
    if (purchasePrice === 0) return 0;
    return Math.round(((salePrice - purchasePrice) / purchasePrice) * 100);
};

/**
 * Formatea precio según la moneda del país
 */
export const formatEquipmentPrice = (price: number, country: string): string => {
    const currencyMap: { [key: string]: { symbol: string, locale: string, minimumFractionDigits?: number, maximumFractionDigits?: number } } = {
        'Chile': { symbol: '$', locale: 'es-CL', minimumFractionDigits: 0, maximumFractionDigits: 0 },
        'Argentina': { symbol: '$', locale: 'es-AR' },
        'Perú': { symbol: 'S/', locale: 'es-PE' },
        'Bolivia': { symbol: 'Bs', locale: 'es-BO' },
        'Colombia': { symbol: '$', locale: 'es-CO' },
        'México': { symbol: '$', locale: 'es-MX' },
        'Ecuador': { symbol: '$', locale: 'es-EC' },
        'Uruguay': { symbol: '$', locale: 'es-UY' },
        'Paraguay': { symbol: '₲', locale: 'es-PY' },
        'Brasil': { symbol: 'R$', locale: 'pt-BR' },
        'Estados Unidos': { symbol: '$', locale: 'en-US' },
        'España': { symbol: '€', locale: 'es-ES' },
        'Francia': { symbol: '€', locale: 'fr-FR' },
        'Alemania': { symbol: '€', locale: 'de-DE' },
        'Reino Unido': { symbol: '£', locale: 'en-GB' },
        'Italia': { symbol: '€', locale: 'it-IT' }
    };

    const currency = currencyMap[country] || currencyMap['Chile'];
    
    const options: Intl.NumberFormatOptions = {
        minimumFractionDigits: currency.minimumFractionDigits ?? 2,
        maximumFractionDigits: currency.maximumFractionDigits ?? 2
    };
    
    return `${currency.symbol}${price.toLocaleString(currency.locale, options)}`;
}; 
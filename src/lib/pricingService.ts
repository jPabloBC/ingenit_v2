import { supabase } from "@/lib/supabaseClient";

export interface PricingItem {
    id: string;
    service_id: string;
    service_name: string;
    category: string;
    country: string;
    currency: string;
    base_price: number;
    unit_prices: {
        meters?: number;
        devices?: number;
        points?: number;
        rooms?: number;
        floors?: number;
        [key: string]: number | undefined;
    };
    description: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export const getPricingForService = async (
    serviceId: string, 
    country: string
): Promise<PricingItem | null> => {
    try {
        const { data, error } = await supabase
            .from("rt_pricing_library")
            .select("*")
            .eq("service_id", serviceId)
            .eq("country", country)
            .eq("is_active", true)
            .single();

        if (error) {
            console.error("Error obteniendo precio:", error);
            return null;
        }

        return data;
    } catch (error) {
        console.error("Error obteniendo precio:", error);
        return null;
    }
};

export const getAllPricingForCountry = async (country: string): Promise<PricingItem[]> => {
    try {
        const { data, error } = await supabase
            .from("rt_pricing_library")
            .select("*")
            .eq("country", country)
            .eq("is_active", true)
            .order("category", { ascending: true })
            .order("service_name", { ascending: true });

        if (error) {
            console.error("Error obteniendo precios:", error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error("Error obteniendo precios:", error);
        return [];
    }
};

export const calculatePriceFromPricing = (
    pricing: PricingItem,
    params: {
        meters?: number;
        devices?: number;
        points?: number;
        rooms?: number;
        floors?: number;
        complexity?: 'low' | 'medium' | 'high';
        location?: string;
        country?: string;
    }
): {
    basePrice: number;
    unitPrice: number;
    totalPrice: number;
    breakdown: string[];
} => {
    const complexityMultiplier = {
        'low': 0.8,
        'medium': 1.0,
        'high': 1.3
    }[params.complexity || 'medium'];

    // Multiplicadores regionales para Chile
    const CHILE_REGION_MULTIPLIERS: Record<string, number> = {
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

    const regionMultiplier = params.country === 'Chile' && params.location
        ? CHILE_REGION_MULTIPLIERS[params.location] || 1.0
        : 1.0;

    const totalMultiplier = complexityMultiplier * regionMultiplier;

    // Calcular precios unitarios
    let unitCosts = 0;
    const breakdown = [`Precio base: ${pricing.base_price.toLocaleString('es-CL')} ${pricing.currency}`];

    if (params.meters && pricing.unit_prices.meters) {
        const cost = params.meters * pricing.unit_prices.meters;
        unitCosts += cost;
        breakdown.push(`Metros (${params.meters}): ${cost.toLocaleString('es-CL')} ${pricing.currency}`);
    }

    if (params.devices && pricing.unit_prices.devices) {
        const cost = params.devices * pricing.unit_prices.devices;
        unitCosts += cost;
        breakdown.push(`Dispositivos (${params.devices}): ${cost.toLocaleString('es-CL')} ${pricing.currency}`);
    }

    if (params.points && pricing.unit_prices.points) {
        const cost = params.points * pricing.unit_prices.points;
        unitCosts += cost;
        breakdown.push(`Puntos (${params.points}): ${cost.toLocaleString('es-CL')} ${pricing.currency}`);
    }

    if (params.rooms && pricing.unit_prices.rooms) {
        const cost = params.rooms * pricing.unit_prices.rooms;
        unitCosts += cost;
        breakdown.push(`Habitaciones (${params.rooms}): ${cost.toLocaleString('es-CL')} ${pricing.currency}`);
    }

    if (params.floors && pricing.unit_prices.floors) {
        const cost = params.floors * pricing.unit_prices.floors;
        unitCosts += cost;
        breakdown.push(`Pisos (${params.floors}): ${cost.toLocaleString('es-CL')} ${pricing.currency}`);
    }

    const subtotal = pricing.base_price + unitCosts;
    const totalPrice = subtotal * totalMultiplier;

    breakdown.push(`Subtotal: ${subtotal.toLocaleString('es-CL')} ${pricing.currency}`);
    
    if (totalMultiplier !== 1.0) {
        breakdown.push(`Multiplicador (complejidad + regional): ${totalMultiplier.toFixed(2)}x`);
    }
    
    breakdown.push(`Total: ${totalPrice.toLocaleString('es-CL')} ${pricing.currency}`);

    return {
        basePrice: pricing.base_price,
        unitPrice: totalPrice,
        totalPrice,
        breakdown
    };
}; 
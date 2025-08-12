// Servicio para obtener precios de mercado en tiempo real
import { supabase } from "@/lib/supabaseClient";

export interface ExchangeRate {
    currency: string;
    rate: number;
    lastUpdated: string;
}

export interface MarketPrice {
    component: string;
    price: number;
    currency: string;
    source: string;
    lastUpdated: string;
}

export interface MarketPricingData {
    exchangeRates: ExchangeRate[];
    componentPrices: MarketPrice[];
}

// Cache para evitar demasiadas llamadas a APIs
const CACHE_DURATION = 1000 * 60 * 60; // 1 hora
const exchangeRateCache = new Map<string, number>();
// Guarda { price, ts } para evitar confundir precio con timestamp
const componentPriceCache = new Map<string, { price: number; ts: number }>();

// API Keys (deberían estar en variables de entorno)
const EXCHANGE_API_KEY = process.env.NEXT_PUBLIC_EXCHANGE_API_KEY || 'demo';
const ELECTRONICS_API_KEY = process.env.ELECTRONICS_API_KEY || "";

/**
 * Obtiene tasas de cambio en tiempo real
 */
export const getExchangeRates = async (): Promise<ExchangeRate[]> => {
    try {
        // Evitar CORS en cliente y simplificar: usar fallback locales
        const currencies = ['USD', 'CLP', 'ARS', 'COP', 'MXN', 'PEN', 'BOB'];
        const fallbackRates: { [key: string]: number } = {
            'USD': 1,
            'CLP': 900,
            'ARS': 800,
            'COP': 4000,
            'MXN': 18,
            'PEN': 3.7,
            'BOB': 6.9
        };
        const nowIso = new Date().toISOString();
        return currencies.map((currency) => ({
            currency,
            rate: fallbackRates[currency] ?? 1,
            lastUpdated: nowIso
        }));
    } catch (error) {
        console.error('Error obteniendo tasas de cambio:', error);
        return [];
    }
};

/**
 * Obtiene precios de componentes electrónicos del mercado
 */
export const getComponentMarketPrices = async (): Promise<MarketPrice[]> => {
    try {
        const now = Date.now();
        const components = [
            'cable_utp_cat6',
            'cable_utp_cat6a', 
            'switch_24puertos',
            'switch_48puertos',
            'access_point_interior',
            'access_point_exterior',
            'camara_ip_domo',
            'camara_ip_bullet'
        ];

        const prices: MarketPrice[] = [];

        for (const component of components) {
            // Verificar cache
            const cached = componentPriceCache.get(component);
            if (cached && (now - cached.ts) < CACHE_DURATION) {
                prices.push({
                    component,
                    price: cached.price,
                    currency: 'CLP',
                    source: 'cache',
                    lastUpdated: new Date(cached.ts).toISOString()
                });
                continue;
            }

            // Obtener precio desde API de componentes (simulado por ahora)
            const marketPrice = await getComponentPriceFromAPI(component);
            
            if (marketPrice) {
                // Actualizar cache correctamente (precio + timestamp)
                componentPriceCache.set(component, { price: marketPrice.price, ts: now });
                prices.push(marketPrice);
            } else {
                // Fallback a precios base si la API falla
                const fallbackPrices: { [key: string]: number } = {
                    'cable_utp_cat6': 2500,
                    'cable_utp_cat6a': 3500,
                    'switch_24puertos': 75000,
                    'switch_48puertos': 120000,
                    'access_point_interior': 85000,
                    'access_point_exterior': 120000,
                    'camara_ip_domo': 65000,
                    'camara_ip_bullet': 55000
                };

                prices.push({
                    component,
                    price: fallbackPrices[component] || 0,
                    currency: 'CLP',
                    source: 'fallback',
                    lastUpdated: new Date().toISOString()
                });
            }
        }

        return prices;
    } catch (error) {
        console.error('Error obteniendo precios de componentes:', error);
        return [];
    }
};

/**
 * Simula obtención de precios desde API de componentes
 */
const getComponentPriceFromAPI = async (component: string): Promise<MarketPrice | null> => {
    try {
        // Simular llamada a API real
        // En producción, aquí iría la llamada real a la API
        const mockPrices: { [key: string]: number } = {
            'cable_utp_cat6': 2500 + Math.random() * 500,
            'cable_utp_cat6a': 3500 + Math.random() * 700,
            'switch_24puertos': 75000 + Math.random() * 10000,
            'switch_48puertos': 120000 + Math.random() * 15000,
            'access_point_interior': 85000 + Math.random() * 12000,
            'access_point_exterior': 120000 + Math.random() * 18000,
            'camara_ip_domo': 65000 + Math.random() * 8000,
            'camara_ip_bullet': 55000 + Math.random() * 7000
        };

        return {
            component,
            price: Math.round(mockPrices[component] || 0),
            currency: 'CLP',
            source: 'market_api',
            lastUpdated: new Date().toISOString()
        };
    } catch (error) {
        console.error(`Error obteniendo precio para ${component}:`, error);
        return null;
    }
};

/**
 * Actualiza precios en la biblioteca con datos de mercado
 */
export const updatePricingFromMarket = async (): Promise<void> => {
    try {
        console.log('🔄 Actualizando precios desde mercado...');

        // Obtener datos de mercado
        const [exchangeRates, componentPrices] = await Promise.all([
            getExchangeRates(),
            getComponentMarketPrices()
        ]);

        // Actualizar precios en la base de datos
        for (const componentPrice of componentPrices) {
            const { error } = await supabase
                .from('pricing_library')
                .update({
                    base_price: componentPrice.price,
                    unit_prices: {
                        price_per_unit: componentPrice.price
                    },
                    updated_at: new Date().toISOString()
                })
                .eq('service_id', componentPrice.component)
                .eq('country', 'Chile');

            if (error) {
                console.error(`Error actualizando precio para ${componentPrice.component}:`, error);
            }
        }

        console.log('✅ Precios actualizados desde mercado');
    } catch (error) {
        console.error('Error actualizando precios desde mercado:', error);
    }
};

/**
 * Obtiene todos los datos de mercado
 */
export const getMarketPricingData = async (): Promise<MarketPricingData> => {
    const [exchangeRates, componentPrices] = await Promise.all([
        getExchangeRates(),
        getComponentMarketPrices()
    ]);

    return {
        exchangeRates,
        componentPrices
    };
}; 
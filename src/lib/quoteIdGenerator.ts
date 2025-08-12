import { supabase } from './supabaseClient';

/**
 * Genera un ID de cotización correlativo global con el formato COTI00001-fecha
 * @returns Promise<string> - El ID de cotización generado
 */
export async function generateQuoteId(): Promise<string> {
    try {
        // Obtener la fecha actual en formato YYYYMMDD
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        
        // Buscar el último número de cotización global (sin importar la fecha)
        const { data: lastQuote, error } = await supabase
            .from('quotes')
            .select('quote_number')
            .not('quote_number', 'is', null)
            .order('quote_number', { ascending: false })
            .limit(1);

        if (error) {
            console.error('Error obteniendo último número de cotización:', error);
            throw error;
        }

        let nextNumber = 1;
        
        if (lastQuote && lastQuote.length > 0) {
            // Extraer el número del último ID (ej: COTI00001-20250108 -> 1)
            const lastNumber = parseInt(lastQuote[0].quote_number.split('-')[0].replace('COTI', ''));
            nextNumber = lastNumber + 1;
        }

        // Formatear el número con ceros a la izquierda (5 dígitos)
        const formattedNumber = nextNumber.toString().padStart(5, '0');
        
        // Generar el ID final
        const quoteId = `COTI${formattedNumber}-${dateStr}`;
        
        console.log(`📝 ID de cotización generado: ${quoteId}`);
        return quoteId;
    } catch (error) {
        console.error('Error generando ID de cotización:', error);
        // Fallback: usar timestamp como respaldo
        const timestamp = Date.now();
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        return `COTI${timestamp}-${dateStr}`;
    }
}

/**
 * Valida si un ID de cotización tiene el formato correcto
 * @param quoteId - El ID de cotización a validar
 * @returns boolean - True si el formato es válido
 */
export function validateQuoteId(quoteId: string): boolean {
    const pattern = /^COTI\d{5}-\d{8}$/;
    return pattern.test(quoteId);
}

/**
 * Extrae la fecha de un ID de cotización
 * @param quoteId - El ID de cotización
 * @returns string - La fecha en formato YYYY-MM-DD
 */
export function extractDateFromQuoteId(quoteId: string): string {
    const match = quoteId.match(/^COTI\d{5}-(\d{4})(\d{2})(\d{2})$/);
    if (match) {
        const [, year, month, day] = match;
        return `${year}-${month}-${day}`;
    }
    return '';
}

/**
 * Extrae el número correlativo de un ID de cotización
 * @param quoteId - El ID de cotización
 * @returns number - El número correlativo
 */
export function extractNumberFromQuoteId(quoteId: string): number {
    const match = quoteId.match(/^COTI(\d{5})-/);
    if (match) {
        return parseInt(match[1]);
    }
    return 0;
}

/**
 * Obtiene estadísticas de cotizaciones
 * @returns Promise<{total: number, lastNumber: number, todayCount: number}>
 */
export async function getQuoteStatistics(): Promise<{total: number, lastNumber: number, todayCount: number}> {
    try {
        // Obtener total de cotizaciones con número
        const { count: total, error: totalError } = await supabase
            .from('quotes')
            .select('*', { count: 'exact', head: true })
            .not('quote_number', 'is', null);

        if (totalError) throw totalError;

        // Obtener el último número de cotización
        const { data: lastQuote, error: lastError } = await supabase
            .from('quotes')
            .select('quote_number')
            .not('quote_number', 'is', null)
            .order('quote_number', { ascending: false })
            .limit(1);

        if (lastError) throw lastError;

        const lastNumber = lastQuote && lastQuote.length > 0 
            ? extractNumberFromQuoteId(lastQuote[0].quote_number)
            : 0;

        // Obtener cotizaciones de hoy (usando medianoche local en vez de UTC)
        const startOfTodayLocal = new Date();
        startOfTodayLocal.setHours(0, 0, 0, 0);
        const endOfTodayLocal = new Date();
        endOfTodayLocal.setHours(23, 59, 59, 999);

        const { count: todayCount, error: todayError } = await supabase
            .from('quotes')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startOfTodayLocal.toISOString())
            .lte('created_at', endOfTodayLocal.toISOString());

        if (todayError) throw todayError;

        return {
            total: total || 0,
            lastNumber,
            todayCount: todayCount || 0
        };
    } catch (error) {
        console.error('Error obteniendo estadísticas de cotizaciones:', error);
        return { total: 0, lastNumber: 0, todayCount: 0 };
    }
}

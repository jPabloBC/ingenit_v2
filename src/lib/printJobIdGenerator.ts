import { supabase } from './supabaseClient';

/**
 * Genera un ID correlativo para print jobs con el formato PRINT_001
 * @returns Promise<string> - El ID generado
 */
export async function generatePrintJobId(): Promise<string> {
    try {
        // Buscar el último nombre correlativo (PRINT_001, PRINT_002, ...)
        const { data: lastJob, error } = await supabase
            .from('rt_print_jobs')
            .select('name')
            .like('name', 'PRINT_%')
            .order('name', { ascending: false })
            .limit(1);

        if (error) {
            console.error('Error obteniendo último print job:', error);
            throw error;
        }

        let nextNumber = 1;
        if (lastJob && lastJob.length > 0) {
            // Extraer el número del último nombre (ej: PRINT_001 -> 1)
            const match = lastJob[0].name.match(/^PRINT_(\d{3})$/);
            if (match) {
                nextNumber = parseInt(match[1], 10) + 1;
            }
        }
        // Formatear el número con ceros a la izquierda (3 dígitos)
        const formattedNumber = nextNumber.toString().padStart(3, '0');
        return `PRINT_${formattedNumber}`;
    } catch (error) {
        console.error('Error generando ID de print job:', error);
        // Fallback: usar timestamp
        return `PRINT_${Date.now()}`;
    }
}

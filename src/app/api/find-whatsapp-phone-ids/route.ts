import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    console.log("🔍 === BUSCANDO PHONE IDs CORRECTOS ===");
    
    const whatsappToken = process.env.WHATSAPP_TOKEN;
    
    if (!whatsappToken) {
        return NextResponse.json({
            status: "error",
            message: "WhatsApp Token no configurado"
        }, { status: 500 });
    }
    
    // Números que necesitamos verificar
    const numbersToTest = [
        { number: '+56975385487', name: 'Principal' },
        { number: '+56990206618', name: 'Secundario' }
    ];
    
    // Phone IDs que vamos a probar (basados en patrones comunes)
    const phoneIdsToTest = [
        '731956903332850', // El que sabemos que funciona
        '731956903332851', // El que no funcionaba
        '731956903332852', // Posible variación
        '731956903332853', // Posible variación
        '731956903332854', // Posible variación
        '731956903332855', // Posible variación
        '731956903332856', // Posible variación
        '731956903332857', // Posible variación
        '731956903332858', // Posible variación
        '731956903332859', // Posible variación
    ];
    
    const results = [];
    
    for (const num of numbersToTest) {
        console.log(`📡 Probando número: ${num.number} (${num.name})`);
        
        const numberResults = [];
        
        for (const phoneId of phoneIdsToTest) {
            try {
                console.log(`   Probando Phone ID: ${phoneId}`);
                
                // Intentar obtener información del Phone ID
                const response = await fetch(`https://graph.facebook.com/v18.0/${phoneId}`, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${whatsappToken}`,
                    },
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    console.log(`   ✅ Phone ID ${phoneId} válido para ${num.number}`);
                    numberResults.push({
                        phoneId,
                        status: "valid",
                        data: data
                    });
                } else {
                    console.log(`   ❌ Phone ID ${phoneId} inválido: ${data.error?.message}`);
                    numberResults.push({
                        phoneId,
                        status: "invalid",
                        error: data.error?.message || "Error desconocido"
                    });
                }
                
                // Esperar un poco entre pruebas para no sobrecargar la API
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                console.error(`   ❌ Error probando ${phoneId}:`, error);
                numberResults.push({
                    phoneId,
                    status: "error",
                    error: error instanceof Error ? error.message : "Error de red"
                });
            }
        }
        
        results.push({
            number: num.number,
            name: num.name,
            phoneIds: numberResults
        });
    }
    
    return NextResponse.json({
        status: "completed",
        results,
        timestamp: new Date().toISOString()
    });
}









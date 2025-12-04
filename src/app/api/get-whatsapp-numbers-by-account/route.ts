import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    console.log("🔍 === OBTENIENDO NÚMEROS WHATSAPP POR CUENTA ===");
    
    const whatsappToken = process.env.WHATSAPP_TOKEN;
    
    if (!whatsappToken) {
        return NextResponse.json({
            status: "error",
            message: "WhatsApp Token no configurado"
        }, { status: 500 });
    }
    
    try {
        // Obtener las cuentas de Facebook Business
        const accountsResponse = await fetch(`https://graph.facebook.com/v18.0/me/accounts`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${whatsappToken}`,
            },
        });
        
        const accountsData = await accountsResponse.json();
        console.log("📥 Cuentas de Facebook Business:", accountsData);
        
        if (!accountsResponse.ok) {
            return NextResponse.json({
                status: "error",
                message: "Error obteniendo cuentas",
                error: accountsData.error?.message || "Error desconocido"
            }, { status: accountsResponse.status });
        }
        
        const results = [];
        
        // Para cada cuenta, obtener sus números de WhatsApp
        for (const account of accountsData.data) {
            console.log(`📡 Procesando cuenta: ${account.name} (${account.id})`);
            
            try {
                // Obtener números de WhatsApp de esta cuenta
                const phoneResponse = await fetch(`https://graph.facebook.com/v18.0/${account.id}/phone_numbers`, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${account.access_token}`,
                    },
                });
                
                const phoneData = await phoneResponse.json();
                console.log(`📥 Números de ${account.name}:`, phoneData);
                
                if (phoneResponse.ok && phoneData.data) {
                    results.push({
                        accountName: account.name,
                        accountId: account.id,
                        category: account.category,
                        phoneNumbers: phoneData.data,
                        accessToken: account.access_token.substring(0, 20) + "..." // Solo mostrar parte del token por seguridad
                    });
                } else {
                    results.push({
                        accountName: account.name,
                        accountId: account.id,
                        category: account.category,
                        phoneNumbers: [],
                        error: phoneData.error?.message || "No se pudieron obtener números",
                        accessToken: account.access_token.substring(0, 20) + "..."
                    });
                }
                
            } catch (error) {
                console.error(`❌ Error procesando cuenta ${account.name}:`, error);
                results.push({
                    accountName: account.name,
                    accountId: account.id,
                    category: account.category,
                    phoneNumbers: [],
                    error: error instanceof Error ? error.message : "Error de red",
                    accessToken: account.access_token.substring(0, 20) + "..."
                });
            }
        }
        
        return NextResponse.json({
            status: "success",
            accounts: results,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error("❌ Error:", error);
        
        return NextResponse.json({
            status: "error",
            message: "Error conectando con Facebook API",
            error: error instanceof Error ? error.message : "Error desconocido"
        }, { status: 500 });
    }
}









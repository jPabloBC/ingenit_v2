import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    console.log("📋 === LISTANDO NÚMEROS WHATSAPP ===");
    
    const whatsappToken = process.env.WHATSAPP_TOKEN;
    
    if (!whatsappToken) {
        return NextResponse.json({
            status: "error",
            message: "WhatsApp Token no configurado"
        }, { status: 500 });
    }
    
    try {
        // Obtener información de la cuenta de WhatsApp Business
        const response = await fetch(`https://graph.facebook.com/v18.0/me?fields=id,name,phone_numbers`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${whatsappToken}`,
            },
        });
        
        const data = await response.json();
        
        console.log("📥 Respuesta de la API:", data);
        
        if (response.ok) {
            return NextResponse.json({
                status: "success",
                accountInfo: {
                    id: data.id,
                    name: data.name
                },
                phoneNumbers: data.phone_numbers || [],
                timestamp: new Date().toISOString()
            });
        } else {
            return NextResponse.json({
                status: "error",
                message: "Error obteniendo información de la cuenta",
                error: data.error?.message || "Error desconocido",
                details: data
            }, { status: response.status });
        }
        
    } catch (error) {
        console.error("❌ Error:", error);
        
        return NextResponse.json({
            status: "error",
            message: "Error conectando con WhatsApp API",
            error: error instanceof Error ? error.message : "Error desconocido"
        }, { status: 500 });
    }
}









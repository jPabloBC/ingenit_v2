import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    console.log("🔍 === OBTENIENDO INFORMACIÓN DE CUENTA WHATSAPP ===");
    
    const whatsappToken = process.env.WHATSAPP_TOKEN;
    
    if (!whatsappToken) {
        return NextResponse.json({
            status: "error",
            message: "WhatsApp Token no configurado"
        }, { status: 500 });
    }
    
    try {
        // Obtener información básica de la cuenta
        const accountResponse = await fetch(`https://graph.facebook.com/v18.0/me`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${whatsappToken}`,
            },
        });
        
        const accountData = await accountResponse.json();
        console.log("📥 Información de cuenta:", accountData);
        
        if (!accountResponse.ok) {
            return NextResponse.json({
                status: "error",
                message: "Error obteniendo información de cuenta",
                error: accountData.error?.message || "Error desconocido"
            }, { status: accountResponse.status });
        }
        
        // Obtener información de la aplicación de WhatsApp Business
        const appResponse = await fetch(`https://graph.facebook.com/v18.0/me?fields=id,name,accounts`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${whatsappToken}`,
            },
        });
        
        const appData = await appResponse.json();
        console.log("📥 Información de aplicación:", appData);
        
        // Intentar obtener información de números de teléfono
        let phoneNumbers = [];
        try {
            const phoneResponse = await fetch(`https://graph.facebook.com/v18.0/${accountData.id}/phone_numbers`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${whatsappToken}`,
                },
            });
            
            const phoneData = await phoneResponse.json();
            console.log("📥 Información de números:", phoneData);
            
            if (phoneResponse.ok && phoneData.data) {
                phoneNumbers = phoneData.data;
            }
        } catch (phoneError) {
            console.log("⚠️ No se pudieron obtener los números de teléfono:", phoneError);
        }
        
        // Intentar obtener información de la cuenta de WhatsApp Business
        let whatsappAccount = null;
        try {
            const whatsappResponse = await fetch(`https://graph.facebook.com/v18.0/${accountData.id}?fields=id,name,phone_numbers`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${whatsappToken}`,
                },
            });
            
            const whatsappData = await whatsappResponse.json();
            console.log("📥 Información de WhatsApp Business:", whatsappData);
            
            if (whatsappResponse.ok) {
                whatsappAccount = whatsappData;
            }
        } catch (whatsappError) {
            console.log("⚠️ No se pudo obtener información de WhatsApp Business:", whatsappError);
        }
        
        return NextResponse.json({
            status: "success",
            accountInfo: {
                id: accountData.id,
                name: accountData.name
            },
            appInfo: appData,
            phoneNumbers,
            whatsappAccount,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error("❌ Error:", error);
        
        return NextResponse.json({
            status: "error",
            message: "Error conectando con WhatsApp API",
            error: error instanceof Error ? error.message : "Error desconocido"
        }, { status: 500 });
    }
}









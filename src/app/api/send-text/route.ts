import { NextRequest, NextResponse } from "next/server";

// Definir un tipo para la respuesta exitosa de la API de WhatsApp
type WhatsAppApiResponse = {
    messaging_product: string;
    to: string;
    type: string;
    text: { body: string };
};

// Definir un tipo para los posibles errores de la API de WhatsApp
type WhatsAppErrorResponse = {
    error: { message: string };
};

export async function POST(req: NextRequest) {
    const { from, message, phoneId, businessAccountId } = await req.json();

    // Verificación de parámetros
    if (!message) {
        return NextResponse.json({ error: "Missing 'message' parameter" }, { status: 400 });
    }

    try {
        // Determinar qué phone ID usar
        const phoneNumberId = phoneId || process.env.WHATSAPP_PHONE_NUMBER_ID;
        const whatsappToken = process.env.WHATSAPP_TOKEN;
        
        console.log(`📡 Enviando mensaje desde phone ID: ${phoneNumberId}`);
        console.log(`📡 Número de origen: ${from || 'default'}`);
        
        // Solicitar a la API de WhatsApp
        const res = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${whatsappToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                to: message.startsWith("+") ? message : `+${message}`,
                type: "text",
                text: { body: message },
            }),
        });

        const data: WhatsAppApiResponse | WhatsAppErrorResponse = await res.json();

        // Verificar si la respuesta fue exitosa
        if (!res.ok) {
            console.error(`�� WhatsApp API Error: Status Code ${res.status}`, data);
            if ((data as WhatsAppErrorResponse).error) {
                throw new Error(`API Error: ${(data as WhatsAppErrorResponse).error.message}`);
            } else {
                throw new Error("Unknown error");
            }
        }

        return NextResponse.json({ status: "sent", data });
    } catch (error: unknown) {
        // Verificar si el error es del tipo esperado
        if (error instanceof Error) {
            console.error("❌ Error al enviar mensaje:", error.message);
            return NextResponse.json({ status: "error", error: error.message }, { status: 500 });
        }
        console.error("❌ Error desconocido:", error);
        return NextResponse.json({ status: "error", error: "Unknown error" }, { status: 500 });
    }
}

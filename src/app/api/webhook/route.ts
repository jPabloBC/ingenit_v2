import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    // const BLOCK_SPAM_NUMBER = "+923328401820";

    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
        return new Response(challenge, { status: 200 });
    }

    return new Response("Forbidden", { status: 403 });
}

    export async function POST(req: NextRequest) {
        const body = await req.json();
        console.log("📩 Webhook recibido:", JSON.stringify(body, null, 2));

        const value = body?.entry?.[0]?.changes?.[0]?.value;
        const msgList = value?.messages || [];
        const sender = msgList[0]?.from || "";
        const normalizedSender = sender.startsWith("+") ? sender : `+${sender}`;
        const to = value?.metadata?.display_phone_number;
        
        console.log(`📞 Mensaje de ${normalizedSender} a número ${to}`);
        console.log(`🔍 Metadata completa:`, JSON.stringify(value?.metadata, null, 2));

        // 🚫 BLOQUEAR IMAGENES DE NÚMERO BLOQUEADO
        if (normalizedSender === "+923328401820" && msgList[0]?.type === "image") {
            console.log(`⛔ Ignorado mensaje con imagen desde ${normalizedSender} (bloqueado)`);
            return NextResponse.json({ status: "blocked image spam" });
        }

        if (to === "56937570007") {
            // Para MT - funciona tanto en desarrollo como en producción
            console.log(`➡️ Reenviando a MT desde número ${to}:`, JSON.stringify(body, null, 2));
            try {
                // Usar URL base configurada o detectar automáticamente
                const mtBaseUrl = process.env.MT_BASE_URL || 
                                 (process.env.NODE_ENV === 'production' ? 'https://mt.ingenit.cl' : 'http://localhost:3001');
                
                console.log(`🌐 Usando URL base MT: ${mtBaseUrl}`);
                
                const response = await fetch(`${mtBaseUrl}/api/webhook`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });
                
                console.log(`✅ Reenviado a MT - Status: ${response.status}`);
                return NextResponse.json({ status: "forwarded to mt.ingenit" });
            } catch (error) {
                console.error(`❌ Error reenviando a MT:`, error);
                return NextResponse.json({ status: "error forwarding to mt.ingenit" }, { status: 500 });
            }
        }

        // Manejar ambos números de WhatsApp Business
        // +56975385487 (Principal) y +56990206618 (Secundario)
        if (to === "56975385487" || to === "56990206618") {
            console.log(`➡️ Reenviando a INGENIT desde número ${to}:`, JSON.stringify(body, null, 2));
            try {
                // Usar URL base configurada o detectar automáticamente
                const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                               (process.env.NODE_ENV === 'production' ? 'https://ingenit.cl' : 'http://localhost:3000');
                
                console.log(`🌐 Usando URL base: ${baseUrl}`);
                
                const response = await fetch(`${baseUrl}/api/webhook-ingenit`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });
                
                console.log(`✅ Reenviado a INGENIT - Status: ${response.status}`);
                return NextResponse.json({ status: "forwarded to ingenit" });
            } catch (error) {
                console.error(`❌ Error reenviando a INGENIT:`, error);
                return NextResponse.json({ status: "error forwarding to ingenit" }, { status: 500 });
            }
        }

    console.log(`❌ No hay handler configurado para el número ${to}`);
    return NextResponse.json({ status: "no handler for this number" });
}


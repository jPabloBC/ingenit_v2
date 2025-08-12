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
            // Para producción, este número debe ir a mt.ingenit.cl
            try {
                const response = await fetch("https://mt.ingenit.cl/api/webhook", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });
                console.log(`✅ Reenviado a mt.ingenit.cl - Status: ${response.status}`);
                return NextResponse.json({ status: "forwarded to mt.ingenit" });
            } catch (error) {
                console.error(`❌ Error reenviando a mt.ingenit.cl:`, error);
                return NextResponse.json({ status: "error forwarding to mt.ingenit" }, { status: 500 });
            }
        }

        // Manejar ambos números de WhatsApp Business
        // +56975385487 (Principal) y +56990206618 (Secundario)
        if (to === "56975385487" || to === "56990206618") {
            console.log(`➡️ Reenviando a INGENIT desde número ${to}:`, JSON.stringify(body, null, 2));
            try {
                const response = await fetch("http://localhost:3000/api/webhook-ingenit", {
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


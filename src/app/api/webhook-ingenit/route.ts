import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ========================================
// WEBHOOK INGENIT - MANEJO DE MENSAJES DE WHATSAPP
// ========================================
// 
// Este webhook maneja mensajes de ambos números de WhatsApp Business:
// - +56975385487 (Principal)
// - +56990206618 (Secundario)
//
// Los mensajes se guardan en la tabla 'messages' de Supabase
// y se pueden ver en el chat admin en tiempo real
//
// ========================================

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    export async function POST(req: NextRequest) {
        console.log("🟡 INGENIT - endpoint alcanzado");

    const body = await req.json();
    console.log("🟢 Webhook recibido en INGENIT:", JSON.stringify(body, null, 2));

    const value = body?.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];
    const from = `+${message?.from}`;
    const to = value?.metadata?.display_phone_number?.startsWith("+")
        ? value?.metadata?.display_phone_number
        : `+${value?.metadata?.display_phone_number}`;
    const type = message?.type;
    const timestamp = message?.timestamp;
    
    console.log(`📱 Mensaje de ${from} a ${to} (tipo: ${type})`);

    if (!from || !type) return NextResponse.json({ error: "Invalid message" });

    // Validar que el mensaje viene de uno de nuestros números de WhatsApp
    const validNumbers = ["+56975385487", "+56990206618"];
    if (!validNumbers.includes(to)) {
        console.log(`⚠️ Mensaje recibido de número no configurado: ${to}`);
        return NextResponse.json({ status: "unknown_number" });
    }

    console.log(`✅ Mensaje válido de ${from} a ${to}`);

    let content = "";
    let mediaUrl = "";
    let mediaId = "";

    switch (type) {
        case "text":
        content = message.text?.body || "";
        break;

        case "image":
        case "audio":
        case "video":
        case "document":
        mediaId = message[type]?.id;
        mediaUrl = `https://graph.facebook.com/v18.0/${mediaId}`;
        content = `[${type.toUpperCase()}]`;
        break;

        default:
        content = `[UNSUPPORTED: ${type}]`;
    }

    const messageData = {
        from_number: from,
        to_number: to,
        type,
        sender: "client",
        content,
        media_url: mediaUrl,
        media_id: mediaId,
        media_type: ["image", "audio", "video", "document"].includes(type) ? type : null,
        timestamp: new Date(parseInt(timestamp) * 1000).toISOString(),
        direction: "in",
        whatsapp_number: to // Comentado temporalmente hasta que se agregue la columna
    };

    console.log(`💾 Guardando mensaje en BD:`, {
        from: from,
        to: to,
        type: type,
        content: content.substring(0, 50) + (content.length > 50 ? "..." : "")
    });

    const result = await supabase.from("messages").insert(messageData);

    if (result.error) {
        console.error("❌ Supabase insert error:", result.error.message);
        return NextResponse.json({ status: "db_error", error: result.error.message });
    }

    console.log(`✅ Mensaje guardado exitosamente en BD`);
    return NextResponse.json({ status: "ok" });
}

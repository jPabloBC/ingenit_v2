import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { downloadAndUploadMedia } from "@/lib/whatsappMedia";

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

// Función para verificar si es un nuevo contacto y enviar alerta
// Ahora recibe el timestamp del mensaje entrante y busca mensajes
// estrictamente anteriores a ese timestamp para evitar contar la fila
// que acabamos de insertar.
async function checkAndNotifyNewContact(from: string, to: string, incomingTimestampIso?: string) {
    try {
        console.log(`🔍 Verificando si ${from} es un nuevo contacto para ${to}`);
        
        // Verificar si ya existe un mensaje anterior a este contacto
        // Si se nos entregó incomingTimestampIso, solo contamos mensajes previos a esa fecha
        const query = supabase
            .from("rt_messages")
            .select("id, timestamp")
            .eq("from_number", from)
            .eq("whatsapp_number", to)
            .order("timestamp", { ascending: false });

        let existingMessagesResult;
        if (incomingTimestampIso) {
            existingMessagesResult = await query.lt('timestamp', incomingTimestampIso).limit(5);
        } else {
            existingMessagesResult = await query.limit(5);
        }

        const { data: existingMessages, error: checkError } = existingMessagesResult as any;

        if (checkError) {
            console.error("❌ Error verificando mensajes existentes:", checkError);
            return;
        }

        const found = existingMessages?.length || 0;
        console.log(`📊 Mensajes previos encontrados para ${from}: ${found}`);

        if (found === 0) {
            console.log(`🆕 Nuevo contacto detectado: ${from} (sin mensajes previos)`);
            await sendNewContactAlert(from, to);
        } else {
            // Existe al menos un mensaje previo; verificar diferencia de tiempo
            try {
                const lastPrevIso = existingMessages[0].timestamp;
                console.log(`📅 Último mensaje previo: ${lastPrevIso}`);
                if (incomingTimestampIso) {
                    const incomingMs = new Date(incomingTimestampIso).getTime();
                    const prevMs = new Date(lastPrevIso).getTime();
                    const diffMs = incomingMs - prevMs;
                    const diffHours = diffMs / (1000 * 60 * 60);
                    console.log(`⏱️ Tiempo desde último mensaje: ${diffHours.toFixed(2)} horas`);
                    if (diffHours >= 2) {
                        console.log(`🕒 Han pasado >=2 horas desde el último mensaje — enviando alerta para ${from}`);
                        await sendNewContactAlert(from, to);
                    } else {
                        console.log(`⏳ Menos de 2 horas desde el último mensaje — no se envía alerta para ${from}`);
                    }
                } else {
                    console.log('⚠️ incomingTimestampIso no disponible — no se puede evaluar ventana de 2 horas; no se enviará alerta por seguridad');
                }
            } catch (timeErr) {
                console.error('❌ Error evaluando ventana de 2 horas:', timeErr);
            }
        }
    } catch (error) {
        console.error("❌ Error en checkAndNotifyNewContact:", error);
    }
}

// Función para enviar alerta de nuevo contacto por email
async function sendNewContactAlert(contactPhone: string, whatsappNumber: string) {
    try {
        // Enviar alerta usando el endpoint específico
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                       (process.env.NODE_ENV === 'production' ? 'https://ingenit.cl' : 'http://localhost:3000');
        
        const response = await fetch(`${baseUrl}/api/send-whatsapp-alert`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contactPhone,
                whatsappNumber
            })
        });

        // Log response status and body to help debugging SMTP/endpoint issues
        try {
            const text = await response.text();
            if (response.ok) {
                console.log('✅ Alerta de nuevo contacto enviada por email', { status: response.status, body: text });
            } else {
                console.error('❌ Error enviando alerta de nuevo contacto', { status: response.status, body: text });
            }
        } catch (err) {
            console.error('❌ Error leyendo respuesta de send-whatsapp-alert:', err);
        }

    } catch (error) {
        console.error('❌ Error en sendNewContactAlert:', error);
    }
}

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
    let storagePath = "";

    switch (type) {
        case "text":
            content = message.text?.body || "";
            break;
        case "image":
        case "audio":
        case "video":
        case "document": {
            mediaId = message[type]?.id;
            mediaUrl = `https://graph.facebook.com/v18.0/${mediaId}`;
            content = `[${type.toUpperCase()}]`;
            // Descargar y subir a Supabase Storage
            const accessToken = process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || "";
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
            const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
            if (mediaUrl && mediaId && accessToken) {
                // Eliminar el + del número para la carpeta
                const contactFolder = from; // Mantener el + en la carpeta
                storagePath = await downloadAndUploadMedia({
                    mediaUrl,
                    mediaId,
                    type,
                    contactNumber: contactFolder,
                    supabaseUrl,
                    supabaseServiceKey,
                    accessToken
                }) || "";
                if (storagePath) {
                    mediaUrl = `${supabaseUrl}/storage/v1/object/public/ingenit/${storagePath}`;
                }
            }
            break;
        }
        case "sticker":
            mediaId = message.sticker?.id;
            mediaUrl = `https://graph.facebook.com/v18.0/${mediaId}`;
            content = `[STICKER]`;
            break;
        case "location":
            content = `[LOCATION] Lat: ${message.location?.latitude}, Lng: ${message.location?.longitude}`;
            break;
        case "contacts":
            content = `[CONTACTS] ${JSON.stringify(message.contacts)}`;
            break;
        case "button":
            content = `[BUTTON] ${message.button?.text || ''}`;
            break;
        case "interactive":
            content = `[INTERACTIVE] ${JSON.stringify(message.interactive)}`;
            break;
        default:
            content = `[UNSUPPORTED: ${type}]`;
    }

    // Preparar datos del mensaje (mantener compatibilidad: insertar media_url/media_type/storage_path cuando estén disponibles)
    const messageData = {
        from_number: from,
        to_number: to,
        type,
        sender: "client",
        content,
        media_url: mediaUrl || null,
        media_id: mediaId || null,
        media_type: ["image", "audio", "video", "document"].includes(type) ? type : null,
        storage_path: storagePath || null,
        timestamp: new Date(parseInt(timestamp) * 1000).toISOString(),
        direction: "in",
        whatsapp_number: to,
        app_id: "f6afc182-3e8e-43a8-810d-d47509e7c8e1"
    };

    console.log(`📋 Datos a insertar:`, JSON.stringify(messageData, null, 2));

    console.log(`💾 Guardando mensaje en BD:`, {
        from: from,
        to: to,
        type: type,
        content: content.substring(0, 50) + (content.length > 50 ? "..." : "")
    });

    const result = await supabase.from("rt_messages").insert(messageData);

    console.log(`📊 Resultado completo:`, JSON.stringify(result, null, 2));

    if (result.error) {
        console.error("❌ Supabase insert error:", result.error);
        return NextResponse.json({ status: "db_error", error: result.error });
    }

    console.log(`✅ Mensaje guardado exitosamente en BD`);
    
    // Verificar si es un nuevo contacto y enviar alerta
    try {
        // Pasar el timestamp del mensaje entrante (ISO) para excluir la fila recién insertada
        await checkAndNotifyNewContact(from, to, message ? new Date(parseInt(timestamp) * 1000).toISOString() : undefined);
    } catch (error) {
        console.warn("⚠️ Error verificando nuevo contacto:", error);
    }
    
    return NextResponse.json({ status: "ok" });
}

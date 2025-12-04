import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const { to, media_url, media_type, phoneId, businessAccountId, filename, caption } = await req.json();

    let type;
    if (media_type === "image" || media_type === "video" || media_type === "audio" || media_type === "document") {
        type = media_type;
    } else {
        return NextResponse.json({ error: "Invalid media type" }, { status: 400 });
    }

    // Allow overriding the phone number id when caller provides one (so media is sent from correct number)
    const phoneNumberId = phoneId || process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!phoneNumberId) {
        return NextResponse.json({ error: 'Missing WHATSAPP_PHONE_NUMBER_ID' }, { status: 500 });
    }

    const payload: any = {
        messaging_product: 'whatsapp',
        to,
        type,
        [type]: {
            link: media_url,
        }
    };
    if (caption) payload[type].caption = caption;

    const res = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
        console.error("Error sending media:", data);
        return NextResponse.json({ error: "Failed to send media" }, { status: 500 });
    }

    return NextResponse.json({ status: "sent", data });
}

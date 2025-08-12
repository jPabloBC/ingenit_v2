import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const { to, media_url, media_type } = await req.json();

    let type;
    if (media_type === "image" || media_type === "video" || media_type === "audio" || media_type === "document") {
        type = media_type;
    } else {
        return NextResponse.json({ error: "Invalid media type" }, { status: 400 });
    }

    const res = await fetch(`https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
        method: "POST",
        headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
        },
        body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type,
        [type]: {
            link: media_url,
        },
        }),
    });

    const data = await res.json();

    if (!res.ok) {
        console.error("Error sending media:", data);
        return NextResponse.json({ error: "Failed to send media" }, { status: 500 });
    }

    return NextResponse.json({ status: "sent", data });
}

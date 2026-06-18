import { type NextRequest, NextResponse } from "next/server";

type MediaType = "image" | "video" | "audio" | "document";
type SendMediaPayload = {
	to?: string;
	media_url?: string;
	media_type?: MediaType;
	phoneId?: string;
	caption?: string;
};

type WhatsAppMessagePayload = {
	messaging_product: "whatsapp";
	to: string;
	type: MediaType;
	image?: { link: string; caption?: string };
	video?: { link: string; caption?: string };
	audio?: { link: string; caption?: string };
	document?: { link: string; caption?: string };
};

export async function POST(req: NextRequest) {
	const { to, media_url, media_type, phoneId, caption } =
		(await req.json()) as SendMediaPayload;

	if (!to || !media_url) {
		return NextResponse.json(
			{ error: "Missing required fields: to or media_url" },
			{ status: 400 },
		);
	}

	if (
		media_type !== "image" &&
		media_type !== "video" &&
		media_type !== "audio" &&
		media_type !== "document"
	) {
		return NextResponse.json({ error: "Invalid media type" }, { status: 400 });
	}
	const type: MediaType = media_type;

	// Allow overriding the phone number id when caller provides one (so media is sent from correct number)
	const phoneNumberId = phoneId || process.env.WHATSAPP_PHONE_NUMBER_ID;

	if (!phoneNumberId) {
		return NextResponse.json(
			{ error: "Missing WHATSAPP_PHONE_NUMBER_ID" },
			{ status: 500 },
		);
	}

	const payload: WhatsAppMessagePayload = {
		messaging_product: "whatsapp",
		to,
		type,
		[type]: {
			link: media_url,
		},
	};
	if (caption && payload[type]) payload[type].caption = caption;

	const res = await fetch(
		`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		},
	);

	const data = await res.json();

	if (!res.ok) {
		console.error("Error sending media:", data);
		return NextResponse.json(
			{ error: "Failed to send media" },
			{ status: 500 },
		);
	}

	return NextResponse.json({ status: "sent", data });
}

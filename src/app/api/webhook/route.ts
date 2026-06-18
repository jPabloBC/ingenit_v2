import { type NextRequest, NextResponse } from "next/server";
import { processIngenitWebhookBody } from "@/lib/ingenitWebhookProcessor";
import {
	getWhatsappRoutingConfig,
	isConfiguredWhatsappNumber,
	normalizeWhatsappNumberForComparison,
} from "@/lib/whatsappRouting";

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

	const entries = Array.isArray(body?.entry) ? body.entry : [];
	const { ingenitNumbers } = getWhatsappRoutingConfig();
	console.log("⚙️ Números INGENIT habilitados:", ingenitNumbers);

	let processed = 0;
	let ignored = 0;

	for (const entry of entries) {
		const changes = Array.isArray(entry?.changes) ? entry.changes : [];
		for (const change of changes) {
			const value = change?.value;
			if (!value) {
				ignored++;
				continue;
			}

			const msgList = value?.messages || [];
			const sender = msgList[0]?.from || "";
			const normalizedSender = sender
				? sender.startsWith("+")
					? sender
					: `+${sender}`
				: "";
			const to = normalizeWhatsappNumberForComparison(
				value?.metadata?.display_phone_number,
			);

			console.log(
				`📞 Mensaje de ${normalizedSender || "[status/evento]"} a número ${to}`,
			);
			console.log(
				`🔍 Metadata completa:`,
				JSON.stringify(value?.metadata, null, 2),
			);

			if (
				normalizedSender === "+923328401820" &&
				msgList[0]?.type === "image"
			) {
				console.log(
					`⛔ Ignorado mensaje con imagen desde ${normalizedSender} (bloqueado)`,
				);
				ignored++;
				continue;
			}

			if (!isConfiguredWhatsappNumber(to, ingenitNumbers)) {
				console.log(`❌ No hay handler configurado para el número ${to}`);
				ignored++;
				continue;
			}

			const singleChangeBody = {
				object: body?.object,
				entry: [{ ...entry, changes: [change] }],
			};

			console.log(`➡️ Procesando en INGENIT desde número ${to}`);
			await processIngenitWebhookBody(singleChangeBody);
			processed++;
		}
	}

	return NextResponse.json({ status: "ok", processed, ignored });
}

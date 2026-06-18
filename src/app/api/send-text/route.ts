import { type NextRequest, NextResponse } from "next/server";

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
	const { from, message, text, to, phoneId, businessAccountId } =
		await req.json();

	// Verificación de parámetros - aceptar tanto 'message' como 'text'
	const messageContent = message || text;
	const recipientNumber = to || messageContent;

	console.log("🚀 === INICIO ENVÍO DE MENSAJE ===");
	console.log("📋 Parámetros recibidos:", {
		from,
		message,
		text,
		to,
		phoneId,
		businessAccountId,
	});
	console.log("📝 Contenido del mensaje:", messageContent);
	console.log("📞 Número destinatario:", recipientNumber);

	if (!messageContent) {
		console.error("❌ Error: Falta contenido del mensaje");
		return NextResponse.json(
			{ error: "Missing 'message' or 'text' parameter" },
			{ status: 400 },
		);
	}

	if (!recipientNumber) {
		console.error("❌ Error: Falta número destinatario");
		return NextResponse.json(
			{ error: "Missing recipient number ('to' parameter)" },
			{ status: 400 },
		);
	}

	try {
		// Determinar qué phone ID usar
		const phoneNumberId = phoneId || process.env.WHATSAPP_PHONE_NUMBER_ID;
		const whatsappToken = process.env.WHATSAPP_TOKEN;

		console.log("🔧 Configuración:");
		console.log(`   - Phone ID: ${phoneNumberId}`);
		console.log(`   - Token disponible: ${whatsappToken ? "SÍ" : "NO"}`);
		console.log(`   - Número de origen: ${from || "default"}`);
		console.log(`   - Número destinatario: ${recipientNumber}`);

		if (!phoneNumberId) {
			console.error("❌ Error: No se encontró WHATSAPP_PHONE_NUMBER_ID");
			return NextResponse.json(
				{ error: "WhatsApp Phone Number ID not configured" },
				{ status: 500 },
			);
		}

		if (!whatsappToken) {
			console.error("❌ Error: No se encontró WHATSAPP_TOKEN");
			return NextResponse.json(
				{ error: "WhatsApp Token not configured" },
				{ status: 500 },
			);
		}

		// Normalizar el número de teléfono
		let normalizedNumber = recipientNumber;
		if (!normalizedNumber.startsWith("+")) {
			normalizedNumber = `+${normalizedNumber}`;
		}

		// Remover espacios y caracteres especiales
		normalizedNumber = normalizedNumber
			.replace(/\s+/g, "")
			.replace(/[^\d+]/g, "");

		console.log(`📡 Enviando mensaje:`);
		console.log(`   - Desde phone ID: ${phoneNumberId}`);
		console.log(`   - A número: ${normalizedNumber}`);
		console.log(`   - Contenido: ${messageContent}`);

		const requestBody = {
			messaging_product: "whatsapp",
			to: normalizedNumber,
			type: "text",
			text: { body: messageContent },
		};

		console.log("📤 Request body:", JSON.stringify(requestBody, null, 2));

		// Solicitar a la API de WhatsApp
		const res = await fetch(
			`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${whatsappToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(requestBody),
			},
		);

		console.log(`📥 Respuesta de WhatsApp API:`);
		console.log(`   - Status: ${res.status}`);
		console.log(`   - Status Text: ${res.statusText}`);

		const data: WhatsAppApiResponse | WhatsAppErrorResponse = await res.json();
		console.log("📥 Response data:", JSON.stringify(data, null, 2));

		// Verificar si la respuesta fue exitosa
		if (!res.ok) {
			console.error(`❌ WhatsApp API Error: Status Code ${res.status}`, data);
			if ((data as WhatsAppErrorResponse).error) {
				const errorMessage = `API Error: ${(data as WhatsAppErrorResponse).error.message}`;
				console.error("❌ Error específico:", errorMessage);
				return NextResponse.json(
					{ status: "error", error: errorMessage },
					{ status: res.status },
				);
			} else {
				console.error("❌ Error desconocido de la API");
				return NextResponse.json(
					{ status: "error", error: "Unknown API error" },
					{ status: res.status },
				);
			}
		}

		console.log("✅ Mensaje enviado exitosamente");
		console.log("🚀 === FIN ENVÍO DE MENSAJE ===");

		return NextResponse.json({ status: "sent", data });
	} catch (error: unknown) {
		console.error("❌ === ERROR EN ENVÍO ===");

		// Verificar si el error es del tipo esperado
		if (error instanceof Error) {
			console.error("❌ Error al enviar mensaje:", error.message);
			console.error("❌ Stack trace:", error.stack);
			return NextResponse.json(
				{ status: "error", error: error.message },
				{ status: 500 },
			);
		}

		console.error("❌ Error desconocido:", error);
		return NextResponse.json(
			{ status: "error", error: "Unknown error" },
			{ status: 500 },
		);
	}
}

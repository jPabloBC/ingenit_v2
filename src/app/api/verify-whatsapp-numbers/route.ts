import { type NextRequest, NextResponse } from "next/server";

type PhoneInfo = {
	id?: string;
	phone_number?: string;
	verified_name?: string;
	code_verification_status?: string;
	quality_rating?: string;
};

export async function GET(_req: NextRequest) {
	console.log("🔍 === VERIFICACIÓN DE NÚMEROS WHATSAPP ===");

	const whatsappToken = process.env.WHATSAPP_TOKEN;

	if (!whatsappToken) {
		return NextResponse.json(
			{
				status: "error",
				message: "WhatsApp Token no configurado",
			},
			{ status: 500 },
		);
	}

	// Números que necesitamos verificar
	const numbersToVerify = [
		{ number: "+56975385487", name: "Principal" },
		{ number: "+56990206618", name: "Secundario" },
		{ number: "+56937570007", name: "MT" },
	];

	const results = [];

	for (const num of numbersToVerify) {
		try {
			console.log(`📡 Verificando número: ${num.number} (${num.name})`);

			// Intentar obtener información del número
			const response = await fetch(
				`https://graph.facebook.com/v18.0/me/phone_numbers`,
				{
					method: "GET",
					headers: {
						Authorization: `Bearer ${whatsappToken}`,
					},
				},
			);

			const data = await response.json();

			console.log(`📥 Respuesta para ${num.number}:`, data);

			if (response.ok && Array.isArray(data.data)) {
				// Buscar el número específico en la respuesta
				const phoneInfo = (data.data as PhoneInfo[]).find(
					(phone) =>
						phone.phone_number === num.number ||
						phone.phone_number === num.number.replace("+", ""),
				);

				if (phoneInfo) {
					results.push({
						number: num.number,
						name: num.name,
						status: "found",
						phoneId: phoneInfo.id,
						verifiedName: phoneInfo.verified_name,
						codeVerificationStatus: phoneInfo.code_verification_status,
						qualityRating: phoneInfo.quality_rating,
					});
				} else {
					results.push({
						number: num.number,
						name: num.name,
						status: "not_found",
						error: "Número no encontrado en la cuenta",
					});
				}
			} else {
				results.push({
					number: num.number,
					name: num.name,
					status: "error",
					error: data.error?.message || "Error en la API",
				});
			}
		} catch (error) {
			console.error(`❌ Error verificando ${num.number}:`, error);
			results.push({
				number: num.number,
				name: num.name,
				status: "error",
				error: error instanceof Error ? error.message : "Error desconocido",
			});
		}
	}

	return NextResponse.json({
		status: "success",
		results,
		timestamp: new Date().toISOString(),
	});
}

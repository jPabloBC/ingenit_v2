import { type NextRequest, NextResponse } from "next/server";
import { sendWhatsappAlertEmail } from "@/lib/sendWhatsappAlertEmail";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
	try {
		const { contactPhone, whatsappNumber } = await request.json();

		console.log("📧 Enviando alerta de nuevo mensaje WhatsApp:", {
			contactPhone,
			whatsappNumber,
		});

		const info = await sendWhatsappAlertEmail({
			contactPhone,
			whatsappNumber,
			requestBaseUrl: new URL(request.url).origin,
		});

		console.log("✅ Alerta de nuevo mensaje enviada:", info.messageId);

		return NextResponse.json({
			success: true,
			messageId: info.messageId,
			message: "Alerta de nuevo mensaje enviada exitosamente",
		});
	} catch (error) {
		console.error("❌ Error enviando alerta de WhatsApp:", error);

		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Error desconocido",
			},
			{ status: 500 },
		);
	}
}

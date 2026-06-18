import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendWhatsappAlertEmail } from "@/lib/sendWhatsappAlertEmail";
import { downloadAndUploadMedia } from "@/lib/whatsappMedia";
import {
	getWhatsappRoutingConfig,
	isConfiguredWhatsappNumber,
	normalizeWhatsappNumberForComparison,
} from "@/lib/whatsappRouting";

const MENU_FLOW_TARGET_NUMBER = "+56937570007";
const MENU_FLOW_TARGET_PHONE_ID = "560424903813462";
const MENU_BTN_SEND = "menu_send";
const MENU_BTN_RATE = "menu_rate";
const MENU_BTN_AGENT = "menu_agent";
const MENU_BTN_SEND_WHATSAPP = "menu_send_whatsapp";
const MENU_BTN_SEND_WEBAPP = "menu_send_webapp";
const MENU_BTN_BACK_MAIN = "menu_back_main";
const MENU_BTN_RATE_CALC = "menu_rate_calc";
const MENU_BTN_RATE_CLP_TO_BOB = "menu_rate_clp_bob";
const MENU_BTN_RATE_BOB_TO_CLP = "menu_rate_bob_clp";
const MENU_BTN_END = "menu_end";
const MENU_BTN_DEST_BOLIVIA = "menu_dest_bolivia";
const MENU_BTN_DEST_CHILE = "menu_dest_chile";
const MENU_BTN_PAY_CAJAVECINA = "menu_pay_cajavecina";
const MENU_BTN_PAY_TRANSFER = "menu_pay_transfer";
const MENU_BTN_PAY_QR = "menu_pay_qr";
const MENU_BTN_RECEIVE_QR = "menu_receive_qr";
const MENU_BTN_RECEIVE_TRANSFER = "menu_receive_transfer";
const MENU_BTN_TX_CONFIRM = "menu_tx_confirm";
const MENU_BTN_TX_CANCEL = "menu_tx_cancel";
const MENU_BTN_ACC_TYPE_CORRIENTE = "menu_acc_type_corriente";
const MENU_BTN_ACC_TYPE_RUT = "menu_acc_type_rut";
const MENU_BTN_ACC_TYPE_MORE = "menu_acc_type_more";
const MENU_BTN_ACC_TYPE_VISTA = "menu_acc_type_vista";
const MENU_BTN_ACC_TYPE_AHORRO = "menu_acc_type_ahorro";
const MENU_BTN_ACC_TYPE_CHEQUERA = "menu_acc_type_chequera";
const MENU_BTN_ACC_TYPE_CAJA_AHORRO = "menu_acc_type_caja_ahorro";
const MENU_BTN_ACC_TYPE_BACK = "menu_acc_type_back";
const MENU_BTN_ACC_TYPE_TIGO = "menu_acc_type_tigo";
const MENU_BTN_FLOW_CONTINUE = "menu_flow_continue";
const MENU_BTN_FLOW_RESTART = "menu_flow_restart";
const CHILE_QR_IMAGE_URL =
	"https://juupotamdjqzpxuqdtco.supabase.co/storage/v1/object/sign/mt_ingenit/public_QR/bnb.jpeg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9hZjQ4NGRkOS0zZDMzLTRlYTMtYTZhZi03NTc3ZTk0ODI0ZDQiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtdF9pbmdlbml0L3B1YmxpY19RUi9ibmIuanBlZyIsImlhdCI6MTc3MzI0MDA3NSwiZXhwIjoxODA0Nzc2MDc1fQ.4pR7K3a-OQdv8Jhn5JTsHf-UXehTS8Pb5MPW22R6-JU";

type PendingRateCalculationMode = "CLP_TO_BOB" | "BOB_TO_CLP";
const pendingRateCalculationByContact = new Map<
	string,
	PendingRateCalculationMode
>();

type SendFlowStep =
	| "sender_name"
	| "sender_document"
	| "sender_payment"
	| "recipient_name"
	| "recipient_document"
	| "recipient_receive"
	| "recipient_bank_name"
	| "recipient_account_type"
	| "recipient_account_number"
	| "recipient_qr_file"
	| "amount"
	| "confirm";

type SendFlowState = {
	destination: "bolivia" | "chile";
	step: SendFlowStep;
	senderName?: string;
	senderDocument?: string;
	senderPaymentMethod?: string;
	recipientName?: string;
	recipientDocument?: string;
	recipientReceiveMethod?: string;
	recipientBankName?: string;
	recipientAccountType?: string;
	recipientAccountNumber?: string;
	recipientQrReceived?: boolean;
	recipientQrUrl?: string | null;
	amountClp?: number;
	convertedBob?: number;
	amountBob?: number;
	convertedClp?: number;
};

const sendFlowByContact = new Map<string, SendFlowState>();
const invalidFlowInputCountByContact = new Map<string, number>();
const shortBurstReplyCooldownByContact = new Map<string, number>();
const SHORT_BURST_WINDOW_MINUTES = 2;
const SHORT_BURST_REPLY_COOLDOWN_MS = 90 * 1000;

type IncomingButtonSelection = { id: string; title: string };

type WebhookMessage = {
	type?: string;
	from?: string;
	timestamp?: string;
	text?: { body?: string };
	image?: { id?: string; url?: string };
	audio?: { id?: string; url?: string };
	video?: { id?: string; url?: string };
	document?: { id?: string; url?: string };
	sticker?: { id?: string };
	location?: { latitude?: number; longitude?: number };
	contacts?: unknown;
	button?: { text?: string };
	interactive?: {
		type?: string;
		button_reply?: {
			id?: string;
			title?: string;
		};
		list_reply?: {
			id?: string;
			title?: string;
		};
	};
};

type WebhookValue = {
	metadata?: {
		display_phone_number?: string;
		phone_number_id?: string;
	};
	messages?: WebhookMessage[];
	statuses?: Array<{ status?: string }>;
	contacts?: unknown[];
};

type WebhookBody = {
	entry?: Array<{
		changes?: Array<{
			value?: WebhookValue;
		}>;
	}>;
};

function getRequiredEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

const supabase = createClient(
	getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
	process.env.SUPABASE_SERVICE_ROLE_KEY ||
		getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
);

async function sendNewContactAlert(
	contactPhone: string,
	whatsappNumber: string,
) {
	try {
		const info = await sendWhatsappAlertEmail({ contactPhone, whatsappNumber });
		console.log("✅ Alerta de nuevo mensaje enviada por email", {
			contactPhone,
			whatsappNumber,
			messageId: info.messageId,
		});
	} catch (error) {
		console.error("❌ Error en sendNewContactAlert:", error);
	}
}

async function checkAndNotifyNewContact(from: string, to: string) {
	try {
		const { data: recentMessages, error: checkError } = await supabase
			.from("rt_messages")
			.select("id, timestamp")
			.eq("from_number", from)
			.eq("whatsapp_number", to)
			.eq("direction", "in")
			.order("timestamp", { ascending: false })
			.limit(2);
		if (checkError) {
			console.error("❌ Error verificando mensajes existentes:", checkError);
			return;
		}

		const found = recentMessages?.length || 0;
		console.log("🔎 checkAndNotifyNewContact()", {
			from,
			to,
			found,
			recentMessages,
			rule: "first_incoming_or_recontact_after_2h",
		});

		if (found <= 1) {
			console.log("📧 Regla alerta: primer mensaje entrante");
			await sendNewContactAlert(from, to);
			return;
		}

		const latestIso = recentMessages[0]?.timestamp;
		const previousIso = recentMessages[1]?.timestamp;
		if (!latestIso || !previousIso) {
			console.log(
				"⏭️ Alerta no enviada: no hay suficientes mensajes para comparar",
			);
			return;
		}

		const latestMs = new Date(latestIso).getTime();
		const previousMs = new Date(previousIso).getTime();
		const diffHours = (latestMs - previousMs) / (1000 * 60 * 60);

		console.log("🔎 checkAndNotifyNewContact diff", {
			latestIso,
			previousIso,
			diffHours,
		});

		if (diffHours >= 2) {
			console.log("📧 Regla alerta: nuevo mensaje tras intervalo >= 2h");
			await sendNewContactAlert(from, to);
			return;
		}

		console.log("⏭️ Alerta no enviada: mensaje dentro de ventana < 2h");
	} catch (error) {
		console.error("❌ Error en checkAndNotifyNewContact:", error);
	}
}

function normalizeWaIdForCompare(value: string | null | undefined) {
	if (!value) return "";
	const trimmed = String(value).trim();
	if (!trimmed) return "";
	return trimmed.startsWith("+") ? trimmed : `+${trimmed}`;
}

function extractContactProfileName(
	value: unknown,
	from: string,
): string | null {
	const payload = (value || {}) as Record<string, unknown>;
	const contacts = Array.isArray(payload.contacts) ? payload.contacts : [];
	const normalizedFrom = normalizeWaIdForCompare(from);
	for (const contact of contacts) {
		const c = (contact || {}) as Record<string, unknown>;
		const profile = (c.profile || {}) as Record<string, unknown>;
		const waId = normalizeWaIdForCompare(
			typeof c.wa_id === "string" ? c.wa_id : null,
		);
		const profileName =
			typeof profile.name === "string" ? profile.name.trim() : "";
		if (waId && waId === normalizedFrom && profileName) {
			return profileName;
		}
	}
	for (const contact of contacts) {
		const c = (contact || {}) as Record<string, unknown>;
		const profile = (c.profile || {}) as Record<string, unknown>;
		const profileName =
			typeof profile.name === "string" ? profile.name.trim() : "";
		if (profileName) return profileName;
	}
	return null;
}

async function sendWhatsAppApiMessage(
	phoneNumberId: string,
	payload: Record<string, unknown>,
) {
	const token =
		process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || "";
	if (!token) {
		console.error("❌ WHATSAPP_TOKEN no configurado para flujo de menú.");
		return { ok: false as const, error: "missing_token" };
	}

	try {
		const res = await fetch(
			`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			},
		);
		const data = await res.json().catch(() => ({}));
		if (!res.ok) {
			console.error("❌ Error enviando mensaje WhatsApp API", {
				status: res.status,
				data,
			});
			return { ok: false as const, error: data };
		}
		return { ok: true as const, data };
	} catch (error) {
		console.error("❌ Error de red enviando mensaje WhatsApp API", error);
		return { ok: false as const, error };
	}
}

async function insertOutgoingRtMessage(params: {
	fromNumber: string;
	toNumber: string;
	type: string;
	content: string;
	mediaUrl?: string | null;
	mediaType?: "image" | "audio" | "video" | "document" | null;
}) {
	const {
		fromNumber,
		toNumber,
		type,
		content,
		mediaUrl = null,
		mediaType = null,
	} = params;
	const row = {
		from_number: fromNumber,
		to_number: toNumber,
		type,
		sender: "admin",
		content,
		media_url: mediaUrl,
		media_id: null,
		media_type: mediaType,
		storage_path: null,
		timestamp: new Date().toISOString(),
		direction: "out",
		whatsapp_number: fromNumber,
		app_id: "f6afc182-3e8e-43a8-810d-d47509e7c8e1",
	};

	const { error } = await supabase.from("rt_messages").insert(row);
	if (error) {
		console.error(
			"❌ Error guardando mensaje saliente automático en rt_messages:",
			error,
		);
	}
}

async function sendMenuButtonsFor560424(contactNumber: string) {
	const menuText =
		"Hola, ¿qué necesitas hoy?\n• Hacer un envío\n• Tipo de Cambio\n• Chatear con agente";
	const result = await sendWhatsAppApiMessage(MENU_FLOW_TARGET_PHONE_ID, {
		messaging_product: "whatsapp",
		to: contactNumber,
		type: "interactive",
		interactive: {
			type: "button",
			body: {
				text: "Hola, ¿qué necesitas hoy?",
			},
			action: {
				buttons: [
					{
						type: "reply",
						reply: { id: MENU_BTN_SEND, title: "Hacer un envío" },
					},
					{
						type: "reply",
						reply: { id: MENU_BTN_RATE, title: "Tipo de Cambio" },
					},
					{
						type: "reply",
						reply: { id: MENU_BTN_AGENT, title: "Chatear con agente" },
					},
				],
			},
		},
	});

	if (result.ok) {
		await insertOutgoingRtMessage({
			fromNumber: MENU_FLOW_TARGET_NUMBER,
			toNumber: contactNumber,
			type: "interactive",
			content: menuText,
		});
	}

	return result;
}

function clearFlowStateForContact(contactNumber: string) {
	sendFlowByContact.delete(contactNumber);
	pendingRateCalculationByContact.delete(contactNumber);
	invalidFlowInputCountByContact.delete(contactNumber);
}

function incrementInvalidFlowInputCount(contactNumber: string) {
	const next = (invalidFlowInputCountByContact.get(contactNumber) || 0) + 1;
	invalidFlowInputCountByContact.set(contactNumber, next);
	return next;
}

function resetInvalidFlowInputCount(contactNumber: string) {
	invalidFlowInputCountByContact.delete(contactNumber);
}

async function sendFlowRecoveryButtons560424(
	contactNumber: string,
	messageText: string,
) {
	const result = await sendWhatsAppApiMessage(MENU_FLOW_TARGET_PHONE_ID, {
		messaging_product: "whatsapp",
		to: contactNumber,
		type: "interactive",
		interactive: {
			type: "button",
			body: { text: messageText },
			action: {
				buttons: [
					{
						type: "reply",
						reply: { id: MENU_BTN_FLOW_CONTINUE, title: "Continuar flujo" },
					},
					{
						type: "reply",
						reply: { id: MENU_BTN_FLOW_RESTART, title: "Reiniciar flujo" },
					},
				],
			},
		},
	});

	if (result.ok) {
		await insertOutgoingRtMessage({
			fromNumber: MENU_FLOW_TARGET_NUMBER,
			toNumber: contactNumber,
			type: "interactive",
			content: `${messageText}\n\n• Continuar flujo\n• Reiniciar flujo`,
		});
	}
	return result;
}

function getSendStepGuidanceText(
	step: SendFlowStep,
	destination: "bolivia" | "chile",
) {
	switch (step) {
		case "sender_name":
			return "Seguimos en tu flujo actual. Ingresa tu nombre completo.";
		case "sender_document":
			return "Seguimos en tu flujo actual. Ingresa tu documento de identidad (RUT/CI).";
		case "sender_payment":
			return "Seguimos en tu flujo actual. Selecciona tu forma de envío usando los botones.";
		case "recipient_name":
			return "Seguimos en tu flujo actual. Ingresa el nombre completo de tu destinatario.";
		case "recipient_document":
			return "Seguimos en tu flujo actual. Ingresa el documento de identidad de tu destinatario (RUT/CI).";
		case "recipient_receive":
			return destination === "bolivia"
				? "Seguimos en tu flujo actual. Selecciona cómo recibirá el dinero tu destinatario (QR o Transferencia)."
				: "Seguimos en tu flujo actual. Selecciona cómo recibirá el dinero tu destinatario.";
		case "recipient_bank_name":
			return "Seguimos en tu flujo actual. Ingresa el nombre del banco de tu destinatario.";
		case "recipient_account_type":
			return "Seguimos en tu flujo actual. Selecciona el tipo de cuenta de tu destinatario.";
		case "recipient_account_number":
			return "Seguimos en tu flujo actual. Ingresa el número de cuenta de tu destinatario (solo números).";
		case "recipient_qr_file":
			return "Seguimos en tu flujo actual. Envía el archivo QR en imagen o PDF.";
		case "amount":
			return destination === "chile"
				? "Seguimos en tu flujo actual. Ingresa cuánto enviarás (solo números enteros en BOB)."
				: "Seguimos en tu flujo actual. Ingresa cuánto enviarás (solo números enteros en CLP).";
		case "confirm":
			return "Seguimos en tu flujo actual. Confirma la operación usando los botones: Aceptar o Cancelar.";
		default:
			return "Seguimos en tu flujo actual. Completa el dato solicitado.";
	}
}

async function sendContinuePromptForCurrentFlow560424(contactNumber: string) {
	const activeSendFlow = sendFlowByContact.get(contactNumber);
	if (activeSendFlow) {
		if (activeSendFlow.step === "sender_payment") {
			await sendSenderPaymentButtons560424(
				contactNumber,
				activeSendFlow.destination,
			);
			return;
		}
		if (activeSendFlow.step === "recipient_receive") {
			await sendRecipientReceiveButtons560424(
				contactNumber,
				activeSendFlow.destination,
			);
			return;
		}
		if (activeSendFlow.step === "recipient_account_type") {
			await sendRecipientAccountTypeButtons560424(
				contactNumber,
				activeSendFlow.destination,
				1,
			);
			return;
		}
		await sendAndStoreText560424(
			contactNumber,
			getSendStepGuidanceText(activeSendFlow.step, activeSendFlow.destination),
		);
		return;
	}

	const pendingMode = pendingRateCalculationByContact.get(contactNumber);
	if (pendingMode === "CLP_TO_BOB") {
		await sendAndStoreText560424(
			contactNumber,
			"Seguimos en tu cálculo actual. Escribe cuántos pesos chilenos quieres convertir a bolivianos (ingresa solo números enteros).",
		);
		return;
	}
	if (pendingMode === "BOB_TO_CLP") {
		await sendAndStoreText560424(
			contactNumber,
			"Seguimos en tu cálculo actual. Escribe cuántos bolivianos quieres convertir a pesos chilenos (ingresa solo números enteros).",
		);
		return;
	}

	await sendMenuButtonsFor560424(contactNumber);
}

function isSelectionAllowedForSendStep(
	selectionId: string,
	flow: SendFlowState,
): boolean {
	const commonAllowed = new Set([
		MENU_BTN_TX_CANCEL,
		MENU_BTN_FLOW_CONTINUE,
		MENU_BTN_FLOW_RESTART,
	]);
	if (commonAllowed.has(selectionId)) return true;

	if (flow.step === "sender_payment") {
		const senderPaymentAllowed =
			flow.destination === "chile"
				? new Set([MENU_BTN_PAY_QR, MENU_BTN_PAY_TRANSFER])
				: new Set([MENU_BTN_PAY_CAJAVECINA, MENU_BTN_PAY_TRANSFER]);
		return senderPaymentAllowed.has(selectionId);
	}

	if (flow.step === "recipient_receive") {
		return (
			selectionId === MENU_BTN_RECEIVE_QR ||
			selectionId === MENU_BTN_RECEIVE_TRANSFER
		);
	}

	if (flow.step === "recipient_account_type") {
		return [
			MENU_BTN_ACC_TYPE_CORRIENTE,
			MENU_BTN_ACC_TYPE_RUT,
			MENU_BTN_ACC_TYPE_MORE,
			MENU_BTN_ACC_TYPE_VISTA,
			MENU_BTN_ACC_TYPE_AHORRO,
			MENU_BTN_ACC_TYPE_CHEQUERA,
			MENU_BTN_ACC_TYPE_CAJA_AHORRO,
			MENU_BTN_ACC_TYPE_BACK,
			MENU_BTN_ACC_TYPE_TIGO,
		].includes(selectionId);
	}

	if (flow.step === "confirm") {
		return selectionId === MENU_BTN_TX_CONFIRM;
	}

	// En pasos de texto/archivo no se aceptan botones de otros submenús
	return false;
}

async function sendShippingSubmenuButtons560424(contactNumber: string) {
	const submenuText =
		"¿Cómo prefieres hacer el envío?\n• Enviar por WhatsApp\n• Enviar por la WebApp\n• Volver al menú";
	const result = await sendWhatsAppApiMessage(MENU_FLOW_TARGET_PHONE_ID, {
		messaging_product: "whatsapp",
		to: contactNumber,
		type: "interactive",
		interactive: {
			type: "button",
			body: {
				text: "¿Cómo prefieres hacer el envío?",
			},
			action: {
				buttons: [
					{
						type: "reply",
						reply: { id: MENU_BTN_SEND_WHATSAPP, title: "Enviar por WhatsApp" },
					},
					{
						type: "reply",
						reply: { id: MENU_BTN_SEND_WEBAPP, title: "Enviar por la WebApp" },
					},
					{
						type: "reply",
						reply: { id: MENU_BTN_BACK_MAIN, title: "Volver al menú" },
					},
				],
			},
		},
	});

	if (result.ok) {
		await insertOutgoingRtMessage({
			fromNumber: MENU_FLOW_TARGET_NUMBER,
			toNumber: contactNumber,
			type: "interactive",
			content: submenuText,
		});
	}

	return result;
}

async function sendDestinationButtons560424(contactNumber: string) {
	const text = "¿A dónde quieres enviar?";
	const result = await sendWhatsAppApiMessage(MENU_FLOW_TARGET_PHONE_ID, {
		messaging_product: "whatsapp",
		to: contactNumber,
		type: "interactive",
		interactive: {
			type: "button",
			body: { text },
			action: {
				buttons: [
					{
						type: "reply",
						reply: { id: MENU_BTN_DEST_BOLIVIA, title: "Bolivia" },
					},
					{
						type: "reply",
						reply: { id: MENU_BTN_DEST_CHILE, title: "Chile" },
					},
					{
						type: "reply",
						reply: { id: MENU_BTN_BACK_MAIN, title: "Volver al menú" },
					},
				],
			},
		},
	});

	if (result.ok) {
		await insertOutgoingRtMessage({
			fromNumber: MENU_FLOW_TARGET_NUMBER,
			toNumber: contactNumber,
			type: "interactive",
			content: `${text}\n\n• Bolivia\n• Chile\n• Volver al menú`,
		});
	}

	return result;
}

async function sendSenderPaymentButtons560424(
	contactNumber: string,
	destination: "bolivia" | "chile",
) {
	const text = "Selecciona tu forma de envío.";
	const isChile = destination === "chile";
	const result = await sendWhatsAppApiMessage(MENU_FLOW_TARGET_PHONE_ID, {
		messaging_product: "whatsapp",
		to: contactNumber,
		type: "interactive",
		interactive: {
			type: "button",
			body: { text },
			action: {
				buttons: [
					{
						type: "reply",
						reply: {
							id: isChile ? MENU_BTN_PAY_QR : MENU_BTN_PAY_CAJAVECINA,
							title: isChile ? "QR" : "Caja Vecina",
						},
					},
					{
						type: "reply",
						reply: { id: MENU_BTN_PAY_TRANSFER, title: "Transferencia" },
					},
					{
						type: "reply",
						reply: { id: MENU_BTN_TX_CANCEL, title: "Cancelar" },
					},
				],
			},
		},
	});
	if (result.ok) {
		await insertOutgoingRtMessage({
			fromNumber: MENU_FLOW_TARGET_NUMBER,
			toNumber: contactNumber,
			type: "interactive",
			content: isChile
				? `${text}\n\n• QR\n• Transferencia\n• Cancelar`
				: `${text}\n\n• Caja Vecina\n• Transferencia\n• Cancelar`,
		});
	}
	return result;
}

async function sendRecipientReceiveButtons560424(
	contactNumber: string,
	_destination: "bolivia" | "chile",
) {
	const text = "Selecciona cómo recibirá el dinero tu destinatario.";
	const result = await sendWhatsAppApiMessage(MENU_FLOW_TARGET_PHONE_ID, {
		messaging_product: "whatsapp",
		to: contactNumber,
		type: "interactive",
		interactive: {
			type: "button",
			body: { text },
			action: {
				buttons: [
					{
						type: "reply",
						reply: { id: MENU_BTN_RECEIVE_QR, title: "QR" },
					},
					{
						type: "reply",
						reply: { id: MENU_BTN_RECEIVE_TRANSFER, title: "Transferencia" },
					},
					{
						type: "reply",
						reply: { id: MENU_BTN_TX_CANCEL, title: "Cancelar" },
					},
				],
			},
		},
	});
	if (result.ok) {
		await insertOutgoingRtMessage({
			fromNumber: MENU_FLOW_TARGET_NUMBER,
			toNumber: contactNumber,
			type: "interactive",
			content: `${text}\n\n• QR\n• Transferencia\n• Cancelar`,
		});
	}
	return result;
}

async function sendTransactionConfirmationButtons560424(
	contactNumber: string,
	summary: string,
) {
	const result = await sendWhatsAppApiMessage(MENU_FLOW_TARGET_PHONE_ID, {
		messaging_product: "whatsapp",
		to: contactNumber,
		type: "interactive",
		interactive: {
			type: "button",
			body: { text: summary },
			action: {
				buttons: [
					{
						type: "reply",
						reply: { id: MENU_BTN_TX_CONFIRM, title: "Aceptar" },
					},
					{
						type: "reply",
						reply: { id: MENU_BTN_TX_CANCEL, title: "Cancelar" },
					},
				],
			},
		},
	});
	if (result.ok) {
		await insertOutgoingRtMessage({
			fromNumber: MENU_FLOW_TARGET_NUMBER,
			toNumber: contactNumber,
			type: "interactive",
			content: `${summary}\n\n• Aceptar\n• Cancelar`,
		});
	}
	return result;
}

async function sendAndStoreText560424(contactNumber: string, text: string) {
	const sent = await sendWhatsAppApiMessage(MENU_FLOW_TARGET_PHONE_ID, {
		messaging_product: "whatsapp",
		to: contactNumber,
		type: "text",
		text: { body: text },
	});
	if (sent.ok) {
		await insertOutgoingRtMessage({
			fromNumber: MENU_FLOW_TARGET_NUMBER,
			toNumber: contactNumber,
			type: "text",
			content: text,
		});
	}
	return sent;
}

async function sendAndStoreImage560424(
	contactNumber: string,
	imageUrl: string,
	caption?: string,
) {
	const sent = await sendWhatsAppApiMessage(MENU_FLOW_TARGET_PHONE_ID, {
		messaging_product: "whatsapp",
		to: contactNumber,
		type: "image",
		image: {
			link: imageUrl,
			...(caption ? { caption } : {}),
		},
	});

	if (sent.ok) {
		await insertOutgoingRtMessage({
			fromNumber: MENU_FLOW_TARGET_NUMBER,
			toNumber: contactNumber,
			type: "image",
			content: caption || "[IMAGE]",
			mediaUrl: imageUrl,
			mediaType: "image",
		});
	}

	return sent;
}

async function sendPaymentInstructionsAfterTracking560424(
	contactNumber: string,
	flow: SendFlowState,
) {
	if (flow.destination === "bolivia") {
		if (flow.senderPaymentMethod === "Caja Vecina") {
			await sendAndStoreText560424(
				contactNumber,
				"Datos para pago por Caja Vecina:\n" +
					"Nombre: INGENIT SpA\n" +
					"Tipo de Cuenta: Chequera Electrónica / Vista\n" +
					"Número de Cuenta: 2573422701\n" +
					"RUT: 78.000.171-2",
			);
			return;
		}

		if (flow.senderPaymentMethod === "Transferencia Bancaria") {
			await sendAndStoreText560424(
				contactNumber,
				"Datos para pago por Transferencia:\n" +
					"Nombre: INGENIT SpA\n" +
					"RUT: 78.000.171-2\n" +
					"Correo: envios@ingenit.cl\n\n" +
					"Banco: BancoEstado\n" +
					"Tipo de Cuenta: Chequera Electrónica / Vista\n" +
					"Número de Cuenta: 2573422701\n\n" +
					"Mercado Pago\n" +
					"Tipo de Cuenta: Vista\n" +
					"Número de Cuenta: 1024047361",
			);
			return;
		}
		return;
	}

	if (flow.destination === "chile") {
		if (flow.senderPaymentMethod === "QR") {
			await sendAndStoreImage560424(
				contactNumber,
				CHILE_QR_IMAGE_URL,
				"QR para acreditar el envío",
			);
			return;
		}

		if (flow.senderPaymentMethod === "Transferencia Bancaria") {
			await sendAndStoreText560424(
				contactNumber,
				"Datos para pago por Transferencia:\n" +
					"Banco Nacional de Bolivia (BNB)\n" +
					"Tipo de cuenta: Caja de Ahorro\n" +
					"Número de Cuenta: 1570066826\n" +
					"Nombre: Juan Pablo Bernal Castro\n" +
					"Correo: envios@ingenit.cl",
			);
			return;
		}
	}
}

async function fetchCurrentExchangeRates() {
	const serviceUrl =
		process.env.MT_CURRENCY_SERVICE_URL ||
		(process.env.MT_BASE_URL
			? `${process.env.MT_BASE_URL.replace(/\/$/, "")}/api/currencyService`
			: "") ||
		"https://mt.ingenit.cl/api/currencyService";

	try {
		const res = await fetch(serviceUrl, {
			method: "GET",
			headers: { Accept: "application/json" },
			cache: "no-store",
		});
		if (!res.ok) {
			console.error("❌ currencyService respondió error", {
				status: res.status,
				serviceUrl,
			});
			return null;
		}
		const data = (await res.json()) as { CLPtoBOB?: number; BOBtoCLP?: number };
		const clpToBob = Number(data?.CLPtoBOB);
		const bobToClp = Number(data?.BOBtoCLP);
		if (
			!Number.isFinite(clpToBob) ||
			!Number.isFinite(bobToClp) ||
			clpToBob <= 0 ||
			bobToClp <= 0
		) {
			console.error("❌ currencyService devolvió datos inválidos", { data });
			return null;
		}
		return { clpToBob, bobToClp };
	} catch (error) {
		console.error("❌ Error consultando currencyService", {
			serviceUrl,
			error,
		});
		return null;
	}
}

async function sendBothRatesAndBackButton560424(contactNumber: string) {
	const rates = await fetchCurrentExchangeRates();
	if (!rates) {
		return sendAndStoreText560424(
			contactNumber,
			"No pudimos obtener el tipo de cambio en este momento. Intenta nuevamente en unos minutos.",
		);
	}

	const referenceClpAmount = 1000;
	const referenceBobAmount = 10;
	const clpToBobForReference = rates.clpToBob * referenceClpAmount;
	const bobToClpForReference = rates.bobToClp * referenceBobAmount;

	const clpToBobText = clpToBobForReference.toLocaleString("es-CL", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
	const bobToClpText = bobToClpForReference.toLocaleString("es-CL", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	});

	const messageText =
		`Tipo de cambio actual\n\n` +
		`Pesos Chilenos a Bolivianos: ${clpToBobText} BOB\n` +
		`Pesos Bolivianos a Chilenos: ${bobToClpText} CLP`;

	const result = await sendWhatsAppApiMessage(MENU_FLOW_TARGET_PHONE_ID, {
		messaging_product: "whatsapp",
		to: contactNumber,
		type: "interactive",
		interactive: {
			type: "button",
			body: { text: messageText },
			action: {
				buttons: [
					{
						type: "reply",
						reply: { id: MENU_BTN_RATE_CALC, title: "Hacer cálculo" },
					},
					{
						type: "reply",
						reply: { id: MENU_BTN_BACK_MAIN, title: "Volver al menú" },
					},
				],
			},
		},
	});

	if (result.ok) {
		await insertOutgoingRtMessage({
			fromNumber: MENU_FLOW_TARGET_NUMBER,
			toNumber: contactNumber,
			type: "interactive",
			content: `${messageText}\n\n• Hacer cálculo\n• Volver al menú`,
		});
	}

	return result;
}

async function sendRateCalcTypeButtons560424(contactNumber: string) {
	const messageText = "¿Qué cálculo quieres hacer?";
	const result = await sendWhatsAppApiMessage(MENU_FLOW_TARGET_PHONE_ID, {
		messaging_product: "whatsapp",
		to: contactNumber,
		type: "interactive",
		interactive: {
			type: "button",
			body: { text: messageText },
			action: {
				buttons: [
					{
						type: "reply",
						reply: { id: MENU_BTN_RATE_CLP_TO_BOB, title: "CLP a BOB" },
					},
					{
						type: "reply",
						reply: { id: MENU_BTN_RATE_BOB_TO_CLP, title: "BOB a CLP" },
					},
					{
						type: "reply",
						reply: { id: MENU_BTN_BACK_MAIN, title: "Volver al menú" },
					},
				],
			},
		},
	});

	if (result.ok) {
		await insertOutgoingRtMessage({
			fromNumber: MENU_FLOW_TARGET_NUMBER,
			toNumber: contactNumber,
			type: "interactive",
			content: `${messageText}\n\n• CLP a BOB\n• BOB a CLP\n• Volver al menú`,
		});
	}

	return result;
}

async function sendCalcResultActions560424(
	contactNumber: string,
	resultText: string,
) {
	const result = await sendWhatsAppApiMessage(MENU_FLOW_TARGET_PHONE_ID, {
		messaging_product: "whatsapp",
		to: contactNumber,
		type: "interactive",
		interactive: {
			type: "button",
			body: { text: resultText },
			action: {
				buttons: [
					{
						type: "reply",
						reply: { id: MENU_BTN_SEND, title: "Hacer un envío" },
					},
					{
						type: "reply",
						reply: { id: MENU_BTN_RATE_CALC, title: "Hacer nuevo cálculo" },
					},
					{
						type: "reply",
						reply: { id: MENU_BTN_END, title: "Terminar" },
					},
				],
			},
		},
	});

	if (result.ok) {
		await insertOutgoingRtMessage({
			fromNumber: MENU_FLOW_TARGET_NUMBER,
			toNumber: contactNumber,
			type: "interactive",
			content: `${resultText}\n\n• Hacer un envío\n• Hacer nuevo cálculo\n• Terminar`,
		});
	}

	return result;
}

async function sendRecipientAccountTypeButtons560424(
	contactNumber: string,
	destination: "bolivia" | "chile",
	page: 1 | 2 = 1,
) {
	const bodyText =
		page === 1
			? "Selecciona el tipo de cuenta de tu destinatario."
			: "Más tipos de cuenta:";

	const buttons: Array<{ id: string; title: string }> =
		destination === "chile"
			? page === 1
				? [
						{ id: MENU_BTN_ACC_TYPE_CORRIENTE, title: "Cuenta Corriente" },
						{ id: MENU_BTN_ACC_TYPE_RUT, title: "Cuenta RUT" },
						{ id: MENU_BTN_ACC_TYPE_MORE, title: "Más opciones" },
					]
				: [
						{ id: MENU_BTN_ACC_TYPE_VISTA, title: "Cuenta Vista" },
						{ id: MENU_BTN_ACC_TYPE_AHORRO, title: "Cuenta Ahorro" },
						{ id: MENU_BTN_ACC_TYPE_CHEQUERA, title: "Chequera Electrónica" },
					]
			: [
					{ id: MENU_BTN_ACC_TYPE_CORRIENTE, title: "Cuenta Corriente" },
					{ id: MENU_BTN_ACC_TYPE_CAJA_AHORRO, title: "Caja de Ahorro" },
					{ id: MENU_BTN_TX_CANCEL, title: "Cancelar" },
				];

	const result = await sendWhatsAppApiMessage(MENU_FLOW_TARGET_PHONE_ID, {
		messaging_product: "whatsapp",
		to: contactNumber,
		type: "interactive",
		interactive: {
			type: "button",
			body: { text: bodyText },
			action: {
				buttons: buttons.map((b) => ({ type: "reply", reply: b })),
			},
		},
	});

	if (result.ok) {
		await insertOutgoingRtMessage({
			fromNumber: MENU_FLOW_TARGET_NUMBER,
			toNumber: contactNumber,
			type: "interactive",
			content: `${bodyText}\n\n${buttons.map((b) => `• ${b.title}`).join("\n")}`,
		});
	}

	return result;
}

function parseIntegerAmount(input: string): number | null {
	const raw = input.trim();
	if (!raw) return null;

	// Solo enteros. Permitimos separadores de miles: espacio, punto o coma.
	const isPlainInteger = /^\d+$/.test(raw);
	const isGroupedInteger = /^\d{1,3}([., ]\d{3})+$/.test(raw);
	if (!isPlainInteger && !isGroupedInteger) return null;

	const normalized = raw.replace(/[., ]/g, "");
	if (!/^\d+$/.test(normalized)) return null;

	const value = Number.parseInt(normalized, 10);
	if (!Number.isFinite(value) || value <= 0) return null;
	return value;
}

function normalizeBOBValue(value: number): number {
	const abs = Math.abs(value);
	return abs < 1000 ? Math.floor(value) : Math.round(value);
}

function isValidFullName(input: string): boolean {
	const normalized = input.trim().replace(/\s+/g, " ");
	if (!normalized || normalized.length < 5) return false;
	const parts = normalized.split(" ").filter(Boolean);
	if (parts.length < 2) return false;
	return parts.every(
		(part) => /^[a-záéíóúñü]+$/i.test(part) && part.length >= 2,
	);
}

function isValidIdentityDocument(input: string): boolean {
	const normalized = input.trim().toUpperCase().replace(/\s+/g, "");
	if (!normalized) return false;
	if (/^\d{1,2}\.?\d{3}\.?\d{3}-[\dK]$/.test(normalized)) return true; // RUT
	if (/^\d{7,8}-[\dK]$/.test(normalized)) return true; // RUT simple
	if (/^\d{6,12}$/.test(normalized)) return true; // CI
	return false;
}

function computeRutDv(rutBody: string): string {
	let sum = 0;
	let multiplier = 2;
	for (let i = rutBody.length - 1; i >= 0; i -= 1) {
		sum += Number(rutBody[i]) * multiplier;
		multiplier = multiplier === 7 ? 2 : multiplier + 1;
	}
	const remainder = 11 - (sum % 11);
	if (remainder === 11) return "0";
	if (remainder === 10) return "K";
	return String(remainder);
}

function formatRut(rutBody: string, dv: string): string {
	const body = rutBody.replace(/^0+/, "") || "0";
	const bodyWithDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
	return `${bodyWithDots}-${dv.toUpperCase()}`;
}

function getIdentityDocumentForSummary(input: string | undefined): string {
	const raw = String(input || "").trim();
	if (!raw) return "-";

	const compact = raw.toUpperCase().replace(/[\s.]/g, "");
	const withoutHyphen = compact.replace(/-/g, "");

	// RUT sin guión: 254151025
	if (/^\d{8,9}$/.test(withoutHyphen)) {
		const rutBody = withoutHyphen.slice(0, -1);
		const inputDv = withoutHyphen.slice(-1).toUpperCase();
		const expectedDv = computeRutDv(rutBody);
		if (inputDv === expectedDv) {
			return formatRut(rutBody, inputDv);
		}
		return withoutHyphen.replace(/\D/g, "");
	}

	// RUT con guión: 25415102-5
	const rutMatch = compact.match(/^(\d{7,8})-?([\dK])$/i);
	if (rutMatch) {
		const rutBody = rutMatch[1];
		const inputDv = rutMatch[2].toUpperCase();
		const expectedDv = computeRutDv(rutBody);
		if (inputDv === expectedDv) {
			return formatRut(rutBody, inputDv);
		}
		return compact.replace(/\D/g, "");
	}

	const digits = compact.replace(/\D/g, "");
	if (digits) return digits;
	return raw;
}

function getIdentityDocumentForStorage(
	input: string | undefined,
): string | null {
	const normalized = getIdentityDocumentForSummary(input);
	if (!normalized || normalized === "-") return null;
	return normalized;
}

function toTitleCaseName(input: string): string {
	return input
		.trim()
		.toLowerCase()
		.split(/\s+/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

function isTigoLikeBankInput(input: string): boolean {
	const normalized = input
		.trim()
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]/g, "");
	return normalized.includes("tigo");
}

function normalizeE164Like(phone: string): string {
	const digits = String(phone || "").replace(/\D/g, "");
	if (!digits) return "";
	return digits.startsWith("56") ? `+${digits}` : `+56${digits}`;
}

function generateWaTransactionId(): string {
	return `wa-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function adaptiveInsertReturningId(
	table: string,
	payload: Record<string, unknown>,
	idColumn = "id",
): Promise<string | null> {
	const draft: Record<string, unknown> = { ...payload };
	const maxAttempts = 40;

	for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
		const { data, error } = await supabase
			.from(table)
			.insert(draft)
			.select(idColumn)
			.single();
		if (!error) {
			const id =
				data && typeof data === "object" && !Array.isArray(data)
					? (data as Record<string, unknown>)[idColumn]
					: null;
			return id ? String(id) : "CREATED_NO_ID";
		}

		const errorText = `${error.message || ""} ${error.details || ""}`.trim();

		const missingColumnMatch =
			errorText.match(/column ["']?([a-zA-Z0-9_]+)["']?.*does not exist/i) ||
			errorText.match(/Could not find the ['"]([a-zA-Z0-9_]+)['"] column/i);
		if (missingColumnMatch?.[1]) {
			delete draft[missingColumnMatch[1]];
			continue;
		}

		const notNullMatch = errorText.match(
			/null value in column ["']?([a-zA-Z0-9_]+)["']?.*violates not-null/i,
		);
		if (notNullMatch?.[1]) {
			const column = notNullMatch[1];
			if (
				column in draft &&
				draft[column] !== null &&
				draft[column] !== undefined &&
				draft[column] !== ""
			) {
				console.error(`❌ Not-null persistente en ${table}`, {
					error,
					draft,
					attempt,
				});
				return null;
			}
			if (column === "status") draft[column] = "Pendiente";
			else if (column === "created_at" || column === "updated_at")
				draft[column] = new Date().toISOString();
			else if (column.toLowerCase().includes("email"))
				draft[column] = "webhook@ingenit.cl";
			else if (column.toLowerCase().includes("phone"))
				draft[column] = "+56900000000";
			else if (column.toLowerCase().includes("currency")) draft[column] = "CLP";
			else if (column.toLowerCase().includes("amount")) draft[column] = 0;
			else if (column.toLowerCase().includes("name"))
				draft[column] = "Sin Nombre";
			else if (column.startsWith("is_") || column.endsWith("_verified"))
				draft[column] = false;
			else draft[column] = "";
			continue;
		}

		// columna id inexistente en SELECT: probar insert plano.
		if (/Could not find the ['"]id['"] column/i.test(errorText)) {
			const plain = await supabase.from(table).insert(draft);
			if (!plain.error) return "CREATED_NO_ID";
		}

		console.error(`❌ Error insertando en ${table}`, { error, draft, attempt });
		return null;
	}

	console.error(`❌ No se pudo insertar en ${table} tras reintentos`, {
		payload: draft,
	});
	return null;
}

async function resolveOrCreateSenderUid(
	fromPhone: string,
	flow: SendFlowState,
): Promise<string | null> {
	const senderPhone = normalizeE164Like(fromPhone);
	const senderName = flow.senderName || "Cliente WhatsApp";
	const senderDocument = getIdentityDocumentForStorage(flow.senderDocument);

	const { data: existingByPhone } = await supabase
		.from("mt_customers")
		.select("id")
		.eq("phone", senderPhone)
		.limit(1);
	const existingId = existingByPhone?.[0]?.id
		? String(existingByPhone[0].id)
		: null;
	if (existingId) return existingId;

	const phoneDigits = senderPhone.replace(/\D/g, "");
	const customerPayload: Record<string, unknown> = {
		full_name: senderName,
		phone: senderPhone,
		email: `wa-${phoneDigits}@ingenit.local`,
		documentId: senderDocument,
	};

	return adaptiveInsertReturningId("mt_customers", customerPayload, "id");
}

async function resolveOrCreateRecipientId(
	senderUid: string,
	fromPhone: string,
	flow: SendFlowState,
): Promise<string | null> {
	const recipientName = flow.recipientName || "Destinatario";
	const recipientDocument = getIdentityDocumentForStorage(
		flow.recipientDocument,
	);
	const fallbackPhone = `${normalizeE164Like(fromPhone).replace(/\D/g, "").slice(0, 11)}${Math.floor(Math.random() * 10)}`;
	const recipientPhone = `+${fallbackPhone}`;

	if (recipientDocument) {
		const { data: existingByDoc } = await supabase
			.from("mt_recipients")
			.select("id")
			.eq("document_id", recipientDocument)
			.limit(1);
		const byDocId = existingByDoc?.[0]?.id ? String(existingByDoc[0].id) : null;
		if (byDocId) return byDocId;
	}

	const recipientPayload: Record<string, unknown> = {
		full_name: recipientName,
		phone: recipientPhone,
		country: flow.destination === "bolivia" ? "Bolivia" : "Chile",
		document_id: recipientDocument,
		method: flow.recipientReceiveMethod || null,
		customer_id: senderUid,
		qr_transfer:
			flow.recipientReceiveMethod === "QR"
				? flow.recipientQrUrl || "PENDIENTE"
				: null,
	};

	return adaptiveInsertReturningId("mt_recipients", recipientPayload, "id");
}

type CreatedMtTransaction = {
	rowId: string | null;
	transactionId: string;
	senderName: string;
	recipientName: string;
	amountSent: number;
	amountReceived: number;
	fromCurrency: "CLP" | "BOB";
	toCurrency: "CLP" | "BOB";
	paymentMethod: string;
};

async function sendMtInternalControlEmail(
	tx: CreatedMtTransaction,
): Promise<void> {
	try {
		const baseUrl =
			process.env.MT_INTERNAL_API_BASE_URL ||
			process.env.MT_WEBAPP_URL ||
			"https://mt.ingenit.cl";
		const endpoint = `${baseUrl.replace(/\/+$/, "")}/api/sendTransactionEmail`;

		const amountSentText =
			tx.fromCurrency === "CLP"
				? `$ ${Math.round(tx.amountSent).toLocaleString("es-CL")}.- CLP`
				: `${Math.round(tx.amountSent).toLocaleString("es-BO")}.- BOB`;

		const amountReceivedText =
			tx.toCurrency === "CLP"
				? `$ ${Math.round(tx.amountReceived).toLocaleString("es-CL")}.- CLP`
				: `${Number(tx.amountReceived).toLocaleString("es-BO", {
						minimumFractionDigits: 2,
						maximumFractionDigits: 2,
					})}.- BOB`;

		const payload = {
			clientName: tx.senderName || "Cliente WhatsApp",
			clientEmail: null, // Forzar solo control interno
			recipientName: tx.recipientName || "Destinatario",
			amountSent: amountSentText,
			amountReceived: amountReceivedText,
			transactionId: tx.transactionId,
			showBankDetails: false,
			paymentMethod: tx.paymentMethod || "No informado",
			type: "apertura",
		};

		const response = await fetch(endpoint, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const body = await response.text().catch(() => "");
			console.error("❌ No se pudo enviar correo interno MT", {
				endpoint,
				status: response.status,
				body,
				payload,
			});
			return;
		}

		console.log("✅ Correo interno MT enviado correctamente", {
			endpoint,
			transactionId: tx.transactionId,
			rowId: tx.rowId,
		});
	} catch (error) {
		console.error("❌ Error de red enviando correo interno MT", error);
	}
}

function parseDbAmount(value: unknown): number {
	if (value === null || value === undefined || value === "") return 0;
	if (typeof value === "number") return Number.isFinite(value) ? value : 0;
	let clean = String(value)
		.trim()
		.replace(/[^\d.,-]/g, "");
	clean = clean.replace(/,/g, ".");
	const parts = clean.split(".");
	if (parts.length > 2) clean = `${parts.shift()}.${parts.join("")}`;
	const parsed = Number.parseFloat(clean);
	return Number.isFinite(parsed) ? parsed : 0;
}

async function checkAvailableAmountForCurrency(targetCurrency: "CLP" | "BOB") {
	let banksQuery = supabase.from("mt_bank_amounts").select("amount");
	if (targetCurrency === "BOB") {
		banksQuery = banksQuery.or("currency.eq.BOB,currency.is.null");
	} else {
		banksQuery = banksQuery.eq("currency", "CLP");
	}

	const { data: banks, error: banksError } = await banksQuery;
	if (banksError || !banks) {
		console.error("❌ Error consultando mt_bank_amounts", banksError);
		return null;
	}

	const total = banks.reduce((acc, row) => {
		const amount =
			row && typeof row === "object" && !Array.isArray(row)
				? (row as Record<string, unknown>).amount
				: 0;
		return acc + parseDbAmount(amount);
	}, 0);

	const { data: pending, error: pendingError } = await supabase
		.from("mt_transactions")
		.select("amountReceived")
		.eq("status", "Pendiente")
		.eq("toCurrency", targetCurrency);

	if (pendingError || !pending) {
		console.error(
			"❌ Error consultando mt_transactions pendientes",
			pendingError,
		);
		return null;
	}

	const reserved = pending.reduce((acc, row) => {
		const amount =
			row && typeof row === "object" && !Array.isArray(row)
				? (row as Record<string, unknown>).amountReceived
				: 0;
		return acc + parseDbAmount(amount);
	}, 0);

	const available = total - reserved;
	return { currency: targetCurrency, total, reserved, available };
}

function getReserveContextFromFlow(
	flow: SendFlowState,
): { currency: "CLP" | "BOB"; amount: number } | null {
	if (flow.destination === "chile") {
		const amount = Number(flow.convertedClp || 0);
		if (amount <= 0) return null;
		return { currency: "CLP", amount };
	}
	const amount = Number(flow.convertedBob || 0);
	if (amount <= 0) return null;
	return { currency: "BOB", amount };
}

async function createMtTransactionFromFlow(params: {
	from: string;
	to: string;
	flow: SendFlowState;
}): Promise<CreatedMtTransaction | null> {
	const { from, to, flow } = params;
	try {
		const senderUid = await resolveOrCreateSenderUid(from, flow);
		if (!senderUid) {
			console.error(
				"❌ No se pudo resolver/crear senderUid para mt_transactions",
				{ from, flow },
			);
			return null;
		}

		const recipientId = await resolveOrCreateRecipientId(senderUid, from, flow);
		if (!recipientId) {
			console.error(
				"❌ No se pudo resolver/crear recipientId para mt_transactions",
				{ from, senderUid, flow },
			);
			return null;
		}

		const isToBolivia = flow.destination === "bolivia";
		const fromCurrency = isToBolivia ? "CLP" : "BOB";
		const toCurrency = isToBolivia ? "BOB" : "CLP";
		const amountSent = isToBolivia
			? Number(flow.amountClp || 0)
			: Number(flow.amountBob || 0);
		const amountReceived = isToBolivia
			? Number(flow.convertedBob || 0)
			: Number(flow.convertedClp || 0);
		const exchangeRate =
			amountSent > 0 && amountReceived > 0 ? amountReceived / amountSent : null;

		const basePayload: Record<string, unknown> = {
			transactionId: generateWaTransactionId(),
			senderUid,
			recipientId,
			fromCurrency,
			toCurrency,
			amountSent,
			amountReceived,
			status: "Pendiente",
			payment_method: flow.senderPaymentMethod || null,
			normalizedPhone: normalizeE164Like(from),
			senderPhone: normalizeE164Like(from),
			country: flow.destination === "bolivia" ? "Bolivia" : "Chile",
			email_sender: null,
			email_recipient: null,
			recipientName: flow.recipientName || null,
			senderName: flow.senderName || null,
			recipient_method: flow.recipientReceiveMethod || null,
			recipient_bank: flow.recipientBankName || null,
			recipient_account_type: flow.recipientAccountType || null,
			recipient_account_number: flow.recipientAccountNumber || null,
			recipient_qr:
				flow.recipientReceiveMethod === "QR"
					? flow.recipientQrUrl || "PENDIENTE"
					: null,
			tigo_number:
				flow.recipientAccountType === "Tigo Money"
					? flow.recipientAccountNumber || null
					: null,
			payment_verified: false,
			is_temporary: true,
			created_at: new Date().toISOString(),
			// Campos extra opcionales (si existen en esquema extendido)
			exchange_rate: exchangeRate,
		};
		const createdId = await adaptiveInsertReturningId(
			"mt_transactions",
			basePayload,
			"id",
		);
		if (!createdId) {
			console.error("❌ No se pudo crear mt_transactions tras reintentos.", {
				basePayload,
			});
			return null;
		}

		console.log("✅ Transacción creada en mt_transactions", {
			from,
			to,
			id: createdId,
			transactionId: basePayload.transactionId,
			senderUid,
			recipientId,
			status: "pending",
			amountClp: flow.amountClp,
			amountBob: flow.convertedBob,
		});

		return {
			rowId: createdId === "CREATED_NO_ID" ? null : createdId,
			transactionId: String(basePayload.transactionId),
			senderName: flow.senderName || "Cliente WhatsApp",
			recipientName: flow.recipientName || "Destinatario",
			amountSent,
			amountReceived,
			fromCurrency,
			toCurrency,
			paymentMethod: flow.senderPaymentMethod || "No informado",
		};
	} catch (error) {
		console.error("❌ Error inesperado creando mt_transactions", error);
		return null;
	}
}

async function inferPendingRateModeFromHistory(
	contactNumber: string,
	whatsappNumber: string,
): Promise<PendingRateCalculationMode | null> {
	const { data, error } = await supabase
		.from("rt_messages")
		.select("content")
		.eq("from_number", whatsappNumber)
		.eq("to_number", contactNumber)
		.eq("direction", "out")
		.order("timestamp", { ascending: false })
		.limit(1);

	if (error || !data?.length) return null;

	const lastContent = String(data[0]?.content || "").toLowerCase();
	if (
		lastContent.includes(
			"escribe cuántos pesos chilenos quieres convertir a bolivianos",
		)
	) {
		return "CLP_TO_BOB";
	}
	if (
		lastContent.includes(
			"escribe cuántos bolivianos quieres convertir a pesos chilenos",
		)
	) {
		return "BOB_TO_CLP";
	}
	return null;
}

function getIncomingButtonSelection(
	message: WebhookMessage,
): IncomingButtonSelection | null {
	const type = message?.type;
	if (type === "interactive") {
		const id = String(message?.interactive?.button_reply?.id || "").trim();
		const title = String(
			message?.interactive?.button_reply?.title || "",
		).trim();
		if (id) return { id, title };
		if (title) {
			const normalizedTitle = title.toLowerCase();
			if (normalizedTitle.includes("whatsapp"))
				return { id: MENU_BTN_SEND_WHATSAPP, title };
			if (
				normalizedTitle.includes("webapp") ||
				normalizedTitle.includes("web app")
			)
				return { id: MENU_BTN_SEND_WEBAPP, title };
			if (normalizedTitle.includes("hacer un envío"))
				return { id: MENU_BTN_SEND, title };
			if (normalizedTitle.includes("tipo de cambio"))
				return { id: MENU_BTN_RATE, title };
			if (normalizedTitle.includes("chatear"))
				return { id: MENU_BTN_AGENT, title };
			if (normalizedTitle.includes("bolivia"))
				return { id: MENU_BTN_DEST_BOLIVIA, title };
			if (normalizedTitle.includes("chile"))
				return { id: MENU_BTN_DEST_CHILE, title };
			if (normalizedTitle.includes("caja vecina"))
				return { id: MENU_BTN_PAY_CAJAVECINA, title };
			if (normalizedTitle.includes("transferencia"))
				return { id: MENU_BTN_PAY_TRANSFER, title };
			if (normalizedTitle === "qr") return { id: MENU_BTN_PAY_QR, title };
			if (normalizedTitle.includes("aceptar"))
				return { id: MENU_BTN_TX_CONFIRM, title };
			if (normalizedTitle.includes("cancelar"))
				return { id: MENU_BTN_TX_CANCEL, title };
			if (normalizedTitle.includes("terminar"))
				return { id: MENU_BTN_END, title };
			if (normalizedTitle.includes("volver"))
				return { id: MENU_BTN_BACK_MAIN, title };
			if (normalizedTitle.includes("cuenta corriente"))
				return { id: MENU_BTN_ACC_TYPE_CORRIENTE, title };
			if (normalizedTitle.includes("cuenta rut"))
				return { id: MENU_BTN_ACC_TYPE_RUT, title };
			if (normalizedTitle.includes("mas opciones"))
				return { id: MENU_BTN_ACC_TYPE_MORE, title };
			if (normalizedTitle.includes("cuenta vista"))
				return { id: MENU_BTN_ACC_TYPE_VISTA, title };
			if (normalizedTitle.includes("cuenta ahorro"))
				return { id: MENU_BTN_ACC_TYPE_AHORRO, title };
			if (normalizedTitle.includes("caja de ahorro"))
				return { id: MENU_BTN_ACC_TYPE_CAJA_AHORRO, title };
			if (normalizedTitle.includes("tigo money"))
				return { id: MENU_BTN_ACC_TYPE_TIGO, title };
			if (normalizedTitle.includes("chequera"))
				return { id: MENU_BTN_ACC_TYPE_CHEQUERA, title };
			if (normalizedTitle.includes("volver opciones"))
				return { id: MENU_BTN_ACC_TYPE_BACK, title };
		}
	}
	if (type === "button") {
		const title = String(message?.button?.text || "").trim();
		if (!title) return null;
		const normalized = title.toLowerCase();
		if (normalized.includes("whatsapp"))
			return { id: MENU_BTN_SEND_WHATSAPP, title };
		if (normalized.includes("webapp") || normalized.includes("web app"))
			return { id: MENU_BTN_SEND_WEBAPP, title };
		if (normalized.includes("bolivia"))
			return { id: MENU_BTN_DEST_BOLIVIA, title };
		if (normalized.includes("chile")) return { id: MENU_BTN_DEST_CHILE, title };
		if (normalized.includes("caja vecina"))
			return { id: MENU_BTN_PAY_CAJAVECINA, title };
		if (normalized.includes("transferencia"))
			return { id: MENU_BTN_PAY_TRANSFER, title };
		if (normalized === "qr") return { id: MENU_BTN_PAY_QR, title };
		if (normalized.includes("aceptar"))
			return { id: MENU_BTN_TX_CONFIRM, title };
		if (normalized.includes("cancelar"))
			return { id: MENU_BTN_TX_CANCEL, title };
		if (normalized.includes("terminar")) return { id: MENU_BTN_END, title };
		if (normalized.includes("volver")) return { id: MENU_BTN_BACK_MAIN, title };
		if (normalized.includes("cuenta corriente"))
			return { id: MENU_BTN_ACC_TYPE_CORRIENTE, title };
		if (normalized.includes("cuenta rut"))
			return { id: MENU_BTN_ACC_TYPE_RUT, title };
		if (normalized.includes("mas opciones"))
			return { id: MENU_BTN_ACC_TYPE_MORE, title };
		if (normalized.includes("cuenta vista"))
			return { id: MENU_BTN_ACC_TYPE_VISTA, title };
		if (normalized.includes("cuenta ahorro"))
			return { id: MENU_BTN_ACC_TYPE_AHORRO, title };
		if (normalized.includes("caja de ahorro"))
			return { id: MENU_BTN_ACC_TYPE_CAJA_AHORRO, title };
		if (normalized.includes("tigo money"))
			return { id: MENU_BTN_ACC_TYPE_TIGO, title };
		if (normalized.includes("chequera"))
			return { id: MENU_BTN_ACC_TYPE_CHEQUERA, title };
		if (normalized.includes("volver opciones"))
			return { id: MENU_BTN_ACC_TYPE_BACK, title };
		if (normalized.includes("env")) return { id: MENU_BTN_SEND, title };
		if (normalized.includes("cambio")) return { id: MENU_BTN_RATE, title };
		if (normalized.includes("agente")) return { id: MENU_BTN_AGENT, title };
	}
	return null;
}

async function handleNumber560424FirstMenuFlow(params: {
	from: string;
	to: string;
	toPhoneId: string;
	message: WebhookMessage;
	incomingMediaUrl?: string | null;
}) {
	const { from, to, toPhoneId, message, incomingMediaUrl } = params;
	const isTargetNumber = to === MENU_FLOW_TARGET_NUMBER;
	const isTargetPhoneId = toPhoneId === MENU_FLOW_TARGET_PHONE_ID;
	if (!isTargetNumber && !isTargetPhoneId) return;

	const selection = getIncomingButtonSelection(message);
	const activeSendFlow = sendFlowByContact.get(from);
	const pendingRateMode = pendingRateCalculationByContact.get(from);
	if (selection) {
		if (selection.id === MENU_BTN_FLOW_RESTART) {
			clearFlowStateForContact(from);
			await sendMenuButtonsFor560424(from);
			return;
		}
		if (selection.id === MENU_BTN_FLOW_CONTINUE) {
			resetInvalidFlowInputCount(from);
			await sendContinuePromptForCurrentFlow560424(from);
			return;
		}

		// Guard: si hay flujo de envío activo, bloquear botones fuera del paso actual
		if (
			activeSendFlow &&
			!isSelectionAllowedForSendStep(selection.id, activeSendFlow)
		) {
			const tries = incrementInvalidFlowInputCount(from);
			await sendFlowRecoveryButtons560424(
				from,
				tries >= 2
					? "Tu flujo actual sigue en curso. Si quieres, puedes reiniciarlo."
					: "Esta opción no corresponde al paso actual. Puedes continuar o reiniciar el flujo.",
			);
			return;
		}

		// Guard: si hay cálculo pendiente, solo se espera monto por texto
		if (pendingRateMode) {
			const tries = incrementInvalidFlowInputCount(from);
			await sendFlowRecoveryButtons560424(
				from,
				tries >= 2
					? "Aún estamos esperando el monto para el cálculo. Puedes continuar o reiniciar."
					: "Para continuar, debes ingresar el monto del cálculo. Puedes continuar o reiniciar el flujo.",
			);
			return;
		}

		const selectionTitle = String(selection.title || "").toLowerCase();
		if (selectionTitle.includes("whatsapp")) {
			pendingRateCalculationByContact.delete(from);
			await sendDestinationButtons560424(from);
			return;
		}

		if (selection.id === MENU_BTN_SEND) {
			pendingRateCalculationByContact.delete(from);
			await sendShippingSubmenuButtons560424(from);
			return;
		}
		if (selection.id === MENU_BTN_RATE) {
			pendingRateCalculationByContact.delete(from);
			await sendBothRatesAndBackButton560424(from);
			return;
		}
		if (selection.id === MENU_BTN_RATE_CALC) {
			pendingRateCalculationByContact.delete(from);
			await sendRateCalcTypeButtons560424(from);
			return;
		}
		if (selection.id === MENU_BTN_RATE_CLP_TO_BOB) {
			pendingRateCalculationByContact.set(from, "CLP_TO_BOB");
			await sendAndStoreText560424(
				from,
				"Escribe cuántos pesos chilenos quieres convertir a bolivianos (ingresa solo números enteros).",
			);
			return;
		}
		if (selection.id === MENU_BTN_RATE_BOB_TO_CLP) {
			pendingRateCalculationByContact.set(from, "BOB_TO_CLP");
			await sendAndStoreText560424(
				from,
				"Escribe cuántos bolivianos quieres convertir a pesos chilenos (ingresa solo números enteros).",
			);
			return;
		}
		if (selection.id === MENU_BTN_AGENT) {
			const text = "Listo. Te conectamos con un agente.";
			await sendAndStoreText560424(from, text);
			return;
		}
		if (selection.id === MENU_BTN_SEND_WHATSAPP) {
			pendingRateCalculationByContact.delete(from);
			await sendDestinationButtons560424(from);
			return;
		}
		if (selection.id === MENU_BTN_SEND_WEBAPP) {
			const webAppUrl = process.env.MT_WEBAPP_URL || "https://mt.ingenit.cl";
			const text = `Perfecto. Puedes crear tu envío aquí: ${webAppUrl}`;
			await sendAndStoreText560424(from, text);
			return;
		}
		if (selection.id === MENU_BTN_BACK_MAIN) {
			clearFlowStateForContact(from);
			await sendMenuButtonsFor560424(from);
			return;
		}
		if (selection.id === MENU_BTN_END) {
			clearFlowStateForContact(from);
			await sendAndStoreText560424(
				from,
				"Listo. Cuando quieras, escribe menú para continuar.",
			);
			return;
		}
		if (selection.id === MENU_BTN_DEST_BOLIVIA) {
			sendFlowByContact.set(from, {
				destination: "bolivia",
				step: "sender_name",
			});
			resetInvalidFlowInputCount(from);
			await sendAndStoreText560424(from, "Ingresa tu nombre completo.");
			return;
		}
		if (selection.id === MENU_BTN_DEST_CHILE) {
			sendFlowByContact.set(from, {
				destination: "chile",
				step: "sender_name",
			});
			resetInvalidFlowInputCount(from);
			await sendAndStoreText560424(from, "Ingresa tu nombre completo.");
			return;
		}
		if (
			selection.id === MENU_BTN_PAY_CAJAVECINA ||
			selection.id === MENU_BTN_PAY_TRANSFER ||
			selection.id === MENU_BTN_PAY_QR
		) {
			const flow = sendFlowByContact.get(from);
			if (!flow) return;
			if (selection.id === MENU_BTN_PAY_CAJAVECINA) {
				flow.senderPaymentMethod = "Caja Vecina";
			} else if (selection.id === MENU_BTN_PAY_QR) {
				flow.senderPaymentMethod = "QR";
			} else {
				flow.senderPaymentMethod = "Transferencia Bancaria";
			}
			flow.step = "recipient_name";
			sendFlowByContact.set(from, flow);
			await sendAndStoreText560424(
				from,
				"Datos de tu destinatario:\nNombre completo",
			);
			return;
		}
		if (
			selection.id === MENU_BTN_RECEIVE_QR ||
			selection.id === MENU_BTN_RECEIVE_TRANSFER
		) {
			const flow = sendFlowByContact.get(from);
			if (!flow) return;
			flow.recipientReceiveMethod =
				selection.id === MENU_BTN_RECEIVE_QR ? "QR" : "Transferencia Bancaria";
			if (selection.id === MENU_BTN_RECEIVE_QR) {
				flow.step = "recipient_qr_file";
				sendFlowByContact.set(from, flow);
				await sendAndStoreText560424(
					from,
					"Envía el archivo QR (imagen o PDF) de tu destinatario.",
				);
				return;
			}
			flow.step = "recipient_bank_name";
			sendFlowByContact.set(from, flow);
			await sendAndStoreText560424(
				from,
				"Ingresa el nombre del banco de tu destinatario.",
			);
			return;
		}
		if (selection.id === MENU_BTN_TX_CANCEL) {
			clearFlowStateForContact(from);
			await sendAndStoreText560424(
				from,
				"Operación cancelada. Puedes comenzar nuevamente cuando quieras.",
			);
			return;
		}
		if (
			selection.id === MENU_BTN_ACC_TYPE_CORRIENTE ||
			selection.id === MENU_BTN_ACC_TYPE_RUT ||
			selection.id === MENU_BTN_ACC_TYPE_VISTA ||
			selection.id === MENU_BTN_ACC_TYPE_AHORRO ||
			selection.id === MENU_BTN_ACC_TYPE_CHEQUERA ||
			selection.id === MENU_BTN_ACC_TYPE_CAJA_AHORRO ||
			selection.id === MENU_BTN_ACC_TYPE_TIGO ||
			selection.id === MENU_BTN_ACC_TYPE_BACK ||
			selection.id === MENU_BTN_ACC_TYPE_MORE
		) {
			const flow = sendFlowByContact.get(from);
			if (!flow || flow.step !== "recipient_account_type") return;
			if (selection.id === MENU_BTN_ACC_TYPE_MORE) {
				await sendRecipientAccountTypeButtons560424(from, flow.destination, 2);
				return;
			}
			if (selection.id === MENU_BTN_ACC_TYPE_BACK) {
				await sendRecipientAccountTypeButtons560424(from, flow.destination, 1);
				return;
			}

			const selectedTypeMap: Record<string, string> =
				flow.destination === "chile"
					? {
							[MENU_BTN_ACC_TYPE_CORRIENTE]: "Cuenta Corriente",
							[MENU_BTN_ACC_TYPE_RUT]: "Cuenta RUT",
							[MENU_BTN_ACC_TYPE_VISTA]: "Cuenta Vista",
							[MENU_BTN_ACC_TYPE_AHORRO]: "Cuenta Ahorro",
							[MENU_BTN_ACC_TYPE_CHEQUERA]: "Chequera Electrónica",
						}
					: {
							[MENU_BTN_ACC_TYPE_CORRIENTE]: "Cuenta Corriente",
							[MENU_BTN_ACC_TYPE_CAJA_AHORRO]: "Caja de Ahorro",
							[MENU_BTN_ACC_TYPE_AHORRO]: "Caja de Ahorro",
						};

			const selectedAccountType = selectedTypeMap[selection.id];
			if (!selectedAccountType) {
				await sendAndStoreText560424(
					from,
					flow.destination === "chile"
						? "Tipo de cuenta inválido para Chile. Selecciona una opción válida."
						: "Tipo de cuenta inválido para Bolivia. Selecciona una opción válida.",
				);
				await sendRecipientAccountTypeButtons560424(from, flow.destination, 1);
				return;
			}

			flow.recipientAccountType = selectedAccountType;
			flow.step = "recipient_account_number";
			sendFlowByContact.set(from, flow);
			await sendAndStoreText560424(
				from,
				selectedAccountType === "Tigo Money"
					? "Ingresa el número Tigo Money de tu destinatario (solo números)."
					: "Ingresa el número de cuenta de tu destinatario (solo números).",
			);
			return;
		}
		if (selection.id === MENU_BTN_TX_CONFIRM) {
			const flow = sendFlowByContact.get(from);
			if (!flow) return;

			const reserveContext = getReserveContextFromFlow(flow);
			if (!reserveContext) {
				flow.step = "amount";
				sendFlowByContact.set(from, flow);
				await sendAndStoreText560424(
					from,
					"No pudimos validar el monto a reservar. Ingresa nuevamente el monto para continuar.",
				);
				return;
			}

			const availability = await checkAvailableAmountForCurrency(
				reserveContext.currency,
			);
			if (!availability) {
				await sendAndStoreText560424(
					from,
					"No pudimos verificar saldo disponible en este momento. Intenta nuevamente en unos segundos.",
				);
				return;
			}
			if (reserveContext.amount > availability.available) {
				flow.step = "amount";
				sendFlowByContact.set(from, flow);
				await sendAndStoreText560424(
					from,
					"En este momento no podemos procesar tu solicitud. Por favor, intenta más tarde o espera la respuesta de un agente.",
				);
				return;
			}

			const createdTx = await createMtTransactionFromFlow({ from, to, flow });
			if (!createdTx) {
				await sendAndStoreText560424(
					from,
					"No pudimos crear la transacción en este momento. Por favor, vuelve a presionar Aceptar en unos segundos.",
				);
				return;
			}
			await sendMtInternalControlEmail(createdTx);
			sendFlowByContact.delete(from);
			resetInvalidFlowInputCount(from);
			const trackingCode = createdTx.rowId
				? String(createdTx.rowId).split("-")[0].toUpperCase()
				: String(createdTx.transactionId).split("-")[0].toUpperCase();
			await sendAndStoreText560424(
				from,
				trackingCode
					? `Transacción creada correctamente. Código de seguimiento: ${trackingCode}. Un agente validará la información y continuará el proceso.`
					: "Transacción creada correctamente. Un agente validará la información y continuará el proceso.",
			);
			await sendPaymentInstructionsAfterTracking560424(from, flow);
			return;
		}
	}

	if (activeSendFlow) {
		if (message?.type === "image" || message?.type === "document") {
			if (activeSendFlow.step === "recipient_qr_file") {
				activeSendFlow.recipientQrReceived = true;
				activeSendFlow.recipientQrUrl =
					incomingMediaUrl || activeSendFlow.recipientQrUrl || null;
				activeSendFlow.step = "amount";
				sendFlowByContact.set(from, activeSendFlow);
				await sendAndStoreText560424(
					from,
					"Archivo QR recibido. ¿Cuánto enviarás? (ingresa solo números enteros de pesos chilenos)",
				);
				return;
			}
			await sendAndStoreText560424(
				from,
				"Archivo recibido. Continúa con el dato solicitado.",
			);
			return;
		}

		if (message?.type !== "text") {
			const tries = incrementInvalidFlowInputCount(from);
			await sendFlowRecoveryButtons560424(
				from,
				tries >= 2
					? "Aún faltan datos del flujo actual. Puedes continuar o reiniciar."
					: "Ese formato no corresponde a este paso. Puedes continuar o reiniciar el flujo.",
			);
			return;
		}

		const textInput = String(message?.text?.body || "").trim();
		if (!textInput) {
			const tries = incrementInvalidFlowInputCount(from);
			await sendFlowRecoveryButtons560424(
				from,
				tries >= 2
					? "Dato vacío. Puedes continuar o reiniciar el flujo."
					: "Dato inválido para este paso. Puedes continuar o reiniciar el flujo.",
			);
			return;
		}

		if (
			textInput.toLowerCase() === "menu" ||
			textInput.toLowerCase() === "menú"
		) {
			clearFlowStateForContact(from);
			await sendMenuButtonsFor560424(from);
			return;
		}

		if (activeSendFlow.step === "sender_name") {
			if (!isValidFullName(textInput)) {
				await sendAndStoreText560424(
					from,
					"Nombre inválido. Ingresa tu nombre completo real (solo letras).",
				);
				return;
			}
			activeSendFlow.senderName = toTitleCaseName(textInput);
			activeSendFlow.step = "sender_document";
			sendFlowByContact.set(from, activeSendFlow);
			resetInvalidFlowInputCount(from);
			await sendAndStoreText560424(
				from,
				"Ingresa tu documento de identidad (RUT/CI).",
			);
			return;
		}

		if (activeSendFlow.step === "sender_document") {
			if (!isValidIdentityDocument(textInput)) {
				await sendAndStoreText560424(
					from,
					"Documento inválido. Ingresa un RUT/CI válido, por ejemplo: 12.345.678-9 o 7894561.",
				);
				return;
			}
			activeSendFlow.senderDocument = textInput;
			activeSendFlow.step = "sender_payment";
			sendFlowByContact.set(from, activeSendFlow);
			resetInvalidFlowInputCount(from);
			await sendSenderPaymentButtons560424(from, activeSendFlow.destination);
			return;
		}

		if (activeSendFlow.step === "recipient_name") {
			if (!isValidFullName(textInput)) {
				await sendAndStoreText560424(
					from,
					"Nombre inválido. Ingresa el nombre completo real de tu destinatario (solo letras).",
				);
				return;
			}
			activeSendFlow.recipientName = toTitleCaseName(textInput);
			activeSendFlow.step = "recipient_document";
			sendFlowByContact.set(from, activeSendFlow);
			resetInvalidFlowInputCount(from);
			await sendAndStoreText560424(
				from,
				"Ingresa el documento de identidad de tu destinatario (RUT/CI).",
			);
			return;
		}

		if (activeSendFlow.step === "recipient_document") {
			if (!isValidIdentityDocument(textInput)) {
				await sendAndStoreText560424(
					from,
					"Documento inválido. Ingresa un RUT/CI válido de tu destinatario, por ejemplo: 12.345.678-9 o 7894561.",
				);
				return;
			}
			activeSendFlow.recipientDocument = textInput;
			if (activeSendFlow.destination === "chile") {
				activeSendFlow.recipientReceiveMethod = "Transferencia Bancaria";
				activeSendFlow.step = "recipient_bank_name";
				sendFlowByContact.set(from, activeSendFlow);
				resetInvalidFlowInputCount(from);
				await sendAndStoreText560424(
					from,
					"Ingresa el nombre del banco de tu destinatario.",
				);
			} else {
				activeSendFlow.step = "recipient_receive";
				sendFlowByContact.set(from, activeSendFlow);
				resetInvalidFlowInputCount(from);
				await sendRecipientReceiveButtons560424(
					from,
					activeSendFlow.destination,
				);
			}
			return;
		}

		if (activeSendFlow.step === "recipient_bank_name") {
			if (textInput.length < 2) {
				await sendAndStoreText560424(
					from,
					"Banco inválido. Ingresa el nombre del banco de tu destinatario.",
				);
				return;
			}
			if (
				activeSendFlow.destination === "bolivia" &&
				isTigoLikeBankInput(textInput)
			) {
				activeSendFlow.recipientBankName = "Tigo Money";
				activeSendFlow.recipientAccountType = "Tigo Money";
				activeSendFlow.step = "recipient_account_number";
				sendFlowByContact.set(from, activeSendFlow);
				resetInvalidFlowInputCount(from);
				await sendAndStoreText560424(
					from,
					"Ingresa el número Tigo Money de tu destinatario (solo números).",
				);
				return;
			}
			activeSendFlow.recipientBankName = textInput;
			activeSendFlow.step = "recipient_account_type";
			sendFlowByContact.set(from, activeSendFlow);
			resetInvalidFlowInputCount(from);
			await sendRecipientAccountTypeButtons560424(
				from,
				activeSendFlow.destination,
				1,
			);
			return;
		}

		if (activeSendFlow.step === "recipient_account_type") {
			const normalizedType = textInput
				.trim()
				.toLowerCase()
				.normalize("NFD")
				.replace(/[\u0300-\u036f]/g, "");

			const accountTypeMap: Record<string, string> =
				activeSendFlow.destination === "chile"
					? {
							"cuenta corriente": "Cuenta Corriente",
							corriente: "Cuenta Corriente",
							"cuenta rut": "Cuenta RUT",
							rut: "Cuenta RUT",
							"cuenta vista": "Cuenta Vista",
							vista: "Cuenta Vista",
							"cuenta ahorro": "Cuenta Ahorro",
							ahorro: "Cuenta Ahorro",
							"chequera electronica": "Chequera Electrónica",
							chequera: "Chequera Electrónica",
						}
					: {
							"cuenta corriente": "Cuenta Corriente",
							corriente: "Cuenta Corriente",
							"caja de ahorro": "Caja de Ahorro",
							"cuenta ahorro": "Caja de Ahorro",
							ahorro: "Caja de Ahorro",
						};

			const parsedAccountType = accountTypeMap[normalizedType];
			if (!parsedAccountType) {
				await sendAndStoreText560424(
					from,
					activeSendFlow.destination === "chile"
						? "Tipo de cuenta inválido. Opciones válidas: Cuenta Corriente, Cuenta RUT, Cuenta Vista, Cuenta Ahorro o Chequera Electrónica."
						: "Tipo de cuenta inválido. Opciones válidas: Cuenta Corriente o Caja de Ahorro.",
				);
				await sendRecipientAccountTypeButtons560424(
					from,
					activeSendFlow.destination,
					1,
				);
				return;
			}
			activeSendFlow.recipientAccountType = parsedAccountType;
			activeSendFlow.step = "recipient_account_number";
			sendFlowByContact.set(from, activeSendFlow);
			resetInvalidFlowInputCount(from);
			await sendAndStoreText560424(
				from,
				activeSendFlow.recipientAccountType === "Tigo Money"
					? "Ingresa el número Tigo Money de tu destinatario (solo números)."
					: "Ingresa el número de cuenta de tu destinatario (solo números).",
			);
			return;
		}

		if (activeSendFlow.step === "recipient_account_number") {
			const accountNumber = textInput.replace(/[.\s-]/g, "");
			const isTigo = activeSendFlow.recipientAccountType === "Tigo Money";
			const isValid = isTigo
				? /^\d{8,12}$/.test(accountNumber)
				: /^\d{5,20}$/.test(accountNumber);
			if (!isValid) {
				await sendAndStoreText560424(
					from,
					isTigo
						? "Número Tigo Money inválido. Ingresa solo números (entre 8 y 12 dígitos)."
						: "Número de cuenta inválido. Ingresa solo números (entre 5 y 20 dígitos).",
				);
				return;
			}
			activeSendFlow.recipientAccountNumber = accountNumber;
			activeSendFlow.step = "amount";
			sendFlowByContact.set(from, activeSendFlow);
			resetInvalidFlowInputCount(from);
			await sendAndStoreText560424(
				from,
				activeSendFlow.destination === "chile"
					? "¿Cuánto enviarás? (ingresa solo números enteros en BOB)"
					: "¿Cuánto enviarás? (ingresa solo números enteros en CLP)",
			);
			return;
		}

		if (activeSendFlow.step === "recipient_qr_file") {
			await sendAndStoreText560424(
				from,
				"Para continuar, envía el archivo QR en imagen o PDF.",
			);
			return;
		}

		if (activeSendFlow.step === "amount") {
			const amount = parseIntegerAmount(textInput);
			if (!amount) {
				await sendAndStoreText560424(
					from,
					"Monto inválido. Ingresa solo números enteros (ejemplo: 60.000 o 60000).",
				);
				return;
			}

			const rates = await fetchCurrentExchangeRates();
			if (!rates) {
				await sendAndStoreText560424(
					from,
					"No pudimos obtener el tipo de cambio en este momento. Intenta nuevamente en unos minutos.",
				);
				return;
			}

			if (activeSendFlow.destination === "chile") {
				const convertedClp = Math.round(amount * rates.bobToClp);
				activeSendFlow.amountBob = amount;
				activeSendFlow.convertedClp = convertedClp;
				activeSendFlow.amountClp = undefined;
				activeSendFlow.convertedBob = undefined;
			} else {
				const convertedBob = normalizeBOBValue(amount * rates.clpToBob);
				activeSendFlow.amountClp = amount;
				activeSendFlow.convertedBob = convertedBob;
				activeSendFlow.amountBob = undefined;
				activeSendFlow.convertedClp = undefined;
			}

			const reserveContext = getReserveContextFromFlow(activeSendFlow);
			if (!reserveContext) {
				await sendAndStoreText560424(
					from,
					"No pudimos procesar el monto ingresado. Intenta nuevamente.",
				);
				return;
			}
			const availability = await checkAvailableAmountForCurrency(
				reserveContext.currency,
			);
			if (!availability) {
				await sendAndStoreText560424(
					from,
					"No pudimos verificar saldo disponible en este momento. Intenta nuevamente en unos minutos.",
				);
				return;
			}
			if (reserveContext.amount > availability.available) {
				await sendAndStoreText560424(
					from,
					"En este momento no podemos procesar tu solicitud. Por favor, intenta más tarde o espera la respuesta de un agente.",
				);
				return;
			}

			activeSendFlow.step = "confirm";
			sendFlowByContact.set(from, activeSendFlow);
			resetInvalidFlowInputCount(from);

			const remitente = activeSendFlow.senderName || "-";
			const destinatario = activeSendFlow.recipientName || "-";
			const isToChile = activeSendFlow.destination === "chile";
			const montoTexto = isToChile
				? `${Math.round(Number(activeSendFlow.amountBob || 0)).toLocaleString("es-BO")}.- BOB`
				: `$ ${Math.round(Number(activeSendFlow.amountClp || 0)).toLocaleString("es-CL")}.- CLP`;
			const conversionTexto = isToChile
				? `$ ${Math.round(Number(activeSendFlow.convertedClp || 0)).toLocaleString("es-CL")}.- CLP`
				: `${Number(activeSendFlow.convertedBob || 0).toLocaleString("es-BO", {
						minimumFractionDigits: 2,
						maximumFractionDigits: 2,
					})}.- BOB`;

			const summary =
				"Datos de la operación:\n" +
				`• Destino: ${activeSendFlow.destination === "bolivia" ? "Bolivia" : "Chile"}\n` +
				`• Remitente: ${remitente} (${getIdentityDocumentForSummary(activeSendFlow.senderDocument)})\n` +
				`• Pago: ${activeSendFlow.senderPaymentMethod || "-"}\n` +
				`• Destinatario: ${destinatario} (${getIdentityDocumentForSummary(activeSendFlow.recipientDocument)})\n` +
				`• Recepción: ${activeSendFlow.recipientReceiveMethod || "-"}\n` +
				(activeSendFlow.recipientReceiveMethod === "Transferencia Bancaria"
					? `• Banco: ${(activeSendFlow.recipientBankName || "-").toUpperCase()}\n• Tipo de cuenta: ${activeSendFlow.recipientAccountType || "-"}\n• Número de cuenta: ${activeSendFlow.recipientAccountNumber || "-"}\n`
					: "") +
				`• Monto: ${montoTexto}\n` +
				`• Conversión: ${conversionTexto}\n\n` +
				"Los datos entregados son de su entera responsabilidad. Una vez realizada la transferencia, esta es irreversible.";

			await sendTransactionConfirmationButtons560424(from, summary);
			return;
		}

		if (activeSendFlow.step === "sender_payment") {
			await sendAndStoreText560424(
				from,
				"Selecciona la forma de pago usando los botones.",
			);
			return;
		}

		if (activeSendFlow.step === "recipient_receive") {
			await sendAndStoreText560424(
				from,
				activeSendFlow.destination === "bolivia"
					? "Selecciona forma de recepción de tu destinatario usando los botones (QR o Transferencia)."
					: "Selecciona forma de recepción de tu destinatario usando los botones.",
			);
			return;
		}

		if (activeSendFlow.step === "confirm") {
			await sendAndStoreText560424(
				from,
				"Confirma la operación usando los botones: Aceptar o Cancelar.",
			);
			return;
		}
	}

	// Menú para mensajes de texto:
	// 1) primer mensaje histórico del cliente en este número
	// 2) reingreso tras inactividad (>= 12h)
	// 3) trigger manual escribiendo "menu" / "menú"
	if (message?.type !== "text") return;
	const incomingRawText = String(message?.text?.body || "").trim();
	const incomingText = incomingRawText.toLowerCase();
	if (
		incomingText === "enviar por whatsapp" ||
		incomingText === "enviar por whastapp"
	) {
		pendingRateCalculationByContact.delete(from);
		await sendDestinationButtons560424(from);
		return;
	}
	const manualMenuTrigger = incomingText === "menu" || incomingText === "menú";

	let pendingMode = pendingRateCalculationByContact.get(from) || null;
	if (!pendingMode) {
		pendingMode = await inferPendingRateModeFromHistory(from, to);
		if (pendingMode) {
			pendingRateCalculationByContact.set(from, pendingMode);
		}
	}
	if (pendingMode) {
		if (manualMenuTrigger) {
			clearFlowStateForContact(from);
			await sendMenuButtonsFor560424(from);
			return;
		}

		const amount = parseIntegerAmount(incomingRawText);
		if (!amount) {
			const invalidText =
				pendingMode === "CLP_TO_BOB"
					? "Monto inválido. Solo se aceptan números enteros en CLP (ejemplo: 60.000 o 60000)."
					: "Monto inválido. Solo se aceptan números enteros en BOB (ejemplo: 1.000 o 1000).";
			await sendAndStoreText560424(from, invalidText);
			return;
		}

		const rates = await fetchCurrentExchangeRates();
		if (!rates) {
			await sendAndStoreText560424(
				from,
				"No pudimos obtener el tipo de cambio en este momento. Intenta nuevamente en unos minutos.",
			);
			return;
		}

		if (pendingMode === "CLP_TO_BOB") {
			const result = amount * rates.clpToBob;
			const bobNormalized = normalizeBOBValue(result);
			const clpText = `$ ${amount.toLocaleString("es-CL")}.-`;
			const bobText = `${bobNormalized.toLocaleString("es-BO", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			})}.-`;
			const responseText = `${clpText} pesos chilenos equivalen a ${bobText} bolivianos.`;
			pendingRateCalculationByContact.delete(from);
			await sendCalcResultActions560424(from, responseText);
			resetInvalidFlowInputCount(from);
			return;
		}

		const result = amount * rates.bobToClp;
		const clpRoundedToHundreds = Math.round(result / 100) * 100;
		const bobText = `${amount.toLocaleString("es-BO")}.-`;
		const clpText = `$ ${clpRoundedToHundreds.toLocaleString("es-CL")}.-`;
		const responseText = `${bobText} bolivianos equivalen a ${clpText} pesos chilenos.`;
		pendingRateCalculationByContact.delete(from);
		await sendCalcResultActions560424(from, responseText);
		resetInvalidFlowInputCount(from);
		return;
	}

	const { data: recentIncoming, error } = await supabase
		.from("rt_messages")
		.select("id, timestamp")
		.eq("from_number", from)
		.eq("whatsapp_number", to)
		.eq("direction", "in")
		.order("timestamp", { ascending: false })
		.limit(2);

	if (error) {
		console.error("❌ Error verificando historial para menú inicial:", error);
		return;
	}

	const totalIncoming = recentIncoming?.length || 0;
	const isFirstEver = totalIncoming <= 1;

	let isAfterInactivity = false;
	if (totalIncoming >= 2) {
		const latestMs = new Date(recentIncoming?.[0].timestamp).getTime();
		const previousMs = new Date(recentIncoming?.[1].timestamp).getTime();
		const diffHours = (latestMs - previousMs) / (1000 * 60 * 60);
		isAfterInactivity = diffHours >= 12;
	}

	// Si escribe repetidamente en poco tiempo fuera de un flujo activo, orientar sin reiniciar el flujo.
	if (
		!manualMenuTrigger &&
		!isFirstEver &&
		!isAfterInactivity &&
		totalIncoming >= 2
	) {
		const latestMs = new Date(recentIncoming?.[0].timestamp).getTime();
		const previousMs = new Date(recentIncoming?.[1].timestamp).getTime();
		const diffMinutes = (latestMs - previousMs) / (1000 * 60);

		if (diffMinutes <= SHORT_BURST_WINDOW_MINUTES) {
			const lastReplyAt = shortBurstReplyCooldownByContact.get(from) || 0;
			const nowMs = Date.now();
			if (nowMs - lastReplyAt >= SHORT_BURST_REPLY_COOLDOWN_MS) {
				shortBurstReplyCooldownByContact.set(from, nowMs);
				await sendAndStoreText560424(
					from,
					"Un agente responderá en breve. Si deseas iniciar un nuevo flujo, escribe menú.",
				);
			}
			return;
		}
	}

	if (manualMenuTrigger || isFirstEver || isAfterInactivity) {
		console.log("📋 Enviando menú inicial 560424", {
			from,
			to,
			reason: manualMenuTrigger
				? "manual_trigger"
				: isFirstEver
					? "first_message"
					: "after_inactivity",
		});
		await sendMenuButtonsFor560424(from);
	}
}

export async function processIngenitWebhookBody(body: WebhookBody) {
	const value = body?.entry?.[0]?.changes?.[0]?.value;
	const statusEvent = value?.statuses?.[0];
	const message = value?.messages?.[0];

	// Status webhooks (read/delivered/sent/failed) are valid events from Meta.
	// They should return 200 to avoid retries and webhook health degradation.
	if (statusEvent && !message) {
		return NextResponse.json({
			status: "status_event_ignored",
			event: statusEvent?.status || "unknown",
		});
	}

	const from = normalizeWhatsappNumberForComparison(message?.from);
	const to = normalizeWhatsappNumberForComparison(
		value?.metadata?.display_phone_number,
	);
	const toPhoneId = String(value?.metadata?.phone_number_id || "");
	const type = message?.type;
	const timestamp = message?.timestamp;

	if (!from || !to || !type || !timestamp) {
		return NextResponse.json({ error: "Invalid message" }, { status: 400 });
	}

	const { ingenitNumbers } = getWhatsappRoutingConfig();
	if (!isConfiguredWhatsappNumber(to, ingenitNumbers)) {
		return NextResponse.json({ status: "unknown_number" });
	}

	let content = "";
	let mediaUrl = "";
	let mediaId = "";
	let storagePath = "";
	const contactProfileName = extractContactProfileName(value, from);
	if (!contactProfileName) {
		const payload = (value || {}) as Record<string, unknown>;
		const contactsDebug = Array.isArray(payload.contacts)
			? payload.contacts
			: [];
		console.log("⚠️ contact_name no disponible en webhook", {
			from,
			to,
			contactsCount: contactsDebug.length,
			contactsPreview: contactsDebug.slice(0, 2),
		});
	}

	switch (type) {
		case "text":
			content = message.text?.body || "";
			break;
		case "image":
			mediaId = message.image?.id || "";
			mediaUrl =
				message.image?.url || `https://graph.facebook.com/v18.0/${mediaId}`;
			content = "[IMAGE]";
			break;
		case "audio":
			mediaId = message.audio?.id || "";
			mediaUrl =
				message.audio?.url || `https://graph.facebook.com/v18.0/${mediaId}`;
			content = "[AUDIO]";
			break;
		case "video":
			mediaId = message.video?.id || "";
			mediaUrl =
				message.video?.url || `https://graph.facebook.com/v18.0/${mediaId}`;
			content = "[VIDEO]";
			break;
		case "document":
			mediaId = message.document?.id || "";
			mediaUrl =
				message.document?.url || `https://graph.facebook.com/v18.0/${mediaId}`;
			content = "[DOCUMENT]";
			break;
		case "sticker":
			mediaId = message.sticker?.id || "";
			mediaUrl = `https://graph.facebook.com/v18.0/${mediaId}`;
			content = "[STICKER]";
			break;
		case "location":
			content = `[LOCATION] Lat: ${message.location?.latitude}, Lng: ${message.location?.longitude}`;
			break;
		case "contacts":
			content = `[CONTACTS] ${JSON.stringify(message.contacts)}`;
			break;
		case "button":
			content = `[BUTTON] ${message.button?.text || ""}`;
			break;
		case "interactive":
			content =
				String(message.interactive?.button_reply?.title || "").trim() ||
				String(message.interactive?.list_reply?.title || "").trim() ||
				String(message.interactive?.type || "").trim() ||
				"[INTERACTIVE]";
			break;
		default:
			content = `[UNSUPPORTED: ${type}]`;
	}

	if (
		(type === "image" ||
			type === "audio" ||
			type === "video" ||
			type === "document") &&
		mediaUrl &&
		mediaId
	) {
		const accessToken =
			process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || "";
		const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
		const supabaseServiceKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
		if (accessToken) {
			storagePath =
				(await downloadAndUploadMedia({
					mediaUrl,
					mediaId,
					type,
					contactNumber: from,
					supabaseUrl,
					supabaseServiceKey,
					accessToken,
				})) || "";
			if (storagePath) {
				mediaUrl = `${supabaseUrl}/storage/v1/object/public/ingenit/${storagePath}`;
			} else {
				console.warn(
					"⚠️ media sin upload en storage, se usará URL de fallback",
					{ mediaId, type, from, to },
				);
			}
		}
	}

	const messageTimestampIso = new Date(
		parseInt(timestamp, 10) * 1000,
	).toISOString();
	const messageData = {
		from_number: from,
		to_number: to,
		type,
		sender: "client",
		content,
		media_url: mediaUrl || null,
		media_id: mediaId || null,
		media_type: ["image", "audio", "video", "document"].includes(type)
			? type
			: null,
		storage_path: storagePath || null,
		timestamp: messageTimestampIso,
		direction: "in",
		whatsapp_number: to,
		app_id: "f6afc182-3e8e-43a8-810d-d47509e7c8e1",
		contact_name: contactProfileName || null,
	};

	let result = await supabase.from("rt_messages").insert(messageData);
	if (result.error) {
		const errMsg = String(result.error.message || "");
		if (errMsg.includes("contact_name") && errMsg.includes("column")) {
			const messageDataWithoutContactName: Record<string, unknown> = {
				...messageData,
			};
			delete messageDataWithoutContactName.contact_name;
			result = await supabase
				.from("rt_messages")
				.insert(messageDataWithoutContactName);
		}
	}
	if (result.error) {
		console.error("❌ Supabase insert error:", result.error);
		return NextResponse.json(
			{ status: "db_error", error: result.error },
			{ status: 500 },
		);
	}

	try {
		await checkAndNotifyNewContact(from, to);
	} catch (error) {
		console.warn("⚠️ Error verificando nuevo contacto:", error);
	}

	try {
		await handleNumber560424FirstMenuFlow({
			from,
			to,
			toPhoneId,
			message,
			incomingMediaUrl: mediaUrl || null,
		});
	} catch (error) {
		console.warn("⚠️ Error en flujo menú inicial 560424:", error);
	}

	return NextResponse.json({ status: "ok" });
}

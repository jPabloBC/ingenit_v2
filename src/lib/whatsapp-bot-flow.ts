// Flujo del Chatbot WhatsApp para IngenIT
// Captación de leads con fricción mínima

export interface WhatsAppLead {
	name: string;
	phone: string;
	email?: string;
	service: string;
	description: string;
	urgency: "Alta" | "Media" | "Baja";
	contact_preference: "WhatsApp" | "Llamada" | "Email";
	source: "bot_ingenit_whatsapp";
	wa_user_id: string;
	timestamp: string;
}

export interface ConversationState {
	step: number;
	data: Partial<WhatsAppLead>;
	wa_user_id: string;
	session_id: string;
}

export const BOT_FLOW = {
	// Paso 0: Bienvenida persuasiva
	WELCOME: {
		message:
			"👋 ¡Hola! Soy el asistente virtual de **IngenIT**.\n\n" +
			"Somos expertos en soluciones tecnológicas que transforman negocios. " +
			"¿Te gustaría que te ayude a identificar la mejor solución para tu empresa?\n\n" +
			"Solo necesito algunos datos básicos para conectar con el especialista adecuado. " +
			"¿Comenzamos?",
		quick_replies: [
			{ text: "✅ Sí, comenzar", payload: "START_FLOW" },
			{ text: "❌ No, gracias", payload: "END_CONVERSATION" },
		],
	},

	// Paso 1: Nombre completo
	NAME: {
		message:
			"Perfecto! 🎯\n\n" +
			"Para personalizar tu consulta, necesito tu **nombre completo**.\n\n" +
			"Ejemplo: *Juan Pérez*",
		validation: (text: string) => {
			const words = text.trim().split(/\s+/);
			if (words.length < 2) {
				return {
					valid: false,
					error: "Por favor ingresa tu nombre y apellido completo.",
				};
			}
			return { valid: true, value: text.trim() };
		},
	},

	// Paso 2: Teléfono
	PHONE: {
		message:
			"Excelente, *{name}*! 📱\n\n" +
			"Ahora necesito tu **número de teléfono** para contactarte.\n\n" +
			"Formato: *+56 9 XXXXXXXX*",
		validation: (text: string) => {
			const phoneRegex = /^\+56\s*9\s*\d{8}$/;
			if (!phoneRegex.test(text.trim())) {
				return {
					valid: false,
					error: "Formato no reconocido. Usa +56 9 XXXXXXXX",
				};
			}
			return { valid: true, value: text.trim() };
		},
	},

	// Paso 3: Email (opcional)
	EMAIL: {
		message:
			"¡Gracias! 📧\n\n" +
			"Tu **correo electrónico** es opcional, pero nos ayuda a enviarte información detallada.\n\n" +
			"¿Deseas compartirlo?",
		quick_replies: [
			{ text: "📧 Sí, agregar email", payload: "ADD_EMAIL" },
			{ text: "⏭️ Saltar", payload: "SKIP_EMAIL" },
		],
		validation: (text: string) => {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(text.trim())) {
				return {
					valid: false,
					error: "Por favor ingresa un correo electrónico válido.",
				};
			}
			return { valid: true, value: text.trim() };
		},
	},

	// Paso 4: Servicio
	SERVICE: {
		message:
			"Perfecto! 🎯\n\n" +
			"¿En qué **servicio** estás interesado?\n\n" +
			"Selecciona la opción que mejor describa tu necesidad:",
		quick_replies: [
			{ text: "💻 Desarrollo de software", payload: "SERVICE_DEVELOPMENT" },
			{ text: "⚙️ Automatización de procesos", payload: "SERVICE_AUTOMATION" },
			{ text: "🤖 Chatbot WhatsApp Business", payload: "SERVICE_CHATBOT" },
			{ text: "🔗 Integraciones/APIs", payload: "SERVICE_INTEGRATIONS" },
			{ text: "🌐 Sitios web/Landing", payload: "SERVICE_WEB" },
			{ text: "📄 Facturación electrónica SII", payload: "SERVICE_BILLING" },
			{ text: "🌐 Redes/Infraestructura", payload: "SERVICE_INFRASTRUCTURE" },
			{ text: "❓ Otro", payload: "SERVICE_OTHER" },
		],
	},

	// Paso 5: Descripción
	DESCRIPTION: {
		message:
			"¡Excelente elección! 📝\n\n" +
			"Ahora cuéntame brevemente sobre tu proyecto:\n\n" +
			"• ¿Qué objetivo quieres lograr?\n" +
			"• ¿Qué resultado esperas?\n" +
			"• ¿Hay algún desafío específico?\n\n" +
			"*(Mínimo 20 caracteres, máximo 500)*",
		validation: (text: string) => {
			const length = text.trim().length;
			if (length < 20) {
				return {
					valid: false,
					error:
						"Por favor agrega 1–2 líneas más sobre el objetivo y el resultado esperado.",
				};
			}
			if (length > 500) {
				return {
					valid: false,
					error:
						"La descripción es muy larga. Por favor resúmela en máximo 500 caracteres.",
				};
			}
			return { valid: true, value: text.trim() };
		},
	},

	// Paso 6: Urgencia
	URGENCY: {
		message: "¡Perfecto! ⏰\n\n" + "¿Cuál es la **urgencia** de tu proyecto?",
		quick_replies: [
			{ text: "🚨 Alta (48h)", payload: "URGENCY_HIGH" },
			{ text: "⏳ Media (esta semana)", payload: "URGENCY_MEDIUM" },
			{ text: "📅 Baja", payload: "URGENCY_LOW" },
		],
	},

	// Paso 7: Preferencia de contacto
	CONTACT_PREFERENCE: {
		message: "¡Genial! 📞\n\n" + "¿Cómo prefieres que te contactemos?",
		quick_replies: [
			{ text: "💬 WhatsApp", payload: "CONTACT_WHATSAPP" },
			{ text: "📞 Llamada", payload: "CONTACT_CALL" },
			{ text: "📧 Email", payload: "CONTACT_EMAIL" },
		],
	},

	// Paso 8: Resumen y confirmación
	SUMMARY: {
		message: (data: Partial<WhatsAppLead>) => {
			const emailText = data.email
				? `\n📧 *Email:* ${data.email}`
				: "\n📧 *Email:* No proporcionado";

			return (
				`📋 **RESUMEN DE TU CONSULTA**\n\n` +
				`👤 *Nombre:* ${data.name}\n` +
				`📱 *Teléfono:* ${data.phone}${emailText}\n` +
				`🎯 *Servicio:* ${data.service}\n` +
				`📝 *Descripción:* ${data.description}\n` +
				`⏰ *Urgencia:* ${data.urgency}\n` +
				`📞 *Contacto preferido:* ${data.contact_preference}\n\n` +
				`¿Está todo correcto?`
			);
		},
		quick_replies: [
			{ text: "✅ Enviar consulta", payload: "CONFIRM_LEAD" },
			{ text: "✏️ Editar datos", payload: "EDIT_LEAD" },
		],
	},

	// Paso 9: Confirmación final
	CONFIRMATION: {
		message: (data: Partial<WhatsAppLead>) => {
			const contactInfo = {
				WhatsApp: "te escribiré por WhatsApp",
				Llamada: "te llamaré por teléfono",
				Email: "te enviaré un email",
			};

			return (
				`🎉 **¡CONSULTA ENVIADA EXITOSAMENTE!**\n\n` +
				`Gracias por confiar en **IngenIT**, *${data.name}*.\n\n` +
				`Un especialista ${contactInfo[data.contact_preference ?? "WhatsApp"]} en las próximas **${data.urgency === "Alta" ? "48 horas" : data.urgency === "Media" ? "esta semana" : "próximos días"}**.\n\n` +
				`🔒 *Tus datos están protegidos según nuestra política de privacidad.*\n\n` +
				`¿Hay algo más en lo que pueda ayudarte?`
			);
		},
		quick_replies: [
			{ text: "💬 Nueva consulta", payload: "NEW_CONSULTATION" },
			{ text: "👋 Finalizar", payload: "END_CONVERSATION" },
		],
	},
};

// Mapeo de servicios
export const SERVICE_MAP = {
	SERVICE_DEVELOPMENT: "Desarrollo de software",
	SERVICE_AUTOMATION: "Automatización de procesos",
	SERVICE_CHATBOT: "Chatbot WhatsApp Business",
	SERVICE_INTEGRATIONS: "Integraciones/APIs",
	SERVICE_WEB: "Sitios web/Landing",
	SERVICE_BILLING: "Facturación electrónica SII",
	SERVICE_INFRASTRUCTURE: "Redes/Infraestructura",
	SERVICE_OTHER: "Otro",
};

// Mapeo de urgencias
export const URGENCY_MAP = {
	URGENCY_HIGH: "Alta",
	URGENCY_MEDIUM: "Media",
	URGENCY_LOW: "Baja",
};

// Mapeo de preferencias de contacto
export const CONTACT_MAP = {
	CONTACT_WHATSAPP: "WhatsApp",
	CONTACT_CALL: "Llamada",
	CONTACT_EMAIL: "Email",
};

import nodemailer from "nodemailer";

type SendWhatsappAlertEmailParams = {
	contactPhone: string;
	whatsappNumber: string;
	requestBaseUrl?: string;
};

function resolveBaseUrl(requestBaseUrl?: string) {
	const resolvedVercelUrl = process.env.VERCEL_URL
		? `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "")}`
		: "";

	return (
		requestBaseUrl ||
		process.env.NEXT_PUBLIC_BASE_URL ||
		process.env.BASE_URL ||
		resolvedVercelUrl ||
		(process.env.NODE_ENV === "production"
			? "https://ingenit.cl"
			: "http://localhost:3000")
	);
}

export async function sendWhatsappAlertEmail(
	params: SendWhatsappAlertEmailParams,
) {
	const { contactPhone, whatsappNumber, requestBaseUrl } = params;
	const baseUrl = resolveBaseUrl(requestBaseUrl);

	const transporter = nodemailer.createTransport({
		host: "smtp.titan.email",
		port: 587,
		secure: false,
		auth: {
			user: process.env.EMAIL_USER || "gerencia@ingenit.cl",
			pass: process.env.EMAIL_PASS || "an<s651eM813Per<",
		},
		tls: {
			rejectUnauthorized: false,
		},
		encoding: "utf-8",
	});

	try {
		const verifyResult = await new Promise((resolve, reject) => {
			transporter.verify((err, success) => {
				if (err) return reject(err);
				resolve(success);
			});
		});
		console.log("📩 SMTP verify result:", verifyResult);
	} catch (verifyErr) {
		console.error("❌ SMTP verify failed:", verifyErr);
	}

	const timestamp = new Date().toLocaleString("es-CL", {
		timeZone: "America/Santiago",
	});
	const chatUrl = `${baseUrl}/admin/chat?phone=${encodeURIComponent(whatsappNumber)}`;
	const htmlBody = `
    <!doctype html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Nuevo mensaje WhatsApp - ingenIT</title>
      <style>
        body { margin:0; padding:0; background:#f2f2f2; font-family:Arial, Helvetica, sans-serif; color:#1a1a1a; }
        table { border-collapse:collapse; }
        .wrapper { width:100%; background:#f2f2f2; padding:24px 12px; }
        .card { width:100%; max-width:680px; margin:0 auto; background:#ffffff; border:1px solid #ccd6e0; border-radius:18px; overflow:hidden; }
        .top { background:#001e40; padding:0; color:#ffffff; }
        .top-accent { height:6px; background:#005050; }
        .top-inner { padding:24px 24px 22px; }
        .brand-row { width:100%; }
        .icon-cell { width:56px; vertical-align:top; }
        .icon-wrap { width:44px; height:44px; border:1px solid rgba(255,255,255,0.26); border-radius:12px; text-align:center; vertical-align:middle; }
        .badge { display:inline-block; font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; background:#005abf; color:#ffffff; padding:6px 10px; border-radius:999px; }
        .title { margin:12px 0 6px 0; font-size:24px; line-height:1.2; font-weight:700; color:#ffffff; }
        .subtitle { margin:0; color:#99adc2; font-size:13px; line-height:1.5; }
        .content { padding:24px; }
        .intro { margin:0 0 18px 0; color:#333333; font-size:15px; line-height:1.6; }
        .panel { width:100%; border:1px solid #ccd6e0; border-radius:14px; overflow:hidden; background:#ffffff; }
        .row-label { width:188px; background:#f2f2f2; color:#003366; font-weight:700; font-size:13px; padding:12px 14px; border-bottom:1px solid #e6e6e6; }
        .row-value { color:#1a1a1a; font-size:13px; padding:12px 14px; border-bottom:1px solid #e6e6e6; word-break:break-word; }
        .row-last .row-label, .row-last .row-value { border-bottom:none; }
        .mono { font-family:Consolas, Monaco, 'Courier New', monospace; }
        .section-title { margin:0 0 10px 0; font-size:13px; letter-spacing:.04em; text-transform:uppercase; color:#335c85; font-weight:700; }
        .cta-wrap { margin-top:20px; }
        .cta { display:inline-block; background:#005abf; color:#ffffff !important; text-decoration:none; font-size:14px; font-weight:700; padding:12px 18px; border-radius:10px; }
        .helper-box { margin-top:16px; padding:14px 16px; border-radius:12px; background:#f2f2f2; border:1px solid #e6e6e6; }
        .helper { margin:0; color:#4d4d4d; font-size:12px; line-height:1.6; }
        .helper a { color:#003c80; text-decoration:none; word-break:break-all; }
        .footer { padding:16px 24px 22px; color:#666666; font-size:12px; border-top:1px solid #e6e6e6; background:#f2f2f2; line-height:1.6; }
        @media screen and (max-width: 600px) {
          .wrapper { padding:12px 0; }
          .card { border-radius:0; border-left:none; border-right:none; }
          .top-inner { padding:20px 18px 18px; }
          .content { padding:18px; }
          .footer { padding:14px 18px 18px; }
          .title { font-size:21px; }
          .icon-cell { width:48px; }
          .icon-wrap { width:38px; height:38px; border-radius:10px; }
          .stack-row,
          .stack-row tbody,
          .stack-row tr,
          .stack-row td { display:block !important; width:100% !important; }
          .row-label { border-bottom:none; padding-bottom:4px; }
          .row-value { padding-top:0; }
          .stack-row-single td { display:block !important; width:100% !important; }
          .cta { display:block; text-align:center; width:100%; box-sizing:border-box; }
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <table class="card" role="presentation" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td class="top">
              <div class="top-accent"></div>
              <div class="top-inner">
                <table class="brand-row" role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td class="icon-cell">
                      <table class="icon-wrap" role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" valign="middle">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                              <path d="M7 10.5H17M7 14H13.5M6 4H18C19.1046 4 20 4.89543 20 6V15C20 16.1046 19.1046 17 18 17H11L7 20V17H6C4.89543 17 4 16.1046 4 15V6C4 4.89543 4.89543 4 6 4Z" stroke="#FFFFFF" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td valign="top">
                      <span class="badge">Alerta interna</span>
                      <h1 class="title">Nuevo mensaje recibido por WhatsApp</h1>
                      <p class="subtitle">Sistema de comunicaciones de ingenIT. Revisión recomendada desde el panel administrativo.</p>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          <tr>
            <td class="content">
              <p class="intro">Se detectó un nuevo mensaje entrante y requiere revisión en el panel de chats.</p>
              <p class="section-title">Detalle del mensaje</p>
              <table class="panel stack-row" role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td class="row-label">Numero de contacto</td>
                  <td class="row-value mono">${contactPhone}</td>
                </tr>
                <tr>
                  <td class="row-label">Linea de WhatsApp</td>
                  <td class="row-value mono">${whatsappNumber}</td>
                </tr>
                <tr class="row-last">
                  <td class="row-label">Fecha y hora</td>
                  <td class="row-value">${timestamp} (America/Santiago)</td>
                </tr>
              </table>
              <table class="stack-row-single" role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td class="cta-wrap">
                    <a class="cta" href="${chatUrl}" target="_blank" rel="noopener noreferrer">Abrir panel de chats</a>
                  </td>
                </tr>
              </table>
              <div class="helper-box">
                <p class="helper">
                  Si el botón no funciona, abre este enlace manualmente:<br />
                  <a href="${chatUrl}" target="_blank" rel="noopener noreferrer">${chatUrl}</a>
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td class="footer">Mensaje automático generado por la plataforma ingenIT. Este correo fue emitido por una regla de monitoreo de conversaciones entrantes.</td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;

	const textBody = `
NUEVO MENSAJE DETECTADO - WHATSAPP

Numero del contacto: ${contactPhone}
Numero de WhatsApp: ${whatsappNumber}
Fecha y hora: ${timestamp}
Enlace al chat: ${chatUrl}

Se detectó un nuevo mensaje entrante y requiere revisión en el panel de chats.
  `;

	const mailOptions = {
		from: `"Sistema de Alertas - ingenIT" <${process.env.EMAIL_USER || "gerencia@ingenit.cl"}>`,
		to: "gerencia@ingenit.cl",
		subject: `Nuevo mensaje WhatsApp (${whatsappNumber}): ${contactPhone}`,
		text: textBody,
		html: htmlBody,
	};

	console.log("✉️ Mail options prepared:", {
		subject: mailOptions.subject,
		to: mailOptions.to,
		from: mailOptions.from,
		baseUrl,
	});

	return transporter.sendMail(mailOptions);
}

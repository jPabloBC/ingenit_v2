import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { contactPhone, whatsappNumber } = await request.json();
    
    console.log('📧 Enviando alerta de nuevo contacto WhatsApp:', contactPhone);

    const transporter = nodemailer.createTransport({
      host: 'smtp.titan.email',
      port: 587,
      secure: false, // true para 465, false para otros puertos
      auth: {
        user: process.env.EMAIL_USER || 'gerencia@ingenit.cl',
        pass: process.env.EMAIL_PASS || 'an<s651eM813Per<'
      },
      tls: {
        rejectUnauthorized: false
      },
      // Configuración de codificación para evitar caracteres extraños
      encoding: 'utf-8'
    });

    // Verify SMTP connection/auth early to get clearer errors in logs
    try {
      const verifyResult = await new Promise((resolve, reject) => {
        transporter.verify((err, success) => {
          if (err) return reject(err);
          resolve(success);
        });
      });
      console.log('📩 SMTP verify result:', verifyResult);
    } catch (verifyErr) {
      console.error('❌ SMTP verify failed:', verifyErr);
      // continue to attempt sendMail; the error will be surfaced on send
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (process.env.NODE_ENV === 'production' ? 'https://ingenit.cl' : 'http://localhost:3000');

    const htmlBody = `
      <!doctype html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Nuevo contacto - ingenIT</title>
        <style>
          body { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; margin:0; padding:0; background:#f4f6f8; color:#1f2937 }
          .container { max-width:680px; margin:28px auto; background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 6px 18px rgba(15,23,42,0.06) }
          .header { padding:20px 24px; background:#0f172a; color:#ffffff }
          .header h1 { margin:0; font-size:18px; font-weight:600 }
          .body { padding:24px }
          .muted { color:#6b7280; font-size:13px }
          .info { width:100%; border-collapse:collapse; margin-top:12px }
          .info td { padding:10px 8px; border-top:1px solid #eef2f7 }
          .label { width:160px; color:#374151; font-weight:600 }
          .value { color:#0f172a; font-family: 'Courier New', monospace }
          .cta { display:inline-block; margin-top:18px; background:#0f172a; color:#fff; padding:10px 14px; border-radius:6px; text-decoration:none }
          .footer { padding:16px 24px; font-size:12px; color:#9ca3af; background:#fbfdff }
          @media (max-width:520px){ .label{width:120px} .header h1{font-size:16px} }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Nuevo contacto detectado</h1>
            <div class="muted">Notificación automática — sistema de administración</div>
          </div>
          <div class="body">
            <p style="margin:0 0 8px 0; color:#111827; font-size:15px">Se ha recibido un nuevo mensaje. A continuación los detalles:</p>
            <table class="info">
              <tr><td class="label">Contacto</td><td class="value">${contactPhone}</td></tr>
              <tr><td class="label">WhatsApp</td><td class="value">${whatsappNumber}</td></tr>
              <tr><td class="label">Fecha</td><td class="value">${new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' })}</td></tr>
            </table>

            <a class="cta" href="${baseUrl}/admin/chat?phone=${encodeURIComponent(whatsappNumber)}" target="_blank">Abrir panel de administración</a>
          </div>
          <div class="footer">ingenIT — Sistema de Chat</div>
        </div>
      </body>
      </html>
    `;

    const textBody = `
      ========================================
      NUEVO CONTACTO DETECTADO - WHATSAPP
      ingenIT - Sistema de Alertas
      ========================================
      
      🆕 Nuevo Contacto en WhatsApp
      
      📋 DETALLES DEL CONTACTO:
      - Número del Contacto: ${contactPhone}
      - Número de WhatsApp: ${whatsappNumber}
      - Fecha y Hora: ${new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' })}
      
      🚨 ACCIÓN REQUERIDA:
      Se ha detectado un nuevo contacto en WhatsApp. Se recomienda revisar el panel de administración 
      para responder al mensaje y gestionar el contacto.
      
      ========================================
      Este es un mensaje automático del sistema de alertas.
      Sistema de Chat - ingenIT
      ========================================
    `;

    const mailOptions = {
      from: `"Sistema de Alertas - ingenIT" <${process.env.EMAIL_USER || 'gerencia@ingenit.cl'}>`,
      to: 'gerencia@ingenit.cl',
      subject: `Nuevo contacto WhatsApp (${whatsappNumber}): ${contactPhone}`,
      text: textBody,
      html: htmlBody
    };

    // Log mail options (masking potential sensitive fields) to help debugging
    try {
      const masked = { ...mailOptions, from: mailOptions.from, to: mailOptions.to };
      console.log('✉️ Mail options prepared:', { subject: masked.subject, to: masked.to, from: masked.from });
    } catch (logErr) {
      console.warn('⚠️ Error logging mail options:', logErr);
    }

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Alerta de nuevo contacto enviada:', info.messageId);
    
    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      message: 'Alerta de nuevo contacto enviada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error enviando alerta de WhatsApp:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

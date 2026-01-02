import { NextRequest, NextResponse } from 'next/server';
import * as nodemailer from 'nodemailer';
import { supabase } from '@/lib/supabaseClient';
import path from 'path';
import { readFile } from 'fs/promises';

// Configurar límite de tamaño para Vercel Functions
export const maxDuration = 30; // 30 segundos máximo
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { quoteData, recipientEmail, quoteId } = body;

    // Si no se provee `quoteData` pero se entrega `quoteId`, obtener la cotización desde la DB
    if ((!quoteData || Object.keys(quoteData).length === 0) && quoteId) {
      try {
        const { data, error } = await supabase
          .from('rt_quotes')
          .select('*')
          .eq('id', quoteId)
          .single();
        if (error) throw error;
        quoteData = data as any;
      } catch (err) {
        console.error('❌ Error obteniendo cotización desde DB:', err);
        return NextResponse.json({ success: false, error: 'No se pudo obtener la cotización' }, { status: 500 });
      }
    }

    // Soporte de preview: si se llama con ?preview=true o body.preview === true
    const previewFlag = (request.nextUrl && request.nextUrl.searchParams.get('preview') === 'true') || (quoteData && quoteData.preview === true) || (body && body.preview === true);

    // Configurar el transportador de correo con Titan
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

    // Leer logo desde /public para usarlo como imagen inline (CID)
    let logoBuffer: Buffer | undefined;
    try {
      const logoPath = path.join(process.cwd(), 'public', 'assets', 'logo_transparent_ingenIT.png');
      const file = await readFile(logoPath);
      logoBuffer = Buffer.from(file);
    } catch (e) {
      console.warn('⚠️ No se pudo cargar el logo para el email:', e);
    }

    // Preparar el contenido del correo
    // Limpiar el asunto para evitar caracteres especiales
    const cleanQuoteNumber = (quoteData.quote_number || quoteData.id || '').toString()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    const cleanProjectTitle = (quoteData.project_title || '').toString()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 50); // Limitar a 50 caracteres
    
    const subject = `Cotizacion ${cleanQuoteNumber} - ${cleanProjectTitle}`;
    const subtotal = (quoteData.total_amount || 0) + (quoteData.equipment_total || 0);

    // Calcular descuento
    let discountAmount = 0;
    if (quoteData.discount_type && quoteData.discount_type !== 'none' && quoteData.discount_value) {
      if (quoteData.discount_type === 'percentage') {
        discountAmount = (subtotal * quoteData.discount_value) / 100;
      } else {
        discountAmount = quoteData.discount_value;
      }
    }

    const totalAfterDiscount = Math.max(subtotal - (discountAmount || 0), 0);

    // IVA calculado sobre el total después del descuento
    const ivaAmount = Math.round(totalAfterDiscount * 0.19);
    const totalConIva = Math.round((totalAfterDiscount + ivaAmount) * 100) / 100;

    // IVA y total sobre el subtotal sin descuento (Total s/desc. + IVA)
    const ivaOnSubtotal = Math.round((subtotal * 0.19 + Number.EPSILON) * 100) / 100;
    const totalWithoutDiscountWithIva = Math.round(((subtotal + ivaOnSubtotal) + Number.EPSILON) * 100) / 100;

    // Suscripción
    const subscriptionEnabled = Boolean(quoteData.subscription_enabled) || Number(quoteData.subscription_monthly) > 0;
    const subscriptionMonthly = Number(quoteData.subscription_monthly) || 0;
    const subscriptionIvaIncluded = Boolean(quoteData.iva_included);
    
    // Normalizar teléfono para evitar prefijos repetidos y espacios raros
    const rawPhone = (quoteData.client_phone || '').toString().trim().replace(/\s+/g, ' ');
    let phoneDisplay = rawPhone.replace(/^(\+\d+)\s+\1\s+/,'$1 ');
    
    const htmlBody = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="x-apple-disable-message-reformatting">
        <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
        <title>Cotización ${quoteData.quote_number || quoteData.id}</title>
        <style>
          html, body { margin:0; padding:0; height:100%; }
          body { width:100% !important; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; font-family: Arial, 'Segoe UI', Tahoma, sans-serif; background:#f8f9fa; color:#2c3e50; }
          img { border:0; outline:none; text-decoration:none; display:block; }
          a { color:#0078ff; text-decoration:none; }
          .container { width:100%; max-width:700px; background:#ffffff; }
          .p-32 { padding:32px; }
          .header { background:#003c80; color:#ffffff; padding:14px 12px; text-align:center; }
          .h1 { margin:0; font-size:22px; font-weight:400; letter-spacing:0.5px; white-space:nowrap; }
          .sub { margin:6px 0 0 0; font-size:14px; opacity:0.9; }
          .card { background:#ffffff; border:1px solid #e3f2fd; border-radius:12px; }
          .h3 { margin:0 0 10px 0; font-size:18px; color:#0078ff; }
          .row { border-bottom:1px solid #e3f2fd; padding:8px 0; font-size:14px; }
          .row:last-child { border-bottom:none; }
          .btn { background:#0078ff; color:#ffffff !important; padding:12px 24px; border-radius:24px; font-weight:600; display:inline-block; }
          .note { font-size:13px; color:#6c757d; }
          .footer { background:#f3f4f6; color:#374151; text-align:center; padding:24px 16px; }
          .contact { font-size:14px; margin:4px 0; color:#4b5563; }
          @media only screen and (max-width:600px) {
            .container { max-width:100% !important; }
            .p-32 { padding:20px !important; }
            .h1 { font-size:18px !important; white-space:nowrap; }
            .btn { width:80% !important; display:block !important; margin:0 auto !important; text-align:center !important; }
          }
          @media (prefers-color-scheme: dark) {
            body { background:#0e1624; color:#e8eef4; }
            .container, .card { background:#0f1b2b; border-color:#1b2636; }
            .header { background:#003c80; }
            .h3 { color:#66aeff; }
            .row { border-color:#1b2636; }
            .btn { background:#3393ff; }
            .note { color:#a8b3bd; }
            .footer { background:#111827; color:#e5e7eb; }
            .contact { color:#cfd8e3; }
          }
        </style>
      </head>
      <body>
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">Cotización ${quoteData.quote_number || ''} - ${quoteData.project_title || ''}</div>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f8f9fa" align="center">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" class="container" style="max-width:700px;margin:0 auto;">
                <tr>
                  <td class="header">
                    <div class="h1">Cotización ${quoteData.quote_number || quoteData.id}</div>
                  </td>
                </tr>
                <tr>
                  <td class="p-32">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr><td style="font-size:16px; margin:0 0 16px 0;">Estimado/a <strong>${quoteData.client_name}</strong>,</td></tr>
                      <tr><td style="font-size:14px;">Adjunto encontrará el documento PDF con los detalles técnicos y comerciales de su cotización.</td></tr>
                      <tr><td height="16"></td></tr>
                      <tr>
                        <td class="card p-32">
                          <div class="h3">Detalles del Proyecto</div>
                          <div class="row"><strong>Proyecto:</strong> ${quoteData.project_title}</div>
                          ${quoteData.project_description ? `<div class="row"><strong>Descripción:</strong> ${quoteData.project_description}</div>` : ''}
                          <div class="row"><strong>Cliente:</strong> ${quoteData.client_name}</div>
                          ${phoneDisplay ? `<div class=\"row\"><strong>Teléfono:</strong> ${phoneDisplay}</div>` : ''}
                        </td>
                      </tr>
                      ${subscriptionEnabled ? `
                      <tr><td height="16"></td></tr>
                      <tr>
                        <td class="card p-32">
                          <div class="h3">Suscripción</div>
                          ${subscriptionIvaIncluded ? `
                          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                            <tr>
                              <td style="padding:8px 0; color:#2c3e50;">Suscripción (mensual)</td>
                              <td style="padding:8px 0; color:#2c3e50; text-align:right;">$${new Intl.NumberFormat('es-CL').format(subscriptionMonthly)} (IVA incluido)</td>
                            </tr>
                          </table>
                          ` : `
                          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                            <tr>
                              <td style="padding:8px 0; color:#2c3e50;">Suscripción (base)</td>
                              <td style="padding:8px 0; color:#2c3e50; text-align:right;">$${new Intl.NumberFormat('es-CL').format(subscriptionMonthly)}</td>
                            </tr>
                            <tr>
                              <td style="padding:8px 0; color:#2c3e50;">IVA 19%</td>
                              <td style="padding:8px 0; color:#2c3e50; text-align:right;">$${new Intl.NumberFormat('es-CL').format(Math.round(subscriptionMonthly * 0.19))}</td>
                            </tr>
                            <tr style="font-weight:bold">
                              <td style="padding:8px 0; color:#2c3e50;">Total suscripción</td>
                              <td style="padding:8px 0; color:#2c3e50; text-align:right;">$${new Intl.NumberFormat('es-CL').format(Math.round(subscriptionMonthly * 1.19))}</td>
                            </tr>
                          </table>
                          `}
                        </td>
                      </tr>
                      <tr><td height="16"></td></tr>
                      ` : '<tr><td height="16"></td></tr>'}
                      <tr>
                        <td class="card p-32">
                          <div class="h3">Resumen de la cotización</div>
                          ${quoteData.selected_services && quoteData.selected_services.length > 0 ? `
                          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                            <tr>
                              <td style="padding:8px 0; color:#2c3e50;">Servicios incluidos</td>
                              <td style="padding:8px 0; color:#2c3e50; text-align:right;">${quoteData.selected_services.length}</td>
                            </tr>
                          </table>
                          ` : ''}
                          ${quoteData.selected_equipment && quoteData.selected_equipment.length > 0 ? `
                          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                            <tr>
                              <td style="padding:8px 0; color:#2c3e50;">Equipos incluidos</td>
                              <td style="padding:8px 0; color:#2c3e50; text-align:right;">${quoteData.selected_equipment.length}</td>
                            </tr>
                          </table>
                          ` : ''}
                          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                            <tr style="border-bottom:1px solid #e3f2fd;">
                              <td style="padding:8px 0; color:#2c3e50;">Subtotal</td>
                              <td style="padding:8px 0; color:#2c3e50; text-align:right;">$${new Intl.NumberFormat('es-CL').format(subtotal)}</td>
                            </tr>
                            <tr style="border-bottom:1px solid #e3f2fd;">
                              <td style="padding:8px 0; color:#2c3e50;">Total s/desc. + IVA</td>
                              <td style="padding:8px 0; color:#2c3e50; text-align:right;">$${new Intl.NumberFormat('es-CL').format(totalWithoutDiscountWithIva)}</td>
                            </tr>
                            ${discountAmount && discountAmount > 0 ? `
                            <tr style="border-bottom:1px solid #e3f2fd;">
                              <td style="padding:8px 0; color:#2c3e50;">Descuento</td>
                              <td style="padding:8px 0; color:#2c3e50; text-align:right;">- $${new Intl.NumberFormat('es-CL').format(Math.round(discountAmount))}</td>
                            </tr>
                            <tr style="border-bottom:1px solid #e3f2fd;">
                              <td style="padding:8px 0; color:#2c3e50;">Total después del descuento</td>
                              <td style="padding:8px 0; color:#2c3e50; text-align:right;">$${new Intl.NumberFormat('es-CL').format(Math.round(totalAfterDiscount))}</td>
                            </tr>
                            ` : ''}
                            <tr style="border-bottom:1px solid #e3f2fd;">
                              <td style="padding:8px 0; color:#2c3e50;">IVA 19%</td>
                              <td style="padding:8px 0; color:#2c3e50; text-align:right;">$${new Intl.NumberFormat('es-CL').format(ivaAmount)}</td>
                            </tr>
                            <tr>
                              <td style="padding:10px 0; font-weight:bold; color:#2c3e50;">Total</td>
                              <td style="padding:10px 0; font-weight:bold; color:#2c3e50; text-align:right;">$${new Intl.NumberFormat('es-CL').format(totalConIva)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr><td height="16"></td></tr>
                      <tr>
                        <td align="center" style="text-align:center;">
                          <a href="https://wa.me/56990206618?text=${encodeURIComponent('Hola, quisiera consultar sobre la cotización ' + (quoteData.quote_number || ''))}" class="btn" style="margin:0 auto;">Contactar equipo</a>
                        </td>
                      </tr>
                      <tr><td height="12"></td></tr>
                      <tr>
                        <td class="note"><strong>Nota:</strong> Esta cotización es válida por 7 días desde su emisión. El PDF con el detalle completo está adjunto.</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td class="footer">
                    <img src="cid:logoIngenIT" alt="ingenIT" width="160" style="width:160px;max-width:160px;height:auto;margin:0 auto 8px auto;" />
                    <div class="contact">gerencia@ingenit.cl</div>
                    <div class="contact">www.ingenit.cl</div>
                    <div class="contact">+56 9 9020 6618</div>
                    <div class="contact">Antofagasta, Chile</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>`;

    const textBody = `
      ========================================
      COTIZACIÓN ${quoteData.quote_number || quoteData.id}
      IngenIT
      ========================================
      
      Estimado/a ${quoteData.client_name},
      
      Es un placer presentarle nuestra cotización profesional para su proyecto.
      
      DETALLES DEL PROYECTO:
      - Proyecto: ${quoteData.project_title}
      ${quoteData.project_description ? `- Descripción: ${quoteData.project_description}` : ''}
      - Cliente: ${quoteData.client_name}
      ${quoteData.client_email ? `- Email: ${quoteData.client_email}` : ''}
      ${quoteData.client_phone ? `- Teléfono: ${quoteData.client_phone}` : ''}
      
      RESUMEN DE LA COTIZACIÓN:
      ${quoteData.selected_services && quoteData.selected_services.length > 0 ? `- Servicios: ${quoteData.selected_services.length} servicio(s)` : ''}
      ${quoteData.selected_equipment && quoteData.selected_equipment.length > 0 ? `- Equipos: ${quoteData.selected_equipment.length} equipo(s)` : ''}
      - Subtotal: $${new Intl.NumberFormat('es-CL').format(subtotal)}
      ${discountAmount && discountAmount > 0 ? `- Descuento: - $${new Intl.NumberFormat('es-CL').format(Math.round(discountAmount))}
      - Total después del descuento: $${new Intl.NumberFormat('es-CL').format(Math.round(totalAfterDiscount))}
      ` : ''}- IVA 19%: $${new Intl.NumberFormat('es-CL').format(ivaAmount)}
      - Total: $${new Intl.NumberFormat('es-CL').format(totalConIva)}
      ${subscriptionEnabled ? (subscriptionIvaIncluded ? `- Suscripción (mensual): $${new Intl.NumberFormat('es-CL').format(subscriptionMonthly)} (IVA incluido)
      ` : `- Suscripción (base): $${new Intl.NumberFormat('es-CL').format(subscriptionMonthly)}
      - IVA 19%: $${new Intl.NumberFormat('es-CL').format(Math.round(subscriptionMonthly * 0.19))}
      - Total suscripción: $${new Intl.NumberFormat('es-CL').format(Math.round(subscriptionMonthly * 1.19))}
      `) : ''}
      
      El PDF con los detalles completos se encuentra adjunto a este correo.
      
      Si tiene alguna pregunta o necesita aclaraciones, no dude en contactarnos.
      
      Saludos cordiales,
      Equipo de IngenIT
      
      ========================================
      CONTACTO:
      Email: gerencia@ingenit.cl
      Web: www.ingenit.cl
      Teléfono: +56 9 9020 6618
      Dirección: Antofagasta, Chile
      ========================================
    `;

    // Configurar las opciones del correo
    // Limpiar nombres para evitar caracteres especiales
    const cleanFileName = (quoteData.client_name || '').replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
    const cleanQuoteNumberForFile = (quoteData.quote_number || quoteData.id || '').toString().replace(/[^\w\s-]/g, '');
    
    const attachments = [
      {
        filename: `Cotizacion_${cleanQuoteNumberForFile}_${cleanFileName}.pdf`,
        content: quoteData.pdfBase64,
        encoding: 'base64'
      } as any
    ];
    if (logoBuffer) {
      attachments.push({
        filename: 'logo_transparent_ingenIT.png',
        content: logoBuffer,
        cid: 'logoIngenIT'
      } as any);
    }

    const mailOptions = {
      from: `"Cotización IngenIT" <${process.env.EMAIL_USER || 'gerencia@ingenit.cl'}>`,
      to: recipientEmail,
      subject: subject,
      text: textBody,
      html: htmlBody,
      attachments
    };

    if (previewFlag) {
      // Devolver previsualización sin enviar
      return NextResponse.json({ success: true, preview: true, html: htmlBody, text: textBody });
    }

    // Enviar el correo
    const info = await transporter.sendMail(mailOptions);

    console.log('✅ Correo enviado exitosamente:', info.messageId);

    // Enviar notificación interna de control usando la ruta interna
    try {
      await fetch(new URL('/api/send-internal-notification', request.url).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteData, recipientEmail: recipientEmail || quoteData.client_email, messageId: info.messageId })
      });
      console.log('🔔 Notificación interna solicitada');
    } catch (notifyErr) {
      console.warn('⚠️ No se pudo solicitar notificación interna:', notifyErr);
    }

    return NextResponse.json({ 
      success: true, 
      messageId: info.messageId,
      message: 'Correo enviado exitosamente' 
    });

  } catch (error) {
    console.error('❌ Error enviando correo:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error enviando el correo',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

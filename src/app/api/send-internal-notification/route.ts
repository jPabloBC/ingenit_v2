import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { quoteData, recipientEmail, messageId } = await request.json();
    
    console.log('📧 Enviando notificación interna para cotización:', quoteData.quote_number);

    const smtpHost = process.env.SMTP_HOST || 'smtp.titan.email';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

    // Asegurar las credenciales: preferir SMTP_USER/SMTP_PASS, caer a EMAIL_* (como hace send-quote-email)
    let authUser = smtpUser || process.env.EMAIL_USER;
    let authPass = smtpPass || process.env.EMAIL_PASS;
    // Si aún no hay credenciales, usar los mismos valores por defecto que usa la ruta de envío al cliente
    if (!authUser || !authPass) {
      console.warn('⚠️ Credenciales SMTP incompletas — usando valores por defecto (sujeto a rechazo por el servidor)');
      authUser = authUser || process.env.EMAIL_USER || 'gerencia@ingenit.cl';
      authPass = authPass || process.env.EMAIL_PASS || 'an<s651eM813Per<';
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for other ports
      auth: { user: authUser, pass: authPass },
      tls: {
        rejectUnauthorized: false
      },
      encoding: 'utf-8'
    });

    const subtotal = (quoteData.total_amount || 0) + (quoteData.equipment_total || 0);

    // Calcular descuento (misma lógica que send-quote-email)
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

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
        <div style="background: #003c80; color: white; padding: 15px; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 18px;">Control Interno - Cotizacion Enviada</h2>
          <p style="margin: 5px 0 0 0; font-size: 14px;">IngenIT - Sistema de Cotizaciones</p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr style="background: #f5f5f5;">
            <td colspan="2" style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Informacion de la Cotizacion</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; width: 40%; font-weight: bold;">Numero de Cotizacion:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${quoteData.quote_number || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Cliente:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${quoteData.client_name}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Email del Cliente:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${recipientEmail}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Telefono:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${quoteData.client_phone || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Proyecto:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${quoteData.project_title}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Fecha de Envio:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' })}</td>
          </tr>
        </table>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr style="background: #f5f5f5;">
            <td colspan="2" style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Resumen Financiero</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; width: 60%;">Subtotal:</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${subtotal.toLocaleString('es-CL')}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">Total s/desc. + IVA:</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${totalWithoutDiscountWithIva.toLocaleString('es-CL')}</td>
          </tr>
          ${discountAmount && discountAmount > 0 ? `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">Descuento:</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: #d63031;">-$${Math.round(discountAmount).toLocaleString('es-CL')}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">Total despues del descuento:</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${Math.round(totalAfterDiscount).toLocaleString('es-CL')}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">IVA (19%):</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${ivaAmount.toLocaleString('es-CL')}</td>
          </tr>
          <tr style="background: #f5f5f5; font-weight: bold;">
            <td style="padding: 8px; border: 1px solid #ddd;">Total:</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-size: 16px;">$${totalConIva.toLocaleString('es-CL')}</td>
          </tr>
          ${subscriptionEnabled ? `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">Suscripcion Mensual:</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${subscriptionMonthly.toLocaleString('es-CL')}${subscriptionIvaIncluded ? ' (IVA inc.)' : ''}</td>
          </tr>
          ` : ''}
        </table>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr style="background: #f5f5f5;">
            <td colspan="2" style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Detalles Tecnicos</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; width: 60%;">Servicios incluidos:</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${quoteData.selected_services ? quoteData.selected_services.length : 0}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">Equipos incluidos:</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${quoteData.selected_equipment ? quoteData.selected_equipment.length : 0}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">ID del Mensaje:</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-family: monospace; font-size: 12px;">${messageId}</td>
          </tr>
        </table>
        
        <div style="margin-top: 30px; padding-top: 15px; border-top: 2px solid #ddd; text-align: center; color: #666; font-size: 12px;">
          <p style="margin: 5px 0;">Mensaje automatico de control interno</p>
          <p style="margin: 5px 0;">Sistema de Cotizaciones - IngenIT</p>
        </div>
      </div>
    `;

    // Envolver en documento HTML completo y asegurar charset UTF-8
    const htmlBody = `<!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8">
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Notificación interna - Cotización enviada</title>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>`;

    const textBody = `
Notificacion de envio - ${quoteData.quote_number || 'N/A'}

Cliente: ${quoteData.client_name}
Proyecto: ${quoteData.project_title}
Enviado a: ${recipientEmail}
Fecha: ${new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' })}
Mensaje ID: ${messageId}

RESUMEN FINANCIERO:
Subtotal: $${subtotal.toLocaleString('es-CL')}
Total s/desc. + IVA: $${totalWithoutDiscountWithIva.toLocaleString('es-CL')}
${discountAmount && discountAmount > 0 ? `Descuento: -$${Math.round(discountAmount).toLocaleString('es-CL')}
Total despues del descuento: $${Math.round(totalAfterDiscount).toLocaleString('es-CL')}
` : ''}IVA (19%): $${ivaAmount.toLocaleString('es-CL')}
Total: $${totalConIva.toLocaleString('es-CL')}
${subscriptionEnabled ? `Suscripcion Mensual: $${subscriptionMonthly.toLocaleString('es-CL')}${subscriptionIvaIncluded ? ' (IVA inc.)' : ''}
` : ''}
Servicios: ${quoteData.selected_services ? quoteData.selected_services.length : 0}
Equipos: ${quoteData.selected_equipment ? quoteData.selected_equipment.length : 0}
    `;

    // Determinar dirección remitente que efectivamente se usará en el envelope (debe coincidir con la cuenta autenticada)
    const envelopeFrom = authUser || process.env.EMAIL_USER || 'gerencia@ingenit.cl';

    const internalMailOptions: any = {
      from: `"IngenIT" <${envelopeFrom}>`,
      to: 'gerencia@ingenit.cl',
      subject: `Cotizacion enviada - ${quoteData.client_name}`,
      text: textBody,
      html: htmlBody,
      // Forzar envelope para que MAIL FROM coincida con la cuenta autenticada
      envelope: {
        from: envelopeFrom,
        to: 'gerencia@ingenit.cl'
      }
    };

    // Soporte de preview: si se llama con ?preview=true o quoteData.preview === true
    const previewFlag = (request.nextUrl && request.nextUrl.searchParams.get('preview') === 'true') || (quoteData && quoteData.preview === true);

    if (previewFlag) {
      // Devolver el HTML y el texto para previsualización sin enviar el correo
      return NextResponse.json({
        success: true,
        preview: true,
        html: htmlBody,
        text: textBody
      });
    }

    try {
      const internalInfo = await transporter.sendMail(internalMailOptions);
      console.log('✅ Notificación interna enviada:', internalInfo.messageId);
      return NextResponse.json({
        success: true,
        messageId: internalInfo.messageId,
        message: 'Notificación interna enviada exitosamente'
      });
    } catch (sendErr) {
      console.error('❌ Error enviando notificación interna:', sendErr);
      return NextResponse.json({ success: false, error: sendErr instanceof Error ? sendErr.message : 'Error interno de envío' }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Error enviando notificación interna:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

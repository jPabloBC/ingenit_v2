import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { quoteData, recipientEmail, messageId } = await request.json();
    
    console.log('📧 Enviando notificación interna para cotización:', quoteData.quote_number);

    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      },
      encoding: 'utf-8'
    });

    const subtotal = (quoteData.total_amount || 0) + (quoteData.equipment_total || 0);
    const ivaAmount = Math.round(subtotal * 0.19);
    const totalConIva = subtotal + ivaAmount;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <div style="background: linear-gradient(135deg, #003c80 0%, #005abf 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">📧 Notificación Interna - Cotización Enviada</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Control de Envío - ingenIT</p>
        </div>
        
        <div style="background: white; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e9ecef;">
          <h2 style="color: #333; margin-top: 0; border-bottom: 2px solid #005abf; padding-bottom: 10px;">
            ✅ Cotización Enviada Exitosamente
          </h2>
          
          <div style="background: #e8f4fd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #005abf;">
            <h3 style="margin: 0 0 15px 0; color: #333;">📋 Detalles de la Cotización</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555; width: 150px;">Número de Cotización:</td>
                <td style="padding: 8px 0; color: #333;">${quoteData.quote_number || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Cliente:</td>
                <td style="padding: 8px 0; color: #333;">${quoteData.client_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Email del Cliente:</td>
                <td style="padding: 8px 0; color: #333;">${recipientEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Teléfono:</td>
                <td style="padding: 8px 0; color: #333;">${quoteData.client_phone || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Proyecto:</td>
                <td style="padding: 8px 0; color: #333;">${quoteData.project_title}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Fecha de Envío:</td>
                <td style="padding: 8px 0; color: #333;">${new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' })}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #f0f8ff; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h3 style="margin: 0 0 15px 0; color: #333;">💰 Resumen Financiero</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Subtotal:</td>
                <td style="padding: 8px 0; color: #333; text-align: right;">$${subtotal.toLocaleString('es-CL')}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">IVA (19%):</td>
                <td style="padding: 8px 0; color: #333; text-align: right;">$${ivaAmount.toLocaleString('es-CL')}</td>
              </tr>
              <tr style="border-top: 2px solid #005abf;">
                <td style="padding: 8px 0; font-weight: bold; color: #333; font-size: 16px;">Total:</td>
                <td style="padding: 8px 0; color: #333; font-size: 16px; font-weight: bold; text-align: right;">$${totalConIva.toLocaleString('es-CL')}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h3 style="margin: 0 0 15px 0; color: #333;">📊 Detalles del Contenido</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Servicios:</td>
                <td style="padding: 8px 0; color: #333;">${quoteData.selected_services ? quoteData.selected_services.length : 0} servicio(s)</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Equipos:</td>
                <td style="padding: 8px 0; color: #333;">${quoteData.selected_equipment ? quoteData.selected_equipment.length : 0} equipo(s)</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">ID del Mensaje:</td>
                <td style="padding: 8px 0; color: #333; font-family: monospace;">${messageId}</td>
              </tr>
            </table>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; text-align: center;">
            <p style="color: #666; margin: 5px 0;">Este es un mensaje automático de control interno.</p>
            <p style="color: #666; margin: 5px 0;">Sistema de Cotizaciones - ingenIT</p>
          </div>
        </div>
      </div>
    `;

    const textBody = `
      ========================================
      NOTIFICACIÓN INTERNA - COTIZACIÓN ENVIADA
      ingenIT - Control de Envío
      ========================================
      
      ✅ Cotización Enviada Exitosamente
      
      📋 DETALLES DE LA COTIZACIÓN:
      - Número de Cotización: ${quoteData.quote_number || 'N/A'}
      - Cliente: ${quoteData.client_name}
      - Email del Cliente: ${recipientEmail}
      - Teléfono: ${quoteData.client_phone || 'N/A'}
      - Proyecto: ${quoteData.project_title}
      - Fecha de Envío: ${new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' })}
      
      💰 RESUMEN FINANCIERO:
      - Subtotal: $${subtotal.toLocaleString('es-CL')}
      - IVA (19%): $${ivaAmount.toLocaleString('es-CL')}
      - Total: $${totalConIva.toLocaleString('es-CL')}
      
      📊 DETALLES DEL CONTENIDO:
      - Servicios: ${quoteData.selected_services ? quoteData.selected_services.length : 0} servicio(s)
      - Equipos: ${quoteData.selected_equipment ? quoteData.selected_equipment.length : 0} equipo(s)
      - ID del Mensaje: ${messageId}
      
      ========================================
      Este es un mensaje automático de control interno.
      Sistema de Cotizaciones - ingenIT
      ========================================
    `;

    const internalMailOptions = {
      from: `"Sistema de Cotizaciones - ingenIT" <${process.env.SMTP_USER}>`,
      to: 'gerencia@ingenit.cl',
      subject: `📧 Control: Cotización ${quoteData.quote_number || quoteData.id} enviada a ${quoteData.client_name}`,
      text: textBody,
      html: htmlBody
    };

    const internalInfo = await transporter.sendMail(internalMailOptions);
    
    console.log('✅ Notificación interna enviada:', internalInfo.messageId);
    
    return NextResponse.json({
      success: true,
      messageId: internalInfo.messageId,
      message: 'Notificación interna enviada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error enviando notificación interna:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

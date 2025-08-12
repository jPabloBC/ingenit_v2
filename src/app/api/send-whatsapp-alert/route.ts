import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { contactPhone, whatsappNumber } = await request.json();
    
    console.log('📧 Enviando alerta de nuevo contacto WhatsApp:', contactPhone);

    const transporter = nodemailer.createTransport({
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

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <div style="background: linear-gradient(135deg, #003c80 0%, #005abf 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">🆕 Nuevo Contacto Detectado</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Sistema de Alertas - ingenIT</p>
        </div>
        
        <div style="background: white; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e9ecef;">
          <h2 style="color: #333; margin-top: 0; border-bottom: 2px solid #005abf; padding-bottom: 10px;">
            📱 Nuevo Contacto en WhatsApp
          </h2>
          
          <div style="background: #e8f4fd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #005abf;">
            <h3 style="margin: 0 0 15px 0; color: #333;">📋 Detalles del Contacto</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555; width: 150px;">Número del Contacto:</td>
                <td style="padding: 8px 0; color: #333; font-family: monospace;">${contactPhone}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Número de WhatsApp:</td>
                <td style="padding: 8px 0; color: #333; font-family: monospace;">${whatsappNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Fecha y Hora:</td>
                <td style="padding: 8px 0; color: #333;">${new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' })}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h3 style="margin: 0 0 15px 0; color: #333;">🚨 Acción Requerida</h3>
            <p style="color: #666; line-height: 1.6; margin: 0;">
              Se ha detectado un nuevo contacto en WhatsApp. Se recomienda revisar el panel de administración 
              para responder al mensaje y gestionar el contacto.
            </p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; text-align: center;">
            <p style="color: #666; margin: 5px 0;">Este es un mensaje automático del sistema de alertas.</p>
            <p style="color: #666; margin: 5px 0;">Sistema de Chat - ingenIT</p>
          </div>
        </div>
      </div>
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
      from: `"Sistema de Alertas - ingenIT" <${process.env.SMTP_USER}>`,
      to: 'gerencia@ingenit.cl',
      subject: `🆕 Nuevo contacto WhatsApp: ${contactPhone}`,
      text: textBody,
      html: htmlBody
    };

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

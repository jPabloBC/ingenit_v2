import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Configuración para Vercel Functions
export const maxDuration = 60; // 60 segundos
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { quoteData, recipientEmail } = await request.json();
    
    console.log('📧 Enviando PDF grande por email a:', recipientEmail);
    console.log('📊 Tamaño del PDF:', Math.round((quoteData.pdfBase64.length * 3) / 4 / 1024 / 1024 * 100) / 100, 'MB');

    // Limpiar el asunto para evitar caracteres especiales
    const cleanQuoteNumber = (quoteData.quote_number || quoteData.id || '').toString().replace(/[^\w\s-]/g, '');
    const cleanProjectTitle = (quoteData.project_title || '').toString().replace(/[^\w\s-]/g, '');
    const subject = `Cotizacion ${cleanQuoteNumber} - ${cleanProjectTitle}`;
    
    const subtotal = (quoteData.total_amount || 0) + (quoteData.equipment_total || 0);
    const ivaAmount = Math.round(subtotal * 0.19);
    const totalConIva = subtotal + ivaAmount;

    // Configurar el transportador de correo con límites aumentados
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
      encoding: 'utf-8',
      // Configuraciones para archivos grandes
      maxConnections: 1,
      maxMessages: 1,
      pool: false
    });

    // Preparar el contenido del correo
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #003c80 0%, #005abf 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">ingenIT</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Cotización Profesional</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e9ecef;">
          <h2 style="color: #333; margin-top: 0;">Estimado/a ${quoteData.client_name},</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Adjunto encontrará nuestra cotización detallada para el proyecto: <strong>${quoteData.project_title}</strong>
          </p>
          
          <div style="background: white; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #005abf;">
            <h3 style="margin: 0 0 10px 0; color: #333;">Resumen de la Cotización:</h3>
            <p style="margin: 5px 0; color: #666;"><strong>Número de Cotización:</strong> ${quoteData.quote_number || 'N/A'}</p>
            <p style="margin: 5px 0; color: #666;"><strong>Subtotal:</strong> $${subtotal.toLocaleString('es-CL')}</p>
            <p style="margin: 5px 0; color: #666;"><strong>IVA (19%):</strong> $${ivaAmount.toLocaleString('es-CL')}</p>
            <p style="margin: 5px 0; color: #666; font-size: 18px;"><strong>Total:</strong> $${totalConIva.toLocaleString('es-CL')}</p>
          </div>
          
          <p style="color: #666; line-height: 1.6;">
            Esta cotización incluye todos los detalles técnicos, especificaciones y términos comerciales. 
            Si tiene alguna pregunta o necesita aclaraciones, no dude en contactarnos.
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
            <p style="color: #666; margin: 5px 0;"><strong>Atentamente,</strong></p>
            <p style="color: #666; margin: 5px 0;">Equipo ingenIT</p>
            <p style="color: #666; margin: 5px 0;">${process.env.SMTP_USER}</p>
          </div>
        </div>
      </div>
    `;

    const textBody = `
      ingenIT - Cotización Profesional

      Estimado/a ${quoteData.client_name},

      Adjunto encontrará nuestra cotización detallada para el proyecto: ${quoteData.project_title}

      Resumen de la Cotización:
      - Número de Cotización: ${quoteData.quote_number || 'N/A'}
      - Subtotal: $${subtotal.toLocaleString('es-CL')}
      - IVA (19%): $${ivaAmount.toLocaleString('es-CL')}
      - Total: $${totalConIva.toLocaleString('es-CL')}

      Esta cotización incluye todos los detalles técnicos, especificaciones y términos comerciales.
      Si tiene alguna pregunta o necesita aclaraciones, no dude en contactarnos.

      Atentamente,
      Equipo ingenIT
      ${process.env.SMTP_USER}
    `;

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

    // Enviar el correo
    const mailOptions = {
      from: `"ingenIT" <${process.env.SMTP_USER}>`,
      to: recipientEmail,
      subject: subject,
      text: textBody,
      html: htmlBody,
      attachments: attachments
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email enviado exitosamente:', info.messageId);
    
    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      message: 'Email enviado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error enviando email:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

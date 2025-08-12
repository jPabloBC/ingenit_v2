import { NextRequest, NextResponse } from 'next/server';
import * as nodemailer from 'nodemailer';
import path from 'path';
import { readFile } from 'fs/promises';

// Configuración para Vercel Functions
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

// Almacenamiento temporal de chunks (en producción usar Redis o similar)
const chunkStorage = new Map<string, { chunks: string[], metadata: any }>();

export async function POST(request: NextRequest) {
  try {
    const { quoteData, recipientEmail } = await request.json();

    // Si es el primer chunk, inicializar almacenamiento
    if (quoteData.isFirstChunk) {
      const sessionId = `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      chunkStorage.set(sessionId, {
        chunks: new Array(quoteData.totalChunks).fill(''),
        metadata: quoteData
      });
      
      // Guardar primer chunk
      chunkStorage.get(sessionId)!.chunks[0] = quoteData.pdfBase64;
      
      return NextResponse.json({ 
        success: true, 
        sessionId,
        message: 'Primer chunk recibido' 
      });
    }

    // Si es un chunk intermedio o final
    const sessionId = request.headers.get('x-session-id');
    if (!sessionId || !chunkStorage.has(sessionId)) {
      return NextResponse.json(
        { success: false, error: 'Sesión no encontrada' },
        { status: 400 }
      );
    }

    const storage = chunkStorage.get(sessionId)!;
    storage.chunks[quoteData.chunkIndex] = quoteData.pdfBase64;

    // Si es el último chunk, procesar y enviar email
    if (quoteData.isLastChunk) {
      // Reconstruir PDF completo
      const fullPdfBase64 = storage.chunks.join('');
      const metadata = storage.metadata;
      
      // Limpiar almacenamiento
      chunkStorage.delete(sessionId);
      
      // Enviar email con PDF completo
      return await sendEmailWithPDF(metadata, fullPdfBase64, recipientEmail);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Chunk ${quoteData.chunkIndex + 1} recibido` 
    });

  } catch (error) {
    console.error('❌ Error procesando chunk:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error procesando chunk',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

async function sendEmailWithPDF(quoteData: any, pdfBase64: string, recipientEmail: string) {
  try {
    // Configurar el transportador de correo con Titan
    const transporter = nodemailer.createTransporter({
      host: 'smtp.titan.email',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER || 'gerencia@ingenit.cl',
        pass: process.env.EMAIL_PASS || 'an<s651eM813Per<'
      },
      tls: {
        rejectUnauthorized: false
      },
      encoding: 'utf-8'
    });

    // Leer logo
    let logoBuffer: Buffer | undefined;
    try {
      const logoPath = path.join(process.cwd(), 'public', 'assets', 'logo_transparent_ingenIT.png');
      const file = await readFile(logoPath);
      logoBuffer = Buffer.from(file);
    } catch (e) {
      console.warn('⚠️ No se pudo cargar el logo para el email:', e);
    }

    // Preparar contenido del correo
    const cleanQuoteNumber = (quoteData.quote_number || quoteData.id || '').toString().replace(/[^\w\s-]/g, '');
    const cleanProjectTitle = (quoteData.project_title || '').toString().replace(/[^\w\s-]/g, '');
    const subject = `Cotizacion ${cleanQuoteNumber} - ${cleanProjectTitle}`;
    
    const subtotal = (quoteData.total_amount || 0) + (quoteData.equipment_total || 0);
    const ivaAmount = Math.round(subtotal * 0.19);
    const totalConIva = subtotal + ivaAmount;
    
    // Normalizar teléfono
    const rawPhone = (quoteData.client_phone || '').toString().trim().replace(/\s+/g, ' ');
    let phoneDisplay = rawPhone.replace(/^(\+\d+)\s+\1\s+/,'$1 ');
    
    // HTML del email (simplificado para chunks)
    const htmlBody = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <title>Cotización ${cleanQuoteNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; background:#f8f9fa; color:#2c3e50; }
          .container { max-width:700px; background:#ffffff; margin:0 auto; }
          .header { background:#003c80; color:#ffffff; padding:14px; text-align:center; }
          .content { padding:32px; }
          .card { background:#ffffff; border:1px solid #e3f2fd; border-radius:12px; padding:24px; margin:16px 0; }
          .btn { background:#0078ff; color:#ffffff; padding:12px 24px; border-radius:24px; text-decoration:none; display:inline-block; }
          .footer { background:#f3f4f6; text-align:center; padding:24px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Cotización ${cleanQuoteNumber}</h1>
          </div>
          <div class="content">
            <p>Estimado/a <strong>${quoteData.client_name}</strong>,</p>
            <p>Adjunto encontrará el documento PDF con los detalles técnicos y comerciales de su cotización.</p>
            
            <div class="card">
              <h3>Detalles del Proyecto</h3>
              <p><strong>Proyecto:</strong> ${quoteData.project_title}</p>
              <p><strong>Cliente:</strong> ${quoteData.client_name}</p>
              ${phoneDisplay ? `<p><strong>Teléfono:</strong> ${phoneDisplay}</p>` : ''}
            </div>
            
            <div class="card">
              <h3>Resumen de la cotización</h3>
              <p><strong>Subtotal:</strong> $${new Intl.NumberFormat('es-CL').format(subtotal)}</p>
              <p><strong>IVA 19%:</strong> $${new Intl.NumberFormat('es-CL').format(ivaAmount)}</p>
              <p><strong>Total:</strong> $${new Intl.NumberFormat('es-CL').format(totalConIva)}</p>
            </div>
            
            <div style="text-align:center; margin:32px 0;">
              <a href="https://wa.me/56990206618?text=${encodeURIComponent('Hola, quisiera consultar sobre la cotización ' + cleanQuoteNumber)}" class="btn">
                Contactar equipo
              </a>
            </div>
          </div>
          <div class="footer">
            <p><strong>IngenIT - Soluciones Tecnológicas</strong></p>
            <p>gerencia@ingenit.cl | www.ingenit.cl</p>
            <p>+56 9 9020 6618 | Antofagasta, Chile</p>
          </div>
        </div>
      </body>
      </html>`;

    // Configurar attachments
    const cleanFileName = (quoteData.client_name || '').replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
    const cleanQuoteNumberForFile = (quoteData.quote_number || quoteData.id || '').toString().replace(/[^\w\s-]/g, '');
    
    const attachments = [
      {
        filename: `Cotizacion_${cleanQuoteNumberForFile}_${cleanFileName}.pdf`,
        content: pdfBase64,
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
      html: htmlBody,
      attachments
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Correo enviado exitosamente desde chunks:', info.messageId);

    return NextResponse.json({ 
      success: true, 
      messageId: info.messageId,
      message: 'Correo enviado exitosamente desde chunks' 
    });

  } catch (error) {
    console.error('❌ Error enviando correo desde chunks:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error enviando el correo desde chunks',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

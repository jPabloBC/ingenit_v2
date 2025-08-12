import jsPDF from 'jspdf';

// Función para cargar fuentes web (opcional)
const loadWebFont = async (fontUrl: string, fontName: string) => {
  try {
    const response = await fetch(fontUrl);
    const fontArrayBuffer = await response.arrayBuffer();
    return { fontArrayBuffer, fontName };
  } catch (error) {
    console.warn(`No se pudo cargar la fuente ${fontName}:`, error);
    return null;
  }
};

// Configuración de fuentes personalizadas
const FONTS = {
  title: 'helvetica', // Para títulos principales
  subtitle: 'helvetica', // Para subtítulos
  body: 'helvetica', // Para texto normal
  bold: 'helvetica', // Para texto en negrita
  light: 'helvetica' // Para texto ligero
};

// Colores de Tailwind config.js - USAR DIRECTAMENTE
const TAILWIND_COLORS = {
  // Azules de tailwind.config.js
  blue1: '#001a33',
  blue2: '#001e40',
  blue3: '#00264d',
  blue4: '#003c80',
  blue5: '#003366',
  blue6: '#005abf', // Color principal
  blue7: '#335c85',
  blue8: '#0078ff', // Color secundario
  blue9: '#6685a3',
  blue10: '#3393ff',
  blue11: '#99adc2',
  blue12: '#66aeff',
  blue13: '#ccd6e0',
  blue14: '#99c9ff',
  blue15: '#cce4ff', // Azul claro
  
  // Grises de tailwind.config.js
  gray1: '#1a1a1a',
  gray2: '#333333', // Texto principal
  gray3: '#4d4d4d',
  gray4: '#666666', // Texto secundario
  gray5: '#808080',
  gray6: '#999999',
  gray7: '#b3b3b3',
  gray8: '#cccccc', // Bordes
  gray9: '#e6e6e6',
  gray10: '#f2f2f2',
  
  // Colores básicos
  black: '#000000',
  white: '#ffffff',
};

// Ahora usamos directamente los nombres de Tailwind en todo el código

// Cache del logo para repetirlo en headers de páginas siguientes
let CACHED_LOGO_BASE64: string | null = null;

interface QuoteData {
  client_rut?: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  client_address: string;
  client_region: string;
  client_commune: string;
  project_title: string;
  project_description: string;
  selected_services: any[];
  selected_equipment: any[];
  total_amount: number;
  equipment_total: number;
  valid_until: string;
  notes: string;
  terms_conditions: string;
  quote_number?: string;
  created_at: string;
  discount_type?: 'none' | 'percentage' | 'amount';
  discount_value?: number;
  discount_description?: string;
  final_total?: number;
  validity_message?: string; // Nuevo campo para mensaje personalizado de validez
}

export const generateProfessionalQuotePDF = async (quoteData: QuoteData): Promise<jsPDF> => {
  
  // Debug: Mostrar estructura de datos
  console.log('=== DATOS DE COTIZACIÓN ===');
  console.log('Servicios:', quoteData.selected_services);
  console.log('Equipos:', quoteData.selected_equipment);
  
  // Optimización: Configurar jsPDF para reducir tamaño
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true, // Comprimir el PDF
    putOnlyUsedFonts: true, // Solo incluir fuentes usadas
    floatPrecision: 2 // Reducir precisión de números flotantes
  });
  
  if (quoteData.selected_services && quoteData.selected_services.length > 0) {
    quoteData.selected_services.forEach((service, index) => {
      console.log(`Servicio ${index + 1}:`, service);
      if (service.granularComponents) {
        console.log(`Componentes granulares del servicio ${index + 1}:`, service.granularComponents);
      }
    });
  }
  
  if (quoteData.selected_equipment && quoteData.selected_equipment.length > 0) {
    quoteData.selected_equipment.forEach((equipment, index) => {
      console.log(`Equipo ${index + 1}:`, equipment);
      if (equipment.granularComponents) {
        console.log(`Componentes granulares del equipo ${index + 1}:`, equipment.granularComponents);
      }
    });
  }
  
  // Usar la instancia de pdf ya creada con optimizaciones
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  // Configurar fuentes
  pdf.setFont('helvetica');
  
  let yPosition = margin;
  let currentPage = 1;

  // Header con franja superior
  yPosition = await drawSimpleHeader(pdf, yPosition, pageWidth, margin, quoteData);
  
  // Información del cliente y empresa
  yPosition = drawClientAndCompanyInfo(pdf, quoteData, yPosition, margin, contentWidth);
  
  // La fecha y número de cotización ahora están en el header
  
  // Resumen del proyecto (título y descripción)
  yPosition = drawProjectSummary(pdf, quoteData, yPosition, margin, contentWidth);
  
  // Servicios individuales
  yPosition = drawIndividualServices(pdf, quoteData, yPosition, margin, contentWidth);
  
  // Equipos individuales
  yPosition = drawIndividualEquipment(pdf, quoteData, yPosition, margin, contentWidth);
  
  // Resumen de costos
  yPosition = drawCostSummary(pdf, quoteData, yPosition, margin, contentWidth);
  
  // Información de pago y notas (sin el comentario de validez)
  yPosition = drawPaymentAndNotes(pdf, quoteData, yPosition, margin, contentWidth);
  
  // Obtener el número total de páginas
  const totalPages = pdf.getNumberOfPages();
  
  // Footer con franja inferior y paginación
  drawSimpleFooter(pdf, pageHeight, margin, contentWidth, currentPage, totalPages);
  
  // Actualizar la paginación en todas las páginas
  updatePaginationOnAllPages(pdf, margin, contentWidth);
  
  // Comentario de validez SOLO en la última página, encima de la paginación
  drawValidityCommentOnLastPage(pdf, quoteData, margin, contentWidth);

  return pdf;
};

const drawSimpleHeader = async (pdf: jsPDF, yPosition: number, pageWidth: number, margin: number, quoteData: QuoteData): Promise<number> => {
  // Franja superior crecida un 5% (de 15 a 15.75)
  const headerHeight = 15.75;
  pdf.setFillColor(TAILWIND_COLORS.blue4); // Usar nombre directo de Tailwind
  pdf.rect(0, 0, pageWidth, headerHeight, 'F');
  
  try {
    // Cargar el logo real de ingenIT
    const logoResponse = await fetch('/assets/logo_transparent_ingenIT_white.png');
    const logoBlob = await logoResponse.blob();
    const logoBase64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(logoBlob);
    });
    CACHED_LOGO_BASE64 = logoBase64;
    
    // Insertar el logo crecido un 20% (de 30 a 36.2)
    const logoWidth = 36.2; // Ancho del logo crecido un 20%
    const logoHeight = 0; // Alto del logo (proporción 2:1)
    const logoX = margin + 5;
    const logoY = 4; // Añadir margen superior al logo
    
    pdf.addImage(logoBase64, 'PNG', logoX, logoY, logoWidth, logoHeight);
    
  } catch (error) {
    console.warn('No se pudo cargar el logo, usando texto:', error);
    
    // Fallback: Logo de texto más pequeño
    pdf.setFontSize(16); // Crecer un poco el texto del logo
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(TAILWIND_COLORS.white); // Usar nombre directo de Tailwind
    
    // Primera parte del logo (ingen)
    pdf.text('ingen', margin + 5, 12);
    
    // Segunda parte del logo (IT)
    const ingenWidth = pdf.getTextWidth('ingen');
    pdf.text('IT', margin + 5 + ingenWidth, 12);
  }
  
  // Título de la cotización más a la derecha y más grande
  pdf.setFontSize(28); // Reducir ligeramente para hacerlo más delgado
  pdf.setTextColor(TAILWIND_COLORS.gray10); // Usar nombre directo de Tailwind
  pdf.setFont('helvetica', 'normal'); // Mantener Helvetica normal
  pdf.text('COTIZACIÓN', pageWidth - margin - 0, yPosition + 12, { align: 'right' });
  
  // Fecha y número de cotización a la izquierda, misma altura que el título
  const currentDate = new Date().toLocaleDateString('es-CL');
  const quoteNumber = quoteData.quote_number || 'Sin número';
  
  pdf.setFontSize(11);
  pdf.setTextColor(TAILWIND_COLORS.gray7); // Usar nombre directo de Tailwind
  pdf.setFont('helvetica', 'normal');
  
  // Fecha en la izquierda, misma altura que COTIZACIÓN
  pdf.text(`Fecha: ${currentDate}`, margin, yPosition + 8);
  
  // Número de cotización en la izquierda, debajo de la fecha
  pdf.text(`${quoteNumber}`, margin, yPosition + 14);
  
  return yPosition + 25; // Aumentar significativamente el margen inferior para más espacio
};

// Header para páginas nuevas: SOLO franja azul y logo (sin título, sin fecha/número)
const drawRepeatHeader = (pdf: jsPDF, yPosition: number, pageWidth: number, margin: number, quoteData: QuoteData): number => {
  const headerHeight = 15.75;
  pdf.setFillColor(TAILWIND_COLORS.blue4);
  pdf.rect(0, 0, pageWidth, headerHeight, 'F');

  // Dibujar el logo igual que en la primera página usando cache si existe
  const logoWidth = 36.2;
  const logoX = margin + 5;
  const logoY = 4;
  if (CACHED_LOGO_BASE64) {
    try {
      pdf.addImage(CACHED_LOGO_BASE64, 'PNG', logoX, logoY, logoWidth, 0);
    } catch {
      // Fallback simple en texto, sin alterar estilos globales
      const previousColor = TAILWIND_COLORS.white; // solo referencia
      pdf.setTextColor(TAILWIND_COLORS.white);
      pdf.text('ingen', margin + 5, 12);
      const ingenWidth = pdf.getTextWidth('ingen');
      pdf.text('IT', margin + 5 + ingenWidth, 12);
      // No restauramos explícitamente porque el contenido siguiente siempre define su estilo
    }
  } else {
    // Si no hay cache (por ejemplo, si la primera página usó fallback), replicamos fallback
    pdf.setTextColor(TAILWIND_COLORS.white);
    pdf.text('ingen', margin + 5, 12);
    const ingenWidth = pdf.getTextWidth('ingen');
    pdf.text('IT', margin + 5 + ingenWidth, 12);
  }

  return yPosition + 25;
};

// Agregar nueva página dibujando solo el header (el footer de la página anterior debe dibujarse ANTES del salto)
const addNewPageWithHeader = (pdf: jsPDF, quoteData: QuoteData, margin: number): number => {
  pdf.addPage();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const newY = drawRepeatHeader(pdf, margin, pageWidth, margin, quoteData);
  // Asegurar que el contenido siguiente no herede negrita accidentalmente
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(TAILWIND_COLORS.gray2);
  return newY;
};

// Reimprimir encabezados de la sección de servicios tras salto de página
const printServicesSectionHeaders = (pdf: jsPDF, yPosition: number, margin: number): number => {
  // Título de sección
  pdf.setFontSize(14);
  pdf.setTextColor(TAILWIND_COLORS.blue7);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SERVICIOS INCLUIDOS', margin, yPosition);
  yPosition += 8;

  // Encabezados de tabla
  const tableHeaders = ['Concepto', 'Cantidad', 'Precio', 'Total'];
  const tableWidths = [80, 25, 35, 35];
  const tableX = margin;

  pdf.setFontSize(11);
  pdf.setTextColor(TAILWIND_COLORS.gray2);
  pdf.setFont('helvetica', 'bold');

  let xPos = tableX;
  pdf.text(tableHeaders[0], xPos + 2, yPosition, { align: 'left' });
  xPos += tableWidths[0];
  pdf.text(tableHeaders[1], xPos + (tableWidths[1] / 2), yPosition, { align: 'center' });
  xPos += tableWidths[1];
  pdf.text(tableHeaders[2], xPos + tableWidths[2] - 2, yPosition, { align: 'right' });
  xPos += tableWidths[2];
  pdf.text(tableHeaders[3], xPos + tableWidths[3] - 2, yPosition, { align: 'right' });

  yPosition += 8;
  // Línea separadora
  pdf.setDrawColor(TAILWIND_COLORS.gray8);
  pdf.setLineWidth(0.5);
  pdf.line(tableX, yPosition - 5, tableX + tableWidths[0] + tableWidths[1] + tableWidths[2] + tableWidths[3], yPosition - 5);
  // Dejar tipografía en normal para las filas siguientes
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(TAILWIND_COLORS.gray2);
  return yPosition;
};

// Reimprimir encabezados de la sección de equipos tras salto de página
const printEquipmentSectionHeaders = (pdf: jsPDF, yPosition: number, margin: number): number => {
  // Título de sección
  pdf.setFontSize(14);
  pdf.setTextColor(TAILWIND_COLORS.blue7);
  pdf.setFont('helvetica', 'bold');
  pdf.text('EQUIPOS INCLUIDOS', margin, yPosition);
  yPosition += 8;

  // Encabezados de tabla
  const tableHeaders = ['Concepto', 'Cantidad', 'Precio', 'Total'];
  const tableWidths = [80, 25, 35, 35];
  const tableX = margin;

  pdf.setFontSize(11);
  pdf.setTextColor(TAILWIND_COLORS.gray2);
  pdf.setFont('helvetica', 'bold');

  let xPos = tableX;
  pdf.text(tableHeaders[0], xPos + 2, yPosition, { align: 'left' });
  xPos += tableWidths[0];
  pdf.text(tableHeaders[1], xPos + (tableWidths[1] / 2), yPosition, { align: 'center' });
  xPos += tableWidths[1];
  pdf.text(tableHeaders[2], xPos + tableWidths[2] - 2, yPosition, { align: 'right' });
  xPos += tableWidths[2];
  pdf.text(tableHeaders[3], xPos + tableWidths[3] - 2, yPosition, { align: 'right' });

  yPosition += 8;
  // Línea separadora
  pdf.setDrawColor(TAILWIND_COLORS.gray8);
  pdf.setLineWidth(0.5);
  pdf.line(tableX, yPosition - 5, tableX + tableWidths[0] + tableWidths[1] + tableWidths[2] + tableWidths[3], yPosition - 5);
  // Dejar tipografía en normal para las filas siguientes
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(TAILWIND_COLORS.gray2);
  return yPosition;
};
const drawClientAndCompanyInfo = (pdf: jsPDF, quoteData: QuoteData, yPosition: number, margin: number, contentWidth: number): number => {
  // Datos de la empresa ocupando todo el ancho (sin título)
  pdf.setFontSize(10);
  pdf.setTextColor(TAILWIND_COLORS.blue9); // Usar nombre directo de Tailwind
  pdf.setFont('helvetica', 'normal');
  
  const companyInfo = [
    { label: 'Nombre', value: 'IngenIT SpA' },
    { label: 'Dirección', value: 'Antofagasta, Chile' },
    { label: 'Mail', value: 'gerencia@ingenit.cl' },
    { label: 'Teléfono', value: '+56 9 9020 6618' }
  ];
  
  // Mostrar datos de empresa en dos columnas
  let col1Y = yPosition;
  let col2Y = yPosition;
  
  companyInfo.forEach((info, index) => {
    const isLeftColumn = index < 2;
    const currentY = isLeftColumn ? col1Y : col2Y;
    const xPos = isLeftColumn ? margin : margin + contentWidth / 2;
    
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${info.label}:`, xPos, currentY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(info.value, xPos + 25, currentY);
    
    if (isLeftColumn) {
      col1Y += 6;
    } else {
      col2Y += 6;
    }
  });
  
  yPosition += 10; // Reducir espacio entre empresa y cliente
  
  // Línea separadora
  pdf.setDrawColor(TAILWIND_COLORS.blue9); // Usar nombre directo de Tailwind
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPosition, margin + contentWidth, yPosition);
  
  yPosition += 13; // Reducir espacio después de línea
  
  // Título de datos del cliente
  pdf.setFontSize(12);
  pdf.setTextColor(TAILWIND_COLORS.gray8); // Usar nombre directo de Tailwind
  pdf.setFont('helvetica', 'normal');
  pdf.text('DATOS DEL CLIENTE', margin, yPosition);
  
  yPosition += 6; // Reducir espacio entre título y datos
  
  // Información del cliente ocupando toda la pantalla
  pdf.setFontSize(10);
  pdf.setTextColor(TAILWIND_COLORS.gray4); // Usar nombre directo de Tailwind
  pdf.setFont('helvetica', 'normal');
  
  const clientInfo = [
    { label: 'Nombre', value: quoteData.client_name },
    { label: 'RUT', value: quoteData.client_rut || 'No especificado' },
    { label: 'Dirección', value: quoteData.client_address },
    { label: 'Mail', value: quoteData.client_email },
    { label: 'Teléfono', value: quoteData.client_phone }
  ];
  
  // 1) Línea completa para Nombre
  const nameField = clientInfo[0];
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${nameField.label}:`, margin, yPosition);
  pdf.setFont('helvetica', 'normal');
  pdf.text(nameField.value, margin + 25, yPosition);
  
  // Espaciado después de la fila de Nombre
  yPosition += 6;
  
  // 2) Resto de campos en dos columnas
  const remainingFields = clientInfo.slice(1); // RUT, Dirección, Mail, Teléfono
  let clientCol1Y = yPosition;
  let clientCol2Y = yPosition;
  const leftColumnCount = Math.ceil(remainingFields.length / 2); // Distribución equilibrada
  
  remainingFields.forEach((info, index) => {
    const isLeftColumn = index < leftColumnCount;
    const currentY = isLeftColumn ? clientCol1Y : clientCol2Y;
    const xPos = isLeftColumn ? margin : margin + contentWidth / 2;
    
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${info.label}:`, xPos, currentY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(info.value || '—', xPos + 25, currentY);
    
    if (isLeftColumn) {
      clientCol1Y += 6;
    } else {
      clientCol2Y += 6;
    }
  });
  
  // Calcular la base inferior usada y devolver con un pequeño margen
  const bottomY = Math.max(clientCol1Y, clientCol2Y);
  return bottomY + 8;
};



const drawProjectSummary = (pdf: jsPDF, quoteData: QuoteData, yPosition: number, margin: number, contentWidth: number): number => {
  // Salto de página si es necesario (optimizado para aprovechar más espacio)
  if (yPosition > 265) {
    const pageHeight = pdf.internal.pageSize.getHeight();
    const currentPage = pdf.getCurrentPageInfo().pageNumber;
    const totalPages = pdf.getNumberOfPages();
    drawSimpleFooter(pdf, pageHeight, margin, contentWidth, currentPage, totalPages);
    yPosition = addNewPageWithHeader(pdf, quoteData, margin);
  }

  // Título de sección
  pdf.setFontSize(14);
  pdf.setTextColor(TAILWIND_COLORS.blue7);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PROYECTO', margin, yPosition);
  yPosition += 8;

  // Título del proyecto
  pdf.setFontSize(12);
  pdf.setTextColor(TAILWIND_COLORS.gray2);
  pdf.setFont('helvetica', 'bold');
  pdf.text(quoteData.project_title || 'Proyecto', margin, yPosition);
  yPosition += 6;

  // Descripción del proyecto (envolver texto)
  pdf.setFontSize(10);
  pdf.setTextColor(TAILWIND_COLORS.gray4);
  pdf.setFont('helvetica', 'normal');
  const desc = quoteData.project_description || '';
  if (desc && desc.trim().length > 0) {
    const lines = pdf.splitTextToSize(desc, contentWidth);
    lines.forEach((line: string) => {
      if (yPosition > 270) {
        const pageHeight = pdf.internal.pageSize.getHeight();
        const currentPage = pdf.getCurrentPageInfo().pageNumber;
        const totalPages = pdf.getNumberOfPages();
        drawSimpleFooter(pdf, pageHeight, margin, contentWidth, currentPage, totalPages);
        yPosition = addNewPageWithHeader(pdf, quoteData, margin);
      }
      pdf.text(line, margin, yPosition);
      yPosition += 5;
    });
  }

  // Espacio antes de la siguiente sección
  return yPosition + 8;
};

const drawIndividualServices = (pdf: jsPDF, quoteData: QuoteData, yPosition: number, margin: number, contentWidth: number): number => {
  if (!quoteData.selected_services || quoteData.selected_services.length === 0) {
    return yPosition;
  }
  
  // Título de sección
  pdf.setFontSize(14);
  pdf.setTextColor(TAILWIND_COLORS.blue7); // Usar nombre directo de Tailwind
  pdf.setFont('helvetica', 'bold');
  pdf.text('SERVICIOS INCLUIDOS', margin, yPosition);
  
  yPosition += 8;
  
  // Tabla simple sin colores de cabecera
  const tableHeaders = ['Concepto', 'Cantidad', 'Precio', 'Total'];
  const tableWidths = [80, 25, 35, 35];
  const tableX = margin;
  
  // Headers simples
  pdf.setFontSize(11);
  pdf.setTextColor(TAILWIND_COLORS.gray2); // Usar nombre directo de Tailwind
  pdf.setFont('helvetica', 'bold');
  let xPos = tableX;
  
  // Concepto - alineado a la izquierda
  pdf.text(tableHeaders[0], xPos + 2, yPosition, { align: 'left' });
  xPos += tableWidths[0];
  
  // Cantidad - alineado al centro
  pdf.text(tableHeaders[1], xPos + (tableWidths[1] / 2), yPosition, { align: 'center' });
  xPos += tableWidths[1];
  
  // Precio - alineado a la derecha
  pdf.text(tableHeaders[2], xPos + tableWidths[2] - 2, yPosition, { align: 'right' });
  xPos += tableWidths[2];
  
  // Total - alineado a la derecha
  pdf.text(tableHeaders[3], xPos + tableWidths[3] - 2, yPosition, { align: 'right' });
  
  yPosition += 8;
  
  // Línea separadora después de headers
  pdf.setDrawColor(TAILWIND_COLORS.gray8); // Usar nombre directo de Tailwind
  pdf.setLineWidth(0.5);
  pdf.line(tableX, yPosition - 5, tableX + tableWidths[0] + tableWidths[1] + tableWidths[2] + tableWidths[3], yPosition - 5);
  
  // Datos de servicios individuales con más detalle
  pdf.setTextColor(TAILWIND_COLORS.gray2); // Usar nombre directo de Tailwind
  pdf.setFont('helvetica', 'normal');
  
  quoteData.selected_services.forEach((service, index) => {
    if (yPosition > 265) {
      // Footer en la página actual
      const pageHeight = pdf.internal.pageSize.getHeight();
      const currentPage = pdf.getCurrentPageInfo().pageNumber;
      const totalPages = pdf.getNumberOfPages();
      drawSimpleFooter(pdf, pageHeight, margin, contentWidth, currentPage, totalPages);
      // Nueva página con header
      yPosition = addNewPageWithHeader(pdf, quoteData, margin);
      yPosition = printServicesSectionHeaders(pdf, yPosition, margin);
    }
    
    // Procesar componentes granulares si existen
    if (service.granularComponents && Array.isArray(service.granularComponents) && service.granularComponents.length > 0) {
      // Mostrar cada componente individual
      service.granularComponents.forEach((component: any, compIndex: number) => {
        const componentData = extractComponentData(component);
        
        const componentLines = pdf.splitTextToSize(componentData.name, tableWidths[0] - 4);
        const maxLines = Math.max(componentLines.length, 1);
        const rowHeight = maxLines * 4 + 2;
        
        // Línea separadora entre filas
        if (compIndex > 0 || index > 0) {
          pdf.setDrawColor(TAILWIND_COLORS.gray8); // Usar nombre directo de Tailwind
          pdf.setLineWidth(0.2);
          pdf.line(tableX, yPosition - 5, tableX + tableWidths[0] + tableWidths[1] + tableWidths[2] + tableWidths[3], yPosition - 5);
        }
        
        xPos = tableX;
        componentLines.forEach((line: string, lineIndex: number) => {
          pdf.text(line, xPos + 2, yPosition + (lineIndex * 4));
        });
        xPos += tableWidths[0];
        
        pdf.text(componentData.quantity.toString(), xPos + (tableWidths[1] / 2), yPosition, { align: 'center' });
        xPos += tableWidths[1];
        
        pdf.text(formatCurrency(componentData.price), xPos + tableWidths[2] - 2, yPosition, { align: 'right' });
        xPos += tableWidths[2];
        
        pdf.text(formatCurrency(componentData.total), xPos + tableWidths[3] - 2, yPosition, { align: 'right' });
        
        yPosition += rowHeight + 2;
      });
    } else {
      // Servicio normal sin componentes granulares
      const serviceName = service.name;
      const serviceDescription = service.description || '';
      const fullServiceText = serviceDescription ? `${serviceName} - ${serviceDescription}` : serviceName;
      const serviceLines = pdf.splitTextToSize(fullServiceText, tableWidths[0] - 4);
      
      const quantity = '1';
      const servicePrice = formatCurrency(service.price);
      const total = formatCurrency(service.price);
      
      const maxLines = Math.max(serviceLines.length, 1);
      const rowHeight = maxLines * 4 + 2;
      
      // Línea separadora entre filas
      if (index > 0) {
        pdf.setDrawColor(TAILWIND_COLORS.gray8); // Usar nombre directo de Tailwind
        pdf.setLineWidth(0.2);
        pdf.line(tableX, yPosition - 5, tableX + tableWidths[0] + tableWidths[1] + tableWidths[2] + tableWidths[3], yPosition - 5);
      }
      
      xPos = tableX;
      serviceLines.forEach((line: string, lineIndex: number) => {
        pdf.text(line, xPos + 2, yPosition + (lineIndex * 4));
      });
      xPos += tableWidths[0];
      
      pdf.text(quantity, xPos + (tableWidths[1] / 2), yPosition, { align: 'center' });
      xPos += tableWidths[1];
      
      pdf.text(servicePrice, xPos + tableWidths[2] - 2, yPosition, { align: 'right' });
      xPos += tableWidths[2];
      
      pdf.text(total, xPos + tableWidths[3] - 2, yPosition, { align: 'right' });
      
      yPosition += rowHeight + 2;
    }
  });
  
  return yPosition + 10;
};

const drawIndividualEquipment = (pdf: jsPDF, quoteData: QuoteData, yPosition: number, margin: number, contentWidth: number): number => {
  if (!quoteData.selected_equipment || quoteData.selected_equipment.length === 0) {
    return yPosition;
  }
  
  // Título de sección
  pdf.setFontSize(14);
  pdf.setTextColor(TAILWIND_COLORS.blue7); // Usar nombre directo de Tailwind
  pdf.setFont('helvetica', 'bold');
  pdf.text('EQUIPOS INCLUIDOS', margin, yPosition);
  
  yPosition += 8;
  
  // Tabla simple sin colores de cabecera
  const tableHeaders = ['Concepto', 'Cantidad', 'Precio', 'Total'];
  const tableWidths = [80, 25, 35, 35];
  const tableX = margin;
  
  // Headers simples
  pdf.setFontSize(11);
  pdf.setTextColor(TAILWIND_COLORS.gray2);
  pdf.setFont('helvetica', 'bold');
  let xPos = tableX;
  
  // Concepto - alineado a la izquierda
  pdf.text(tableHeaders[0], xPos + 2, yPosition, { align: 'left' });
  xPos += tableWidths[0];
  
  // Cantidad - alineado al centro
  pdf.text(tableHeaders[1], xPos + (tableWidths[1] / 2), yPosition, { align: 'center' });
  xPos += tableWidths[1];
  
  // Precio - alineado a la derecha
  pdf.text(tableHeaders[2], xPos + tableWidths[2] - 2, yPosition, { align: 'right' });
  xPos += tableWidths[2];
  
  // Total - alineado a la derecha
  pdf.text(tableHeaders[3], xPos + tableWidths[3] - 2, yPosition, { align: 'right' });
  
  yPosition += 8;
  
  // Línea separadora después de headers
  pdf.setDrawColor(TAILWIND_COLORS.gray8);
  pdf.setLineWidth(0.5);
  pdf.line(tableX, yPosition - 5, tableX + tableWidths[0] + tableWidths[1] + tableWidths[2] + tableWidths[3], yPosition - 5);
  
  // Datos de equipos individuales con más detalle
  pdf.setTextColor(TAILWIND_COLORS.gray2);
  pdf.setFont('helvetica', 'normal');
  
  quoteData.selected_equipment.forEach((equipment, index) => {
    if (yPosition > 265) {
      // Footer en la página actual
      const pageHeight = pdf.internal.pageSize.getHeight();
      const currentPage = pdf.getCurrentPageInfo().pageNumber;
      const totalPages = pdf.getNumberOfPages();
      drawSimpleFooter(pdf, pageHeight, margin, contentWidth, currentPage, totalPages);
      // Nueva página con header
      yPosition = addNewPageWithHeader(pdf, quoteData, margin);
      yPosition = printEquipmentSectionHeaders(pdf, yPosition, margin);
    }
    
    // Procesar componentes granulares si existen
    if (equipment.granularComponents && Array.isArray(equipment.granularComponents) && equipment.granularComponents.length > 0) {
      // Mostrar cada componente individual
      equipment.granularComponents.forEach((component: any, compIndex: number) => {
        const componentData = extractComponentData(component);
        
        const componentLines = pdf.splitTextToSize(componentData.name, tableWidths[0] - 4);
        const maxLines = Math.max(componentLines.length, 1);
        const rowHeight = maxLines * 4 + 2;
        
        // Línea separadora entre filas
        if (compIndex > 0 || index > 0) {
          pdf.setDrawColor(TAILWIND_COLORS.gray8);
          pdf.setLineWidth(0.2);
          pdf.line(tableX, yPosition - 5, tableX + tableWidths[0] + tableWidths[1] + tableWidths[2] + tableWidths[3], yPosition - 5);
        }
        
        xPos = tableX;
        componentLines.forEach((line: string, lineIndex: number) => {
          pdf.text(line, xPos + 2, yPosition + (lineIndex * 4));
        });
        xPos += tableWidths[0];
        
        pdf.text(componentData.quantity.toString(), xPos + (tableWidths[1] / 2), yPosition, { align: 'center' });
        xPos += tableWidths[1];
        
        pdf.text(formatCurrency(componentData.price), xPos + tableWidths[2] - 2, yPosition, { align: 'right' });
        xPos += tableWidths[2];
        
        pdf.text(formatCurrency(componentData.total), xPos + tableWidths[3] - 2, yPosition, { align: 'right' });
        
                yPosition += rowHeight + 2;
      });
    } else {
      // Equipo normal sin componentes granulares
      const equipmentName = equipment.name;
      const equipmentDescription = equipment.description || '';
      const fullEquipmentText = equipmentDescription ? `${equipmentName} - ${equipmentDescription}` : equipmentName;
      const equipmentLines = pdf.splitTextToSize(fullEquipmentText, tableWidths[0] - 4);
      
      const quantity = equipment.quantity.toString();
      const unitPrice = formatCurrency(equipment.sale_price);
      const subtotal = formatCurrency(equipment.sale_price * equipment.quantity);
      
      const maxLines = Math.max(equipmentLines.length, 1);
      const rowHeight = maxLines * 4 + 2;
      
      // Línea separadora entre filas
      if (index > 0) {
        pdf.setDrawColor(TAILWIND_COLORS.gray8);
        pdf.setLineWidth(0.2);
        pdf.line(tableX, yPosition - 5, tableX + tableWidths[0] + tableWidths[1] + tableWidths[2] + tableWidths[3], yPosition - 5);
      }
      
      xPos = tableX;
      equipmentLines.forEach((line: string, lineIndex: number) => {
        pdf.text(line, xPos + 2, yPosition + (lineIndex * 4));
      });
      xPos += tableWidths[0];
      
      pdf.text(quantity, xPos + (tableWidths[1] / 2), yPosition, { align: 'center' });
      xPos += tableWidths[1];
      
      pdf.text(unitPrice, xPos + tableWidths[2] - 2, yPosition, { align: 'right' });
      xPos += tableWidths[2];
      
      pdf.text(subtotal, xPos + tableWidths[3] - 2, yPosition, { align: 'right' });
      
      yPosition += rowHeight + 2;
    }
  });
  
  return yPosition + 10;
};

const drawPaymentAndNotes = (pdf: jsPDF, quoteData: QuoteData, yPosition: number, margin: number, contentWidth: number): number => {
  // Notas
  let notesText = '';
  
  // Agregar notas adicionales del usuario (sin incluir descripción del descuento)
  if (quoteData.notes) {
    notesText += quoteData.notes;
  }
  
  if (notesText) {
    pdf.setFontSize(9);
    pdf.setTextColor(TAILWIND_COLORS.gray4);
    pdf.text(`Nota: ${notesText}`, margin, yPosition);
    yPosition += 6;
  }
  
  return yPosition + 5;
};

const drawValidityCommentOnLastPage = (pdf: jsPDF, quoteData: QuoteData, margin: number, contentWidth: number): void => {
  // Ir a la última página
  const totalPages = pdf.getNumberOfPages();
  pdf.setPage(totalPages);
  
  const pageHeight = pdf.internal.pageSize.getHeight();
  const footerY = pageHeight - 10;
  const paginationY = footerY - 3;
  
  // Posición para el comentario: justo encima de la paginación
  let yPosition = paginationY - 25; // 25mm de espacio para el comentario
  
  // Recuadro redondeado con información de validez
  const boxWidth = contentWidth;
  const boxX = margin;
  const boxY = yPosition;
  
  // Texto dentro del recuadro
  pdf.setFontSize(9);
  pdf.setTextColor(TAILWIND_COLORS.gray2);
  pdf.setFont('helvetica', 'normal');
  
  const validUntil = quoteData.valid_until ? 
    new Date(quoteData.valid_until).toLocaleDateString('es-CL') : 
    '30 días desde la fecha de emisión';
  
  // Texto personalizable de validez - puedes cambiar este mensaje
  const defaultValidityText = `Cotización válida hasta "${validUntil}" por disponibilidad de equipos y cambios en costos de procesos`;
  let validityText = quoteData.validity_message || defaultValidityText;
  
  // Reemplazar {fecha} con la fecha real si está presente
  if (validityText.includes('{fecha}')) {
    validityText = validityText.replace(/{fecha}/g, validUntil);
  }
  
  // Dividir el texto en múltiples líneas si es necesario
  const textLines = pdf.splitTextToSize(validityText, boxWidth - 20);
  const lineHeight = 4;
  const padding = 8;
  const boxHeight = (textLines.length * lineHeight) + padding;
  
  // Fondo del recuadro
  pdf.setFillColor(TAILWIND_COLORS.gray10);
  pdf.roundedRect(boxX, boxY, boxWidth, boxHeight, 3, 3, 'F');
  
  // Borde del recuadro
  pdf.setDrawColor(TAILWIND_COLORS.gray8);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(boxX, boxY, boxWidth, boxHeight, 3, 3, 'S');
  
  // Posicionar texto centrado verticalmente
  const totalTextHeight = textLines.length * lineHeight;
  const startY = boxY + (boxHeight - totalTextHeight) / 2 + lineHeight / 2;
  
  textLines.forEach((line: string, index: number) => {
    const textWidth = pdf.getTextWidth(line);
    const textX = boxX + (boxWidth - textWidth) / 2;
    pdf.text(line, textX, startY + (index * lineHeight));
  });
};

const drawCostSummary = (pdf: jsPDF, quoteData: QuoteData, yPosition: number, margin: number, contentWidth: number): number => {
  // Resumen de costos alineado con la columna Total de la tabla
  const tableWidths = [80, 25, 35, 35]; // Mismos anchos que la tabla
  const tableX = margin;
  const priceColumnX = tableX + tableWidths[0] + tableWidths[1]; // Posición de la columna Precio
  const totalColumnX = tableX + tableWidths[0] + tableWidths[1] + tableWidths[2]; // Posición de la columna Total
  const summaryX = priceColumnX - 80; // 80mm de ancho para el resumen
  
  pdf.setFontSize(11);
  pdf.setTextColor(TAILWIND_COLORS.gray2);
  pdf.setFont('helvetica', 'bold');
  
  const totalServices = formatCurrency(quoteData.total_amount);
  const totalEquipment = formatCurrency(quoteData.equipment_total);
  const subtotal = quoteData.total_amount + quoteData.equipment_total;
  
  // Mostrar subtotal
  pdf.text('Subtotal:', priceColumnX + 10, yPosition);
  pdf.text(formatCurrency(subtotal), totalColumnX + tableWidths[3] - 2, yPosition, { align: 'right' });
  yPosition += 6;
  
  // Mostrar descuento si existe
  if (quoteData.discount_type && quoteData.discount_type !== 'none' && quoteData.discount_value && quoteData.discount_value > 0) {
    // Calcular el monto del descuento
    let discountAmount = 0;
    if (quoteData.discount_type === 'percentage') {
      discountAmount = (subtotal * quoteData.discount_value) / 100;
    } else {
      discountAmount = quoteData.discount_value;
    }
    
    const discountLabel = quoteData.discount_type === 'percentage' 
      ? `Descuento (${quoteData.discount_value}%)`
      : 'Descuento';
    
    pdf.setFontSize(11);
    pdf.setTextColor(TAILWIND_COLORS.gray4);
    pdf.setFont('helvetica', 'bold');
    pdf.text(discountLabel + ':', priceColumnX + 10, yPosition);
    pdf.text('-' + formatCurrency(discountAmount), totalColumnX + tableWidths[3] - 2, yPosition, { align: 'right' });
    yPosition += 6;
    
    // Calcular total después del descuento
    const totalAfterDiscount = subtotal - discountAmount;
    
    // Línea separadora después del descuento
    pdf.setDrawColor(TAILWIND_COLORS.gray8);
    pdf.setLineWidth(0.5);
    pdf.line(priceColumnX + 10, yPosition, totalColumnX + tableWidths[3], yPosition);
    yPosition += 6;
    
    // Total después del descuento
    pdf.setFontSize(11);
    pdf.setTextColor(TAILWIND_COLORS.gray2);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Total sin IVA:', priceColumnX + 10, yPosition);
    pdf.text(formatCurrency(totalAfterDiscount), totalColumnX + tableWidths[3] - 2, yPosition, { align: 'right' });
    yPosition += 6;
  }
  
  // Calcular IVA sobre el total después del descuento
  let totalForIVA = subtotal;
  if (quoteData.discount_type && quoteData.discount_type !== 'none' && quoteData.discount_value && quoteData.discount_value > 0) {
    if (quoteData.discount_type === 'percentage') {
      const discountAmount = (subtotal * quoteData.discount_value) / 100;
      totalForIVA = subtotal - discountAmount;
    } else {
      totalForIVA = subtotal - quoteData.discount_value;
    }
  }
  
  const iva = totalForIVA * 0.19; // IVA 19%
  
  pdf.setFontSize(11);
  pdf.setTextColor(TAILWIND_COLORS.gray2);
  pdf.setFont('helvetica', 'bold');
  pdf.text('IVA 19%:', priceColumnX + 10, yPosition);
  pdf.text(formatCurrency(iva), totalColumnX + tableWidths[3] - 2, yPosition, { align: 'right' });
  yPosition += 4; // Reducir espacio entre IVA y la línea
  
  // Línea separadora más cerca del IVA
  pdf.setDrawColor(TAILWIND_COLORS.blue6);
  pdf.setLineWidth(0.5);
  pdf.line(priceColumnX + 10, yPosition, totalColumnX + tableWidths[3], yPosition);
  yPosition += 6;
  
  // Total general destacado (con IVA)
  const totalGeneral = totalForIVA + iva;
  
  pdf.setFontSize(13);
  pdf.setTextColor(TAILWIND_COLORS.blue6);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Total:', priceColumnX + 10, yPosition);
  pdf.text(formatCurrency(totalGeneral), totalColumnX + tableWidths[3] - 2, yPosition, { align: 'right' });
  
  return yPosition + 5;
};

const drawSignatureLine = (pdf: jsPDF, yPosition: number, margin: number, contentWidth: number): number => {
  // Línea de firma
  pdf.setDrawColor(TAILWIND_COLORS.gray2);
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPosition, margin + 100, yPosition);
  
  // Nombre del responsable
  pdf.setFontSize(10);
  pdf.setTextColor(TAILWIND_COLORS.gray2);
  pdf.setFont('helvetica', 'normal');
  pdf.text('ingenIT - Soluciones Tecnológicas', margin + 50, yPosition + 5, { align: 'center' });
  
  return yPosition + 20;
};

const drawSimpleFooter = (pdf: jsPDF, pageHeight: number, margin: number, contentWidth: number, currentPage?: number, totalPages?: number): void => {
  const footerY = pageHeight - 10;
  
  // Paginación encima del footer (si se proporcionan los números de página)
  if (currentPage !== undefined && totalPages !== undefined) {
    pdf.setFontSize(9);
    pdf.setTextColor(TAILWIND_COLORS.gray6);
    pdf.setFont('helvetica', 'normal');
    const pageText = `Página ${currentPage} de ${totalPages}`;
    pdf.text(pageText, margin + contentWidth - 5, footerY - 3, { align: 'right' });
  }
  
  // Franja inferior más pequeña
  pdf.setFillColor(TAILWIND_COLORS.blue5);
  pdf.rect(0, footerY, pdf.internal.pageSize.getWidth(), 10, 'F');
  
  // Información de contacto centrada
  pdf.setFontSize(8);
  pdf.setTextColor(TAILWIND_COLORS.white);
  pdf.setFont('helvetica', 'normal');
  
  const footerText = 'WhatsApp: +56 9 9020 6618    |    gerencia@ingenit.cl    |    www.ingenit.cl';
  pdf.text(footerText, margin + contentWidth / 2, footerY + 6, { align: 'center' });
};

const updatePaginationOnAllPages = (pdf: jsPDF, margin: number, contentWidth: number): void => {
  const totalPages = pdf.getNumberOfPages();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  // Recorrer todas las páginas y actualizar solo la paginación
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    pdf.setPage(pageNum);
    
    // Solo dibujar la paginación encima del footer
    const footerY = pageHeight - 10;
    
    // Limpiar el área de paginación (rectángulo blanco)
    pdf.setFillColor(255, 255, 255); // Blanco
    pdf.rect(margin + contentWidth - 30, footerY - 8, 30, 8, 'F');
    
    // Paginación encima del footer
    pdf.setFontSize(9);
    pdf.setTextColor(TAILWIND_COLORS.gray6);
    pdf.setFont('helvetica', 'normal');
    const pageText = `Página ${pageNum} de ${totalPages}`;
    pdf.text(pageText, margin + contentWidth - 5, footerY - 3, { align: 'right' });
  }
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP'
  }).format(amount);
};

// Función helper para extraer datos de componentes
const extractComponentData = (component: any) => {
  console.log('Extrayendo datos del componente:', component);
  
  // Buscar nombre en múltiples ubicaciones
  const name = component.name || component.description || component.title || component.label || component.text || 'Componente';
  
  // Buscar cantidad en múltiples ubicaciones
  const quantity = component.quantity || component.qty || component.amount || component.count || 1;
  
  // Buscar precio en múltiples ubicaciones
  const price = component.price || component.cost || component.unitPrice || component.unit_cost || component.value || component.amount || 0;
  
  // Buscar en sub-objetos si existe
  const subPrice = component.details?.price || component.data?.price || component.info?.price || 0;
  const finalPrice = price || subPrice;
  
  const total = finalPrice * quantity;
  
  console.log(`Datos extraídos: Nombre=${name}, Cantidad=${quantity}, Precio=${finalPrice}, Total=${total}`);
  
  return {
    name,
    quantity,
    price: finalPrice,
    total
  };
};

export const downloadProfessionalPDF = async (quoteData: QuoteData, filename?: string): Promise<void> => {
  try {
    const pdf = await generateProfessionalQuotePDF(quoteData);
    const defaultFilename = `cotizacion-${quoteData.quote_number || Date.now()}.pdf`;
    pdf.save(filename || defaultFilename);
  } catch (error) {
    console.error('Error generando PDF profesional:', error);
    throw error;
  }
};

export const sendProfessionalPDFByEmail = async (quoteData: QuoteData, email: string): Promise<void> => {
  try {
    // Generar el PDF
    const pdf = await generateProfessionalQuotePDF(quoteData);
    
    // Convertir PDF a base64 para enviarlo al backend
    const pdfBase64 = pdf.output('datauristring').split(',')[1];
    
    // Verificar tamaño del PDF
    const pdfSizeInBytes = Math.ceil((pdfBase64.length * 3) / 4);
    const pdfSizeInMB = pdfSizeInBytes / (1024 * 1024);
    
    console.log('📧 Enviando PDF por email a:', email);
    console.log('📊 Tamaño del PDF:', pdfSizeInMB.toFixed(2), 'MB');
    
    // En producción (Vercel) el límite es más estricto
    const isProduction = window.location.hostname !== 'localhost';
    const maxSizeMB = isProduction ? 4.5 : 8;
    
    console.log('🔍 Debug info:', {
      isProduction,
      maxSizeMB,
      pdfSizeInMB,
      hostname: window.location.hostname
    });
    
    // Forzar uso de chunks en producción para PDFs grandes
    if (isProduction && pdfSizeInMB > 3) {
      console.log('📦 PDF grande detectado en producción, usando envío en chunks...');
      await sendPDFInChunks(quoteData, pdfBase64, email);
      return;
    }
    
    if (pdfSizeInMB > maxSizeMB) {
      // Si el PDF es muy grande, usar envío en chunks
      console.log('📦 PDF muy grande, usando envío en chunks...');
      await sendPDFInChunks(quoteData, pdfBase64, email);
      return;
    }
    
    // Envío normal para PDFs pequeños
    console.log('📧 Usando envío normal para PDF pequeño');
    await sendPDFNormal(quoteData, pdfBase64, email);
    
  } catch (error) {
    console.error('❌ Error enviando PDF por email:', error);
    alert(`❌ Error enviando el PDF por email: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    throw error;
  }
};

// Función para envío normal
const sendPDFNormal = async (quoteData: QuoteData, pdfBase64: string, email: string): Promise<void> => {
  const dataToSend = {
    ...quoteData,
    pdfBase64: pdfBase64
  };
  
  // Verificar tamaño del PDF
  const pdfSizeInBytes = Math.ceil((pdfBase64.length * 3) / 4);
  const pdfSizeInMB = pdfSizeInBytes / (1024 * 1024);
  
  // Si el PDF es grande (> 3MB), usar el endpoint especial
  const endpoint = pdfSizeInMB > 3 ? '/api/send-quote-email-large' : '/api/send-quote-email';
  
  console.log(`📧 Usando endpoint: ${endpoint} para PDF de ${pdfSizeInMB.toFixed(2)} MB`);
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      quoteData: dataToSend,
      recipientEmail: email
    })
  });
  
  if (!response.ok) {
    if (response.status === 413) {
      console.log('📦 Error 413 detectado, redirigiendo a envío en chunks...');
      // Si falla por tamaño, intentar con chunks
      await sendPDFInChunks(quoteData, pdfBase64, email);
      return;
    }
    const errorText = await response.text();
    throw new Error(`Error del servidor (${response.status}): ${errorText}`);
  }
  
  const result = await response.json();
  
  if (result.success) {
    console.log('✅ Email enviado exitosamente:', result.messageId);
    alert(`✅ Correo enviado exitosamente a ${email}\n\nID del mensaje: ${result.messageId}`);
  } else {
    throw new Error(result.error || 'Error desconocido en el servidor');
  }
};

// Función para envío en chunks
const sendPDFInChunks = async (quoteData: QuoteData, pdfBase64: string, email: string): Promise<void> => {
  const chunkSize = 3 * 1024 * 1024; // 3MB por chunk
  const chunks = [];
  
  // Dividir el PDF en chunks
  for (let i = 0; i < pdfBase64.length; i += chunkSize) {
    chunks.push(pdfBase64.slice(i, i + chunkSize));
  }
  
  console.log(`📦 Dividiendo PDF en ${chunks.length} chunks de ~3MB cada uno`);
  
  // Enviar primer chunk con metadata
  const firstChunkData = {
    ...quoteData,
    pdfBase64: chunks[0],
    totalChunks: chunks.length,
    chunkIndex: 0,
    isFirstChunk: true
  };
  
  const response = await fetch('/api/send-quote-email-chunk', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      quoteData: firstChunkData,
      recipientEmail: email
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error enviando primer chunk: ${errorText}`);
  }
  
  const firstResponse = await response.json();
  const sessionId = firstResponse.sessionId;
  
  // Enviar chunks restantes
  for (let i = 1; i < chunks.length; i++) {
    const chunkData = {
      pdfBase64: chunks[i],
      chunkIndex: i,
      isLastChunk: i === chunks.length - 1
    };
    
    const chunkResponse = await fetch('/api/send-quote-email-chunk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': sessionId
      },
      body: JSON.stringify({
        quoteData: chunkData,
        recipientEmail: email
      })
    });
    
    if (!chunkResponse.ok) {
      throw new Error(`Error enviando chunk ${i + 1}`);
    }
  }
  
  console.log('✅ PDF enviado exitosamente en chunks');
  alert(`✅ Correo enviado exitosamente a ${email}\n\nPDF enviado en ${chunks.length} partes debido a su tamaño.`);
};

export const previewProfessionalPDF = async (quoteData: QuoteData): Promise<void> => {
  try {
    const pdf = await generateProfessionalQuotePDF(quoteData);
    const pdfBlob = pdf.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    // Abrir PDF en nueva ventana/tab
    const newWindow = window.open(pdfUrl, '_blank');
    
    if (!newWindow) {
      // Si no se puede abrir nueva ventana, mostrar en iframe
      const iframe = document.createElement('iframe');
      iframe.src = pdfUrl;
      iframe.style.width = '100%';
      iframe.style.height = '600px';
      iframe.style.border = 'none';
      
      // Crear modal para mostrar el preview
      const modal = document.createElement('div');
      modal.style.position = 'fixed';
      modal.style.top = '0';
      modal.style.left = '0';
      modal.style.width = '100%';
      modal.style.height = '100%';
      modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
      modal.style.zIndex = '9999';
      modal.style.display = 'flex';
      modal.style.justifyContent = 'center';
      modal.style.alignItems = 'center';
      
      const modalContent = document.createElement('div');
      modalContent.style.backgroundColor = 'white';
      modalContent.style.padding = '20px';
      modalContent.style.borderRadius = '8px';
      modalContent.style.maxWidth = '90%';
      modalContent.style.maxHeight = '90%';
      modalContent.style.overflow = 'auto';
      
      const closeButton = document.createElement('button');
      closeButton.textContent = '✕ Cerrar';
      closeButton.style.position = 'absolute';
      closeButton.style.top = '10px';
      closeButton.style.right = '10px';
      closeButton.style.padding = '8px 16px';
      closeButton.style.backgroundColor = '#005abf';
      closeButton.style.color = 'white';
      closeButton.style.border = 'none';
      closeButton.style.borderRadius = '4px';
      closeButton.style.cursor = 'pointer';
      closeButton.onclick = () => {
        document.body.removeChild(modal);
        URL.revokeObjectURL(pdfUrl);
      };
      
      modalContent.appendChild(closeButton);
      modalContent.appendChild(iframe);
      modal.appendChild(modalContent);
      document.body.appendChild(modal);
      
      // Cerrar modal con ESC
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          document.body.removeChild(modal);
          URL.revokeObjectURL(pdfUrl);
          document.removeEventListener('keydown', handleEsc);
        }
      };
      document.addEventListener('keydown', handleEsc);
    }
    
  } catch (error) {
    console.error('Error generando preview del PDF:', error);
    alert('❌ Error al generar el preview del PDF');
  }
};

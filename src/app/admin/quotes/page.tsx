"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getQuoteStatistics } from "@/lib/quoteIdGenerator";
import { generateProfessionalQuotePDF, sendProfessionalPDFByEmail } from "@/lib/pdfGeneratorProfessional";
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  Calendar,
  DollarSign,
  User,
  Download,
  Mail
} from "lucide-react";

interface Quote {
  id: string;
  quote_number?: string;
  client_rut?: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  client_phone_country?: string;
  client_address?: string;
  client_region?: string;
  client_commune?: string;
  client_country?: string;
  project_title: string;
  project_description?: string;
  total_amount: number;
  equipment_total?: number;
  status: string;
  created_at: string;
  valid_until: string;
  services?: any[];
  equipment?: any[];
  notes?: string;
  terms_conditions?: string;
  discount_type?: 'none' | 'percentage' | 'amount';
  discount_value?: number;
  discount_description?: string;
  final_total?: number;
}

export default function QuotesPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<Quote[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [statistics, setStatistics] = useState<{total: number, lastNumber: number, todayCount: number}>({
    total: 0,
    lastNumber: 0,
    todayCount: 0
  });

  useEffect(() => {
    loadQuotes();
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      const stats = await getQuoteStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  useEffect(() => {
    // Filter quotes based on search term and status filter
    let filtered = quotes;
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(quote =>
        quote.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.project_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (quote.quote_number && quote.quote_number.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(quote => quote.status === statusFilter);
    }
    
    setFilteredQuotes(filtered);
  }, [quotes, searchTerm, statusFilter]);

  const loadQuotes = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("rt_quotes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQuotes(data || []);
    } catch (error) {
      console.error("Error cargando cotizaciones:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-200 text-gray-700 border border-gray-300';
      case 'sent': return 'bg-blue-200 text-blue-800 border border-blue-300';
      case 'accepted': return 'bg-green-200 text-green-800 border border-green-300';
      case 'rejected': return 'bg-red-200 text-red-800 border border-red-300';
      case 'expired': return 'bg-yellow-200 text-yellow-800 border border-yellow-300';
      default: return 'bg-gray-200 text-gray-700 border border-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Borrador';
      case 'sent': return 'Enviada';
      case 'accepted': return 'Aceptada';
      case 'rejected': return 'Rechazada';
      case 'expired': return 'Expirada';
      default: return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(amount);
  };

  const handleEdit = (quote: Quote) => {
    // Guardar la cotización en sessionStorage para edición
    sessionStorage.setItem('editQuoteData', JSON.stringify(quote));
    router.push(`/admin/quotes/create?edit=true&id=${quote.id}`);
  };

  const handleView = (quote: Quote) => {
    // Guardar la cotización en sessionStorage para visualización
    sessionStorage.setItem('viewQuoteData', JSON.stringify(quote));
    router.push(`/admin/quotes/create?view=true&id=${quote.id}`);
  };

  const handleDownload = async (quote: Quote) => {
    try {
      console.log('🔄 Generando PDF para descarga:', quote);
      
      // Preparar datos para el PDF
      const pdfData = {
        client_rut: quote.client_rut || '',
        client_name: quote.client_name,
        client_email: quote.client_email || '',
        client_phone: quote.client_phone ? `${quote.client_phone_country || ''} ${quote.client_phone}` : '',
        client_address: quote.client_address || '',
        client_region: quote.client_region || '',
        client_commune: quote.client_commune || '',
        project_title: quote.project_title,
        project_description: quote.project_description || '',
        selected_services: quote.services || [],
        selected_equipment: quote.equipment || [],
        total_amount: quote.total_amount || 0,
        equipment_total: quote.equipment_total || 0,
        valid_until: quote.valid_until || '',
        notes: quote.notes || '',
        terms_conditions: quote.terms_conditions || '',
        discount_type: quote.discount_type || 'none',
        discount_value: quote.discount_value || 0,
        discount_description: quote.discount_description || '',
        final_total: quote.final_total || 0,
        quote_number: quote.quote_number || `COT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${String(Date.now()).slice(-4)}`,
        created_at: quote.created_at || new Date().toISOString()
      };
      
      // Debug: Mostrar datos de descuento que se envían al PDF
      console.log('=== DATOS DE DESCUENTO PARA PDF (DOWNLOAD FROM LIST) ===');
      console.log('discount_type:', pdfData.discount_type);
      console.log('discount_value:', pdfData.discount_value);
      console.log('discount_description:', pdfData.discount_description);
      console.log('final_total:', pdfData.final_total);
      console.log('total_amount:', pdfData.total_amount);
      console.log('equipment_total:', pdfData.equipment_total);
      console.log('Subtotal calculado:', pdfData.total_amount + pdfData.equipment_total);
      
      // Generar el PDF
      const pdf = await generateProfessionalQuotePDF(pdfData);
      
      // Convertir jsPDF a Blob
      const pdfBlob = pdf.output('blob');
      
      // Crear URL del blob
      const url = URL.createObjectURL(pdfBlob);
      
      // Crear elemento de descarga
      const link = document.createElement('a');
      link.href = url;
      link.download = `Cotizacion_${quote.quote_number || quote.id}_${quote.client_name.replace(/\s+/g, '_')}.pdf`;
      
      // Simular clic para descargar
      document.body.appendChild(link);
      link.click();
      
      // Limpiar
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('✅ PDF descargado exitosamente');
    } catch (error) {
      console.error('❌ Error generando PDF para descarga:', error);
      alert('Error generando el PDF para descarga');
    }
  };

  const handleShareByEmail = async (quote: Quote) => {
    try {
      console.log('📧 Preparando envío por correo:', quote);
      
      // Verificar que el cliente tenga email
      if (!quote.client_email) {
        alert('No se puede enviar el correo: el cliente no tiene email registrado.');
        return;
      }
      
      // Preparar datos para el PDF
      const pdfData = {
        client_rut: quote.client_rut || '',
        client_name: quote.client_name,
        client_email: quote.client_email || '',
        client_phone: quote.client_phone ? `${quote.client_phone_country || ''} ${quote.client_phone}` : '',
        client_address: quote.client_address || '',
        client_region: quote.client_region || '',
        client_commune: quote.client_commune || '',
        project_title: quote.project_title,
        project_description: quote.project_description || '',
        selected_services: quote.services || [],
        selected_equipment: quote.equipment || [],
        total_amount: quote.total_amount || 0,
        equipment_total: quote.equipment_total || 0,
        valid_until: quote.valid_until || '',
        notes: quote.notes || '',
        terms_conditions: quote.terms_conditions || '',
        discount_type: quote.discount_type || 'none',
        discount_value: quote.discount_value || 0,
        discount_description: quote.discount_description || '',
        final_total: quote.final_total || 0,
        quote_number: quote.quote_number || `COT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${String(Date.now()).slice(-4)}`,
        created_at: quote.created_at || new Date().toISOString()
      };
      
      // Debug: Mostrar datos de descuento que se envían al PDF
      console.log('=== DATOS DE DESCUENTO PARA PDF (EMAIL FROM LIST) ===');
      console.log('discount_type:', pdfData.discount_type);
      console.log('discount_value:', pdfData.discount_value);
      console.log('discount_description:', pdfData.discount_description);
      console.log('final_total:', pdfData.final_total);
      console.log('total_amount:', pdfData.total_amount);
      console.log('equipment_total:', pdfData.equipment_total);
      console.log('Subtotal calculado:', pdfData.total_amount + pdfData.equipment_total);
      
      // Mostrar indicador de carga
      const loadingMessage = 'Enviando correo...';
      alert(loadingMessage);
      
      // Usar la función mejorada que maneja chunks automáticamente
      await sendProfessionalPDFByEmail(pdfData, quote.client_email);
      
      // Si llegamos aquí, el envío fue exitoso
      const result = { success: true, messageId: 'enviado' };
      
      if (result.success) {
        // Cambiar automáticamente el estado a "sent" cuando el correo se envía exitosamente
        if (quote.status === 'draft') {
          console.log('🔄 Cambiando estado automáticamente de "draft" a "sent"');
          
          try {
            const { error } = await supabase
              .from('quotes')
              .update({ 
                status: 'sent',
                updated_at: new Date().toISOString()
              })
              .eq('id', quote.id);

            if (error) {
              console.error('❌ Error actualizando estado:', error);
            } else {
              // Actualizar el estado local
              setQuotes(prevQuotes => 
                prevQuotes.map(q => 
                  q.id === quote.id 
                    ? { ...q, status: 'sent' }
                    : q
                )
              );
              console.log('✅ Estado actualizado automáticamente a "sent"');
            }
          } catch (statusError) {
            console.error('❌ Error en actualización automática de estado:', statusError);
          }
        }
        
        alert(`✅ Correo enviado a ${quote.client_name} - ${quote.client_email}`);
        console.log('✅ Correo enviado:', result.messageId);
      } else {
        throw new Error('Error desconocido');
      }
      
    } catch (error) {
      console.error('❌ Error enviando correo:', error);
      alert(`Error enviando el correo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedQuote(null);
  };

  const handleSaveQuote = () => {
    loadQuotes(); // Recargar las cotizaciones después de guardar
  };

  const handleDeleteQuote = async (quoteId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta cotización?')) {
      try {
        const { error } = await supabase
          .from("rt_quotes")
          .delete()
          .eq('id', quoteId);

        if (error) throw error;
        
        console.log('Cotización eliminada exitosamente');
        loadQuotes(); // Recargar las cotizaciones
      } catch (error) {
        console.error("Error eliminando cotización:", error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        alert(`Error al eliminar la cotización: ${errorMessage}`);
      }
    }
  };

  const handleStatusChange = async (quoteId: string, newStatus: string) => {
    try {
      // Obtener la cotización actual para validar la transición
      const currentQuote = quotes.find(q => q.id === quoteId);
      if (!currentQuote) {
        alert('Error: No se encontró la cotización');
        return;
      }

      const currentStatus = currentQuote.status;
      console.log(`🔄 Intentando cambiar estado de ${currentStatus} a: ${newStatus}`);

      // Validar transiciones permitidas
      const allowedTransitions: { [key: string]: string[] } = {
        'draft': [], // Borrador no puede cambiar manualmente (solo automáticamente al enviar)
        'sent': ['accepted', 'rejected', 'expired'], // Enviada puede ir a Aceptada, Rechazada o Expirada
        'accepted': [], // Aceptada no puede cambiar
        'rejected': [], // Rechazada no puede cambiar
        'expired': [] // Expirada no puede cambiar
      };

      const allowedNextStates = allowedTransitions[currentStatus] || [];
      
      if (!allowedNextStates.includes(newStatus)) {
        const currentStatusText = getStatusText(currentStatus);
        const newStatusText = getStatusText(newStatus);
        
        if (currentStatus === 'draft') {
          alert(`❌ No se puede cambiar manualmente el estado de "Borrador".\n\nPara cambiar a "Enviada", debes usar el botón "Compartir por correo" (📧).`);
        } else {
          alert(`❌ Transición no permitida: No se puede cambiar de "${currentStatusText}" a "${newStatusText}"`);
        }
        return;
      }

      // Validaciones adicionales específicas
      if (newStatus === 'accepted') {
        // Verificar que la cotización tenga todos los datos necesarios
        if (!currentQuote.client_name || !currentQuote.project_title) {
          alert('❌ No se puede aceptar una cotización sin datos completos del cliente y proyecto');
          return;
        }
      }

      if (newStatus === 'expired') {
        // Verificar que la fecha de validez haya expirado
        const validUntil = new Date(currentQuote.valid_until);
        const today = new Date();
        if (validUntil > today) {
          const confirmExpire = confirm(
            `⚠️ La cotización es válida hasta ${validUntil.toLocaleDateString()}. ¿Estás seguro de que quieres marcarla como expirada?`
          );
          if (!confirmExpire) return;
        }
      }

      // Confirmar cambios importantes
      if (newStatus === 'accepted') {
        const confirmAccept = confirm(
          `¿Estás seguro de que quieres marcar esta cotización como ACEPTADA?\n\nCliente: ${currentQuote.client_name}\nProyecto: ${currentQuote.project_title}\nMonto: ${formatCurrency(currentQuote.total_amount)}`
        );
        if (!confirmAccept) return;
      }

      if (newStatus === 'rejected') {
        const confirmReject = confirm(
          `¿Estás seguro de que quieres marcar esta cotización como RECHAZADA?\n\nCliente: ${currentQuote.client_name}\nProyecto: ${currentQuote.project_title}`
        );
        if (!confirmReject) return;
      }

      console.log(`✅ Transición válida: ${currentStatus} → ${newStatus}`);
      
      // Actualizar en la base de datos
      const { error } = await supabase
        .from('rt_quotes')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', quoteId);

      if (error) throw error;

      // Actualizar el estado local inmediatamente
      setQuotes(prevQuotes => 
        prevQuotes.map(quote => 
          quote.id === quoteId 
            ? { ...quote, status: newStatus }
            : quote
        )
      );

      console.log(`✅ Estado cambiado exitosamente a: ${newStatus}`);
      
      // Mostrar mensaje de confirmación
      const statusText = getStatusText(newStatus);
      alert(`✅ Estado cambiado a: ${statusText}`);
      
    } catch (error) {
      console.error('❌ Error cambiando estado:', error);
      alert('Error al cambiar el estado de la cotización');
    }
  };

  return (
      <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cotizaciones</h1>
          <p className="text-gray-600">Gestiona las cotizaciones de proyectos</p>
        </div>
        <button
          onClick={() => router.push("/admin/quotes/create")}
          className="bg-blue8 text-white px-4 py-2 rounded-lg hover:bg-blue6 flex items-center gap-2 transition-colors focus:outline-none focus:ring-0 active:outline-none"
        >
          <Plus className="w-5 h-5" />
          Nueva Cotización
        </button>
      </div>

      {/* Dashboard de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Cotizaciones</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Último Número</p>
              <p className="text-2xl font-bold text-gray-900">COTI{String(statistics.lastNumber).padStart(5, '0')}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Hoy</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.todayCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por cliente, proyecto o número..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue8"
            >
              <option value="all">Todos los estados</option>
              <option value="draft">Borrador</option>
              <option value="sent">Enviada</option>
              <option value="accepted">Aceptada</option>
              <option value="rejected">Rechazada</option>
              <option value="expired">Expirada</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de cotizaciones */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue8 mx-auto"></div>
            <p className="mt-2 text-gray-600">Cargando cotizaciones...</p>
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay cotizaciones</h3>
            <p className="text-gray-600 mb-4">Crea tu primera cotización para comenzar</p>
            <button
              onClick={() => router.push("/admin/quotes/create")}
              className="bg-blue8 text-white px-4 py-2 rounded-lg hover:bg-blue6"
            >
              Crear Cotización
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cotización
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proyecto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredQuotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {quote.quote_number || (
                          <span className="text-gray-400 italic">
                            Sin número
                          </span>
                        )}
                      </div>
                      {quote.quote_number && (
                        <div className="text-xs text-gray-500 mt-1">
                          ID: {quote.id}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {quote.client_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {quote.client_email}
                        </div>
                        {quote.client_phone && (
                          <div className="text-xs text-gray-400">
                            {quote.client_phone_country} {quote.client_phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {quote.project_title}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {quote.services && quote.services.length > 0 && (
                          <span>{quote.services.length} servicio(s)</span>
                        )}
                        {quote.equipment && quote.equipment.length > 0 && (
                          <span className="ml-2">{quote.equipment.length} equipo(s)</span>
                        )}
                        {quote.services && quote.services.some((s: any) => s.granularComponents) && (
                          <span className="ml-1 text-blue-600">• Granular</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(quote.total_amount)}
                      </div>
                      {quote.equipment_total && quote.equipment_total > 0 && (
                        <div className="text-xs text-gray-500">
                          + {formatCurrency(quote.equipment_total)} equipos
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(quote.status)}`}>
                        {getStatusText(quote.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(quote.created_at).toLocaleDateString('es-CL')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
            <button
                          onClick={() => handleView(quote)}
              className="text-blue8 hover:text-blue6 p-1 focus:outline-none focus:ring-0 active:outline-none"
                          title="Ver"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
            <button
                          onClick={() => handleEdit(quote)}
              className="text-green-600 hover:text-green-800 p-1 focus:outline-none focus:ring-0 active:outline-none"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
            <button
                          onClick={() => handleDownload(quote)}
              className="text-blue8 hover:text-blue6 p-1 focus:outline-none focus:ring-0 active:outline-none"
                          title="Descargar"
                        >
                          <Download className="w-4 h-4" />
                        </button>
            <button
                          onClick={() => handleShareByEmail(quote)}
              className="text-purple-600 hover:text-purple-800 p-1 focus:outline-none focus:ring-0 active:outline-none"
                          title="Compartir por correo"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                        {/* Botones de cambio de estado solo para cotizaciones enviadas */}
                        {quote.status === 'sent' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(quote.id, 'accepted')}
                              className="text-green-600 hover:text-green-800 p-1 focus:outline-none focus:ring-0 active:outline-none"
                              title="Marcar como Aceptada"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleStatusChange(quote.id, 'rejected')}
                              className="text-red-600 hover:text-red-800 p-1 focus:outline-none focus:ring-0 active:outline-none"
                              title="Marcar como Rechazada"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleStatusChange(quote.id, 'expired')}
                              className="text-yellow-600 hover:text-yellow-800 p-1 focus:outline-none focus:ring-0 active:outline-none"
                              title="Marcar como Expirada"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                          </>
                        )}
            <button
                          onClick={() => handleDeleteQuote(quote.id)}
              className="text-red-600 hover:text-red-800 p-1 focus:outline-none focus:ring-0 active:outline-none"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Edición */}
      {/* The QuoteEditModal component was removed from imports, so this will cause an error.
          Assuming it's meant to be re-added or removed based on the new_code.
          For now, keeping it as is, but it will likely break. */}
      {/* <QuoteEditModal
        quote={selectedQuote}
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSave={handleSaveQuote}
      /> */}
    </div>
  );
} 
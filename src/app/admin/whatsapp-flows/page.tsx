"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  CheckCircle, 
  XCircle, 
  MessageCircle,
  Search,
  Filter,
  Download,
  Upload,
  Settings,
  BarChart3,
  Users,
  Clock
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import WhatsAppFlowEditor from "@/components/WhatsAppFlowEditor";

interface WhatsAppFlow {
  id: string;
  name: string;
  description: string;
  menus: any[];
  messages?: any[];
  startNode: string;
  endNodes: string[];
  decisions?: any[];
  delays?: any[];
  connections?: any[];
  validationStatus: "pending" | "validated" | "error";
  createdAt: string;
  updatedAt: string;
  isActive?: boolean;
  totalInteractions?: number;
  successRate?: number;
}

export default function WhatsAppFlowsPage() {
  const router = useRouter();
  const [flows, setFlows] = useState<WhatsAppFlow[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<WhatsAppFlow | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFlow, setNewFlow] = useState({
    name: "",
    description: "",
    startNode: "start",
    endNodes: ["end"]
  });

  useEffect(() => {
    loadFlows();
  }, []);

  const loadFlows = async () => {
    try {
      setIsLoading(true);
      
      const { data: flowsData, error } = await supabase
        .from("rt_whatsapp_flows")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error cargando flujos:", error);
        if (error.code === 'PGRST116' || error.message?.includes('404')) {
          console.log("La tabla 'whatsapp_flows' no existe. Ejecuta el script SQL para crearla.");
          setFlows([]);
        } else {
          setFlows([]);
        }
      } else {
        const transformedFlows: WhatsAppFlow[] = (flowsData || []).map(flow => ({
          id: flow.id,
          name: flow.name,
          description: flow.description,
          menus: flow.menus || [],
          messages: flow.messages || [],
          startNode: flow.start_node,
          endNodes: flow.end_nodes || [],
          decisions: flow.decisions || [],
          delays: flow.delays || [],
          connections: flow.connections || [],
          validationStatus: flow.validation_status,
          createdAt: flow.created_at,
          updatedAt: flow.updated_at,
          isActive: flow.is_active,
          totalInteractions: flow.total_interactions || 0,
          successRate: flow.success_rate || 0
        }));
        setFlows(transformedFlows);
      }
    } catch (error) {
      console.error("Error cargando flujos:", error);
      setFlows([]);
    } finally {
      setIsLoading(false);
    }
  };

  const createFlow = async () => {
    try {
      const { data, error } = await supabase
        .from("rt_whatsapp_flows")
        .insert([{
          name: newFlow.name,
          description: newFlow.description,
          menus: [],
          start_node: newFlow.startNode,
          end_nodes: newFlow.endNodes,
          validation_status: "pending",
          is_active: false,
          total_interactions: 0,
          success_rate: 0.00
        }])
        .select()
        .single();

      if (error) {
        console.error("Error creando flujo:", error);
        if (error.code === 'PGRST116' || error.message?.includes('404')) {
          alert("Error: La tabla 'whatsapp_flows' no existe. Ejecuta el script SQL para crear la tabla.");
        } else {
          alert(`Error creando flujo: ${error.message}`);
        }
        return;
      }

      const newFlowData: WhatsAppFlow = {
        id: data.id,
        name: data.name,
        description: data.description,
        menus: data.menus || [],
        startNode: data.start_node,
        endNodes: data.end_nodes || [],
        validationStatus: data.validation_status,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        isActive: data.is_active,
        totalInteractions: data.total_interactions || 0,
        successRate: data.success_rate || 0
      };

      setFlows(prev => [newFlowData, ...prev]);
      setShowCreateModal(false);
      setNewFlow({ name: "", description: "", startNode: "start", endNodes: ["end"] });
      
      // Seleccionar el nuevo flujo para editar
      setSelectedFlow(newFlowData);
      setShowEditor(true);
    } catch (error) {
      console.error("Error creando flujo:", error);
    }
  };

  const saveFlow = async (updatedFlow: WhatsAppFlow) => {
    try {
      console.log("💾 Guardando flujo en Supabase:", updatedFlow);
      
      const { error } = await supabase
        .from("rt_whatsapp_flows")
        .update({
          name: updatedFlow.name,
          description: updatedFlow.description,
          menus: updatedFlow.menus,
          messages: updatedFlow.messages || [],
          start_node: updatedFlow.startNode,
          end_nodes: updatedFlow.endNodes,
          decisions: updatedFlow.decisions || [],
          delays: updatedFlow.delays || [],
          connections: updatedFlow.connections || [],
          validation_status: "validated",
          updated_at: new Date().toISOString()
        })
        .eq("id", updatedFlow.id);

      if (error) {
        console.error("Error guardando flujo:", error);
        alert(`Error guardando flujo: ${error.message}`);
        return;
      }

      console.log("✅ Flujo guardado exitosamente");
      setFlows(prev => prev.map(flow => 
        flow.id === updatedFlow.id ? { ...updatedFlow, validationStatus: "validated" } : flow
      ));
      setSelectedFlow(updatedFlow);
    } catch (error) {
      console.error("Error guardando flujo:", error);
    }
  };

  const validateFlow = (flow: WhatsAppFlow) => {
    // Lógica de validación
    const isValid = flow.menus.length > 0 && flow.menus.every(menu => 
      menu.title && menu.message && menu.options && menu.options.length > 0
    );
    
    return isValid;
  };

  const deleteFlow = async (flowId: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar este flujo?")) {
      try {
        const { error } = await supabase
          .from("rt_whatsapp_flows")
          .delete()
          .eq("id", flowId);

        if (error) {
          console.error("Error eliminando flujo:", error);
          alert(`Error eliminando flujo: ${error.message}`);
          return;
        }

        setFlows(prev => prev.filter(flow => flow.id !== flowId));
        if (selectedFlow?.id === flowId) {
          setSelectedFlow(null);
          setShowEditor(false);
        }
      } catch (error) {
        console.error("Error eliminando flujo:", error);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "validated": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "error": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "validated": return <CheckCircle className="w-4 h-4" />;
      case "pending": return <Clock className="w-4 h-4" />;
      case "error": return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const filteredFlows = flows.filter(flow => {
    const matchesSearch = flow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         flow.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || flow.validationStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (showEditor && selectedFlow) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setShowEditor(false);
                  setSelectedFlow(null);
                }}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ← Volver
              </button>
              <div>
                <h1 className="text-2xl font-title text-gray-900">{selectedFlow.name}</h1>
                <p className="text-gray-600">{selectedFlow.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedFlow.validationStatus)}`}>
                {selectedFlow.validationStatus === "validated" ? "Validado" :
                 selectedFlow.validationStatus === "pending" ? "Pendiente" : "Error"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1">
          <WhatsAppFlowEditor
            flow={selectedFlow}
            onSave={saveFlow}
            onValidate={validateFlow}
            readOnly={false}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-title text-gray-900 mb-2">
              Flujos de WhatsApp
            </h1>
            <p className="text-gray-600">
              Crea y gestiona flujos de menús interactivos para WhatsApp
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue6 text-white rounded-lg hover:bg-blue7 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Crear Flujo
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Flujos</p>
              <p className="text-2xl font-bold text-gray-900">{flows.length}</p>
            </div>
            <div className="p-3 bg-blue6/10 rounded-full">
              <MessageCircle className="w-8 h-8 text-blue6" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Flujos Activos</p>
              <p className="text-2xl font-bold text-gray-900">
                {flows.filter(f => f.isActive).length}
              </p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-full">
              <Play className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Validados</p>
              <p className="text-2xl font-bold text-gray-900">
                {flows.filter(f => f.validationStatus === "validated").length}
              </p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-full">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Interacciones</p>
              <p className="text-2xl font-bold text-gray-900">
                {flows.reduce((sum, f) => sum + (f.totalInteractions || 0), 0)}
              </p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-full">
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar flujos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue6 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue6 focus:border-transparent"
            >
              <option value="all">Todos los estados</option>
              <option value="validated">Validados</option>
              <option value="pending">Pendientes</option>
              <option value="error">Con errores</option>
            </select>
          </div>
        </div>
      </div>

      {/* Flows List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue6 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando flujos...</p>
          </div>
        </div>
      ) : filteredFlows.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-blue6/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-blue6" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay flujos creados</h3>
          <p className="text-gray-600 mb-6">
            Comienza creando tu primer flujo de WhatsApp con menús interactivos
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800">
              <strong>Nota:</strong> Si ves errores 404, es posible que necesites crear la tabla 'whatsapp_flows' en Supabase. 
              Ejecuta el script SQL <code className="bg-yellow-100 px-1 rounded">create-whatsapp-flows-table.sql</code> en tu base de datos.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue6 text-white rounded-lg hover:bg-blue7 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Crear Primer Flujo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredFlows.map((flow) => (
            <div key={flow.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{flow.name}</h3>
                    <p className="text-gray-600 text-sm mb-3">{flow.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" />
                        {flow.menus.length} menús
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {flow.totalInteractions || 0} interacciones
                      </span>
                      {flow.successRate && (
                        <span className="flex items-center gap-1">
                          <BarChart3 className="w-4 h-4" />
                          {flow.successRate}% éxito
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(flow.validationStatus)}`}>
                      {getStatusIcon(flow.validationStatus)}
                      {flow.validationStatus === "validated" ? "Validado" :
                       flow.validationStatus === "pending" ? "Pendiente" : "Error"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${flow.isActive ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                    <span className="text-sm text-gray-600">
                      {flow.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedFlow(flow);
                        setShowEditor(true);
                      }}
                      className="p-2 text-blue6 hover:bg-blue6/10 rounded-lg transition-colors"
                      title="Editar flujo"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteFlow(flow.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar flujo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Flow Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Crear Nuevo Flujo</h2>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del flujo</label>
                  <input
                    type="text"
                    value={newFlow.name}
                    onChange={(e) => setNewFlow(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue6 focus:border-transparent"
                    placeholder="Ej: Flujo de Atención al Cliente"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                  <textarea
                    value={newFlow.description}
                    onChange={(e) => setNewFlow(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue6 focus:border-transparent"
                    placeholder="Describe el propósito de este flujo..."
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={createFlow}
                disabled={!newFlow.name.trim()}
                className="px-4 py-2 bg-blue6 text-white rounded-lg hover:bg-blue7 transition-colors disabled:opacity-50"
              >
                Crear Flujo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

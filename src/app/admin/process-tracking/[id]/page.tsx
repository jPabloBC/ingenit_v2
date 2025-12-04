"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Play, 
  Edit, 
  Save, 
  Plus,
  AlertTriangle,
  Calendar,
  User,
  Target,
  BarChart3,
  FileText,
  MessageCircle,
  Globe,
  Wifi,
  Settings
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import ProcessFlowDiagram from "@/components/ProcessFlowDiagram";
import VisioFlowDiagram from "@/components/VisioFlowDiagram";

interface Process {
  id: string;
  name: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "error" | "paused";
  priority: "low" | "medium" | "high" | "critical";
  assigned_to: string;
  created_at: string;
  updated_at: string;
  due_date?: string;
  progress: number;
  steps: ProcessStep[];
  notes?: string;
  estimated_hours?: number;
  actual_hours?: number;
}

interface ProcessStep {
  id: string;
  name: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "error" | "skipped";
  order: number;
  estimated_hours: number;
  actual_hours?: number;
  notes?: string;
  completed_at?: string;
  assigned_to?: string;
}

export default function ProcessDetailPage() {
  const params = useParams();
  const router = useRouter();
  const processId = params.id as string;
  
  const [process, setProcess] = useState<Process | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Process>>({});
  const [showAddStepModal, setShowAddStepModal] = useState(false);
  const [newStep, setNewStep] = useState<Partial<ProcessStep>>({});
  const [viewMode, setViewMode] = useState<"list" | "visio">("visio");

  useEffect(() => {
    if (processId) {
      loadProcess();
    }
  }, [processId]);

  const loadProcess = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from("rt_processes")
        .select("*")
        .eq("id", processId)
        .single();

      if (error) {
        console.error("Error cargando proceso:", error);
        return;
      }

      setProcess(data);
      setEditData(data);
    } catch (error) {
      console.error("Error cargando proceso:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProcess = async () => {
    try {
      const { error } = await supabase
        .from("rt_processes")
        .update({
          ...editData,
          updated_at: new Date().toISOString()
        })
        .eq("id", processId);

      if (error) {
        console.error("Error actualizando proceso:", error);
        return;
      }

      await loadProcess();
      setIsEditing(false);
    } catch (error) {
      console.error("Error actualizando proceso:", error);
    }
  };

  const updateStepStatus = async (stepId: string, newStatus: ProcessStep["status"]) => {
    if (!process) return;

    try {
      const updatedSteps = process.steps.map(step => {
        if (step.id === stepId) {
          return {
            ...step,
            status: newStatus,
            completed_at: newStatus === "completed" ? new Date().toISOString() : undefined
          };
        }
        return step;
      });

      const completedSteps = updatedSteps.filter(step => step.status === "completed").length;
      const progress = Math.round((completedSteps / updatedSteps.length) * 100);

      const { error } = await supabase
        .from("rt_processes")
        .update({
          steps: updatedSteps,
          progress,
          status: progress === 100 ? "completed" : progress > 0 ? "in_progress" : "pending",
          updated_at: new Date().toISOString()
        })
        .eq("id", processId);

      if (error) {
        console.error("Error actualizando paso:", error);
        return;
      }

      await loadProcess();
    } catch (error) {
      console.error("Error actualizando paso:", error);
    }
  };

  const addStep = async () => {
    if (!process || !newStep.name || !newStep.description) return;

    try {
      const stepToAdd: ProcessStep = {
        id: `step-${Date.now()}`,
        name: newStep.name,
        description: newStep.description,
        status: "pending",
        order: process.steps.length + 1,
        estimated_hours: newStep.estimated_hours || 8,
        assigned_to: newStep.assigned_to || process.assigned_to
      };

      const updatedSteps = [...process.steps, stepToAdd];

      const { error } = await supabase
        .from("rt_processes")
        .update({
          steps: updatedSteps,
          updated_at: new Date().toISOString()
        })
        .eq("id", processId);

      if (error) {
        console.error("Error agregando paso:", error);
        return;
      }

      setNewStep({});
      setShowAddStepModal(false);
      await loadProcess();
    } catch (error) {
      console.error("Error agregando paso:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "in_progress": return "bg-blue-100 text-blue-800";
      case "pending": return "bg-gray-100 text-gray-800";
      case "error": return "bg-red-100 text-red-800";
      case "paused": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "bg-red-100 text-red-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getProcessIcon = (processName: string) => {
    if (processName.toLowerCase().includes("whatsapp")) return <MessageCircle className="w-6 h-6" />;
    if (processName.toLowerCase().includes("web")) return <Globe className="w-6 h-6" />;
    if (processName.toLowerCase().includes("red")) return <Wifi className="w-6 h-6" />;
    return <Settings className="w-6 h-6" />;
  };

  const getProcessType = (processName: string) => {
    if (processName.toLowerCase().includes("whatsapp")) return "whatsapp";
    if (processName.toLowerCase().includes("web")) return "web";
    if (processName.toLowerCase().includes("red")) return "network";
    return "process";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue6 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando proceso...</p>
        </div>
      </div>
    );
  }

  if (!process) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Proceso no encontrado</h2>
          <p className="text-gray-600 mb-4">El proceso que buscas no existe o fue eliminado.</p>
          <button
            onClick={() => router.push("/admin/process-tracking")}
            className="px-4 py-2 bg-blue6 text-white rounded-lg hover:bg-blue7 transition-colors"
          >
            Volver al listado
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/admin/process-tracking")}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              {getProcessIcon(process.name)}
              <div>
                <h1 className="text-3xl font-title text-gray-900">{process.name}</h1>
                <p className="text-gray-600">{process.description}</p>
              </div>
            </div>
          </div>
                     <div className="flex items-center gap-2">
             <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
               <button
                 onClick={() => setViewMode("visio")}
                 className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                   viewMode === "visio" 
                     ? "bg-white text-blue6 shadow-sm" 
                     : "text-gray-600 hover:text-gray-900"
                 }`}
               >
                 Diagrama Visio
               </button>
               <button
                 onClick={() => setViewMode("list")}
                 className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                   viewMode === "list" 
                     ? "bg-white text-blue6 shadow-sm" 
                     : "text-gray-600 hover:text-gray-900"
                 }`}
               >
                 Lista
               </button>
             </div>
             {isEditing ? (
               <>
                 <button
                   onClick={() => setIsEditing(false)}
                   className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                 >
                   Cancelar
                 </button>
                 <button
                   onClick={updateProcess}
                   className="px-4 py-2 bg-blue6 text-white rounded-lg hover:bg-blue7 transition-colors"
                 >
                   Guardar
                 </button>
               </>
             ) : (
               <button
                 onClick={() => setIsEditing(true)}
                 className="px-4 py-2 bg-blue6 text-white rounded-lg hover:bg-blue7 transition-colors"
               >
                 <Edit className="w-4 h-4 mr-2" />
                 Editar
               </button>
             )}
           </div>
        </div>
      </div>

      {/* Process Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Estado</p>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(process.status)}`}>
                {process.status === "in_progress" ? "En Progreso" :
                 process.status === "completed" ? "Completado" :
                 process.status === "pending" ? "Pendiente" :
                 process.status === "error" ? "Error" : "Pausado"}
              </span>
            </div>
            <div className="p-3 bg-blue6/10 rounded-full">
              <Target className="w-8 h-8 text-blue6" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Prioridad</p>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(process.priority)}`}>
                {process.priority === "critical" ? "Crítica" :
                 process.priority === "high" ? "Alta" :
                 process.priority === "medium" ? "Media" : "Baja"}
              </span>
            </div>
            <div className="p-3 bg-orange-500/10 rounded-full">
              <AlertTriangle className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Progreso</p>
              <p className="text-2xl font-bold text-gray-900">{process.progress}%</p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-full">
              <BarChart3 className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Asignado a</p>
              <p className="text-lg font-semibold text-gray-900">{process.assigned_to}</p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-full">
              <User className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Process Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Process Information */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Información del Proceso</h3>
            
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
                  <input
                    type="text"
                    value={editData.name || ""}
                    onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue6 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                  <textarea
                    value={editData.description || ""}
                    onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue6 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Asignado a</label>
                  <input
                    type="text"
                    value={editData.assigned_to || ""}
                    onChange={(e) => setEditData(prev => ({ ...prev, assigned_to: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue6 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de entrega</label>
                  <input
                    type="date"
                    value={editData.due_date || ""}
                    onChange={(e) => setEditData(prev => ({ ...prev, due_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue6 focus:border-transparent"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Fecha de entrega: {process.due_date ? new Date(process.due_date).toLocaleDateString("es-CL") : "No definida"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <span>Asignado a: {process.assigned_to}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FileText className="w-4 h-4" />
                  <span>Notas: {process.notes || "Sin notas"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Target className="w-4 h-4" />
                  <span>Horas estimadas: {process.estimated_hours || 0}h</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <BarChart3 className="w-4 h-4" />
                  <span>Horas reales: {process.actual_hours || 0}h</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Process Flow Diagram */}
        <div className="lg:col-span-2">
          {viewMode === "visio" ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Diagrama de Flujo Visio</h3>
              <VisioFlowDiagram
                steps={process.steps}
                onStepsUpdate={async (updatedSteps) => {
                  try {
                    const { error } = await supabase
                      .from("rt_processes")
                      .update({
                        steps: updatedSteps,
                        updated_at: new Date().toISOString()
                      })
                      .eq("id", processId);
                    
                    if (error) {
                      console.error("Error actualizando pasos:", error);
                      return;
                    }
                    
                    await loadProcess();
                  } catch (error) {
                    console.error("Error actualizando pasos:", error);
                  }
                }}
                processType={getProcessType(process.name)}
                readOnly={false}
              />
            </div>
          ) : (
            <ProcessFlowDiagram
              steps={process.steps}
              onStepUpdate={updateStepStatus}
              onStepEdit={() => {}}
              onStepAdd={() => setShowAddStepModal(true)}
            />
          )}
        </div>
      </div>

      {/* Add Step Modal */}
      {showAddStepModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Agregar Nuevo Paso</h2>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del paso</label>
                  <input
                    type="text"
                    value={newStep.name || ""}
                    onChange={(e) => setNewStep(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue6 focus:border-transparent"
                    placeholder="Ej: Configuración inicial"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                  <textarea
                    value={newStep.description || ""}
                    onChange={(e) => setNewStep(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue6 focus:border-transparent"
                    placeholder="Descripción detallada del paso..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Horas estimadas</label>
                  <input
                    type="number"
                    value={newStep.estimated_hours || ""}
                    onChange={(e) => setNewStep(prev => ({ ...prev, estimated_hours: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue6 focus:border-transparent"
                    placeholder="8"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Asignado a</label>
                  <input
                    type="text"
                    value={newStep.assigned_to || ""}
                    onChange={(e) => setNewStep(prev => ({ ...prev, assigned_to: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue6 focus:border-transparent"
                    placeholder={process.assigned_to}
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddStepModal(false);
                  setNewStep({});
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={addStep}
                className="px-4 py-2 bg-blue6 text-white rounded-lg hover:bg-blue7 transition-colors"
              >
                Agregar Paso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

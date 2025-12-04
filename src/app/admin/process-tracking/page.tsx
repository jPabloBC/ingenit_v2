"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Plus, 
  Edit, 
  Trash2, 
  ArrowRight,
  Play,
  Pause,
  AlertTriangle,
  Filter,
  Search,
  Download,
  Upload,
  Settings,
  BarChart3,
  Calendar,
  Users,
  Target
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import CreateProcessModal from "@/components/CreateProcessModal";

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

interface ProcessTemplate {
  id: string;
  name: string;
  description: string;
  steps: Omit<ProcessStep, "id" | "status" | "actual_hours" | "notes" | "completed_at" | "assigned_to">[];
}

export default function ProcessTrackingPage() {
  const router = useRouter();
  const [processes, setProcesses] = useState<Process[]>([]);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Templates de procesos predefinidos
  const processTemplates: ProcessTemplate[] = [
    {
      id: "whatsapp-flow",
      name: "Flujo de WhatsApp con Menús Interactivos",
      description: "Proceso completo de implementación de chatbot de WhatsApp con menús interactivos",
      steps: [
        { name: "Análisis de Requerimientos del Cliente", description: "Entrevistar al cliente para entender necesidades específicas del chatbot", order: 1, estimated_hours: 4 },
        { name: "Diseño de Arquitectura del Bot", description: "Diseñar la estructura de conversación y flujos de navegación", order: 2, estimated_hours: 8 },
        { name: "Creación de Menús Interactivos", description: "Desarrollar menús con botones y opciones de navegación", order: 3, estimated_hours: 12 },
        { name: "Configuración de Respuestas Automáticas", description: "Programar respuestas automáticas para preguntas frecuentes", order: 4, estimated_hours: 16 },
        { name: "Integración con APIs Externas", description: "Conectar con sistemas CRM, bases de datos y servicios web", order: 5, estimated_hours: 20 },
        { name: "Implementación de Lógica de Negocio", description: "Desarrollar lógica para cotizaciones, citas y consultas", order: 6, estimated_hours: 24 },
        { name: "Testing y Depuración", description: "Probar todos los flujos y corregir errores", order: 7, estimated_hours: 16 },
        { name: "Configuración de Webhooks", description: "Configurar webhooks para integración con WhatsApp Business API", order: 8, estimated_hours: 8 },
        { name: "Entrenamiento del Equipo", description: "Capacitar al equipo en el uso y mantenimiento del bot", order: 9, estimated_hours: 6 },
        { name: "Despliegue y Activación", description: "Activar el bot en producción y monitorear funcionamiento", order: 10, estimated_hours: 4 },
        { name: "Documentación y Manuales", description: "Crear documentación técnica y manuales de usuario", order: 11, estimated_hours: 8 },
        { name: "Seguimiento y Optimización", description: "Monitorear métricas y optimizar rendimiento", order: 12, estimated_hours: 12 }
      ]
    },
    {
      id: "web-development",
      name: "Desarrollo Web",
      description: "Proceso completo de desarrollo de aplicación web",
      steps: [
        { name: "Análisis de Requerimientos", description: "Recopilar y analizar requerimientos del cliente", order: 1, estimated_hours: 8 },
        { name: "Diseño de Arquitectura", description: "Diseñar la arquitectura técnica del sistema", order: 2, estimated_hours: 16 },
        { name: "Desarrollo Frontend", description: "Implementar la interfaz de usuario", order: 3, estimated_hours: 40 },
        { name: "Desarrollo Backend", description: "Implementar la lógica del servidor", order: 4, estimated_hours: 32 },
        { name: "Integración", description: "Integrar frontend y backend", order: 5, estimated_hours: 16 },
        { name: "Testing", description: "Pruebas de funcionalidad y calidad", order: 6, estimated_hours: 24 },
        { name: "Despliegue", description: "Desplegar en producción", order: 7, estimated_hours: 8 },
        { name: "Documentación", description: "Documentar el sistema", order: 8, estimated_hours: 12 }
      ]
    },
    {
      id: "network-installation",
      name: "Instalación de Redes",
      description: "Proceso de instalación y configuración de infraestructura de red",
      steps: [
        { name: "Evaluación del Sitio", description: "Evaluar las necesidades de red del sitio", order: 1, estimated_hours: 4 },
        { name: "Diseño de Red", description: "Diseñar la topología de red", order: 2, estimated_hours: 8 },
        { name: "Instalación de Cableado", description: "Instalar cableado estructurado", order: 3, estimated_hours: 24 },
        { name: "Configuración de Switches", description: "Configurar switches y routers", order: 4, estimated_hours: 16 },
        { name: "Configuración WiFi", description: "Configurar puntos de acceso WiFi", order: 5, estimated_hours: 12 },
        { name: "Configuración de Seguridad", description: "Implementar medidas de seguridad", order: 6, estimated_hours: 16 },
        { name: "Pruebas de Conectividad", description: "Verificar conectividad y rendimiento", order: 7, estimated_hours: 8 },
        { name: "Entrega y Capacitación", description: "Entregar sistema y capacitar usuarios", order: 8, estimated_hours: 8 }
      ]
    },
    {
      id: "consulting-project",
      name: "Proyecto de Consultoría",
      description: "Proceso de consultoría IT completa",
      steps: [
        { name: "Diagnóstico Inicial", description: "Evaluar el estado actual del sistema", order: 1, estimated_hours: 16 },
        { name: "Análisis de Procesos", description: "Analizar procesos actuales", order: 2, estimated_hours: 24 },
        { name: "Identificación de Oportunidades", description: "Identificar oportunidades de mejora", order: 3, estimated_hours: 20 },
        { name: "Propuesta de Soluciones", description: "Desarrollar propuestas de mejora", order: 4, estimated_hours: 32 },
        { name: "Presentación al Cliente", description: "Presentar recomendaciones", order: 5, estimated_hours: 8 },
        { name: "Implementación", description: "Implementar soluciones aprobadas", order: 6, estimated_hours: 40 },
        { name: "Seguimiento", description: "Monitorear resultados", order: 7, estimated_hours: 16 },
        { name: "Cierre del Proyecto", description: "Documentar resultados y cerrar proyecto", order: 8, estimated_hours: 12 }
      ]
    }
  ];

  useEffect(() => {
    loadProcesses();
  }, []);

  const loadProcesses = async () => {
    try {
      setIsLoading(true);
      
      // Cargar procesos desde Supabase
      const { data: processesData, error } = await supabase
        .from("rt_processes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error cargando procesos:", error);
        
        // Si el error es 404 (tabla no existe), mostrar mensaje específico
        if (error.code === 'PGRST116' || error.message?.includes('404')) {
          console.log("La tabla 'processes' no existe. Ejecuta el script SQL para crearla.");
          setProcesses([]);
        } else {
          // Otros errores
          setProcesses([]);
        }
      } else {
        // Transformar datos de Supabase al formato de la interfaz
        const transformedProcesses: Process[] = (processesData || []).map(process => ({
          id: process.id,
          name: process.name,
          description: process.description,
          status: process.status,
          priority: process.priority,
          assigned_to: process.assigned_to,
          created_at: process.created_at,
          updated_at: process.updated_at,
          due_date: process.due_date,
          progress: process.progress || 0,
          steps: process.steps || []
        }));
        
        setProcesses(transformedProcesses);
      }
    } catch (error) {
      console.error("Error cargando procesos:", error);
      setProcesses([]);
    } finally {
      setIsLoading(false);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="w-4 h-4" />;
      case "in_progress": return <Play className="w-4 h-4" />;
      case "pending": return <Clock className="w-4 h-4" />;
      case "error": return <XCircle className="w-4 h-4" />;
      case "paused": return <Pause className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const filteredProcesses = processes.filter(process => {
    const matchesSearch = process.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         process.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || process.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || process.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const updateStepStatus = async (processId: string, stepId: string, newStatus: ProcessStep["status"]) => {
    try {
      // Actualizar estado local primero para UI responsiva
      setProcesses(prev => prev.map(process => {
        if (process.id === processId) {
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
          
          return {
            ...process,
            steps: updatedSteps,
            progress,
            status: progress === 100 ? "completed" : progress > 0 ? "in_progress" : "pending",
            updated_at: new Date().toISOString()
          };
        }
        return process;
      }));

      // Guardar en Supabase
      const { error } = await supabase
        .from("rt_processes")
        .update({
          steps: processes.find(p => p.id === processId)?.steps,
          progress: processes.find(p => p.id === processId)?.progress,
          status: processes.find(p => p.id === processId)?.status,
          updated_at: new Date().toISOString()
        })
        .eq("id", processId);

      if (error) {
        console.error("Error actualizando proceso:", error);
      }
    } catch (error) {
      console.error("Error actualizando estado del paso:", error);
    }
  };

  const createProcess = async (processData: {
    name: string;
    description: string;
    template_id: string;
    priority: string;
    assigned_to: string;
    due_date: string;
  }) => {
    try {
      const selectedTemplate = processTemplates.find(t => t.id === processData.template_id);
      if (!selectedTemplate) {
        throw new Error("Plantilla no encontrada");
      }

      const newProcess = {
        name: processData.name,
        description: processData.description,
        status: "pending",
        priority: processData.priority,
        assigned_to: processData.assigned_to,
        due_date: processData.due_date,
        progress: 0,
        steps: selectedTemplate.steps.map((step, index) => ({
          ...step,
          id: `step-${Date.now()}-${index}`,
          status: "pending" as const
        })),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from("rt_processes")
        .insert([newProcess])
        .select()
        .single();

      if (error) {
        console.error("Error creando proceso:", error);
        
        // Si el error es 404 (tabla no existe), mostrar mensaje específico
        if (error.code === 'PGRST116' || error.message?.includes('404')) {
          alert("Error: La tabla 'processes' no existe en la base de datos. Por favor, ejecuta el script SQL para crear la tabla.");
        } else {
          alert(`Error creando proceso: ${error.message}`);
        }
        throw error;
      }

      // Agregar a la lista local
      setProcesses(prev => [data, ...prev]);
      setShowCreateModal(false);
    } catch (error) {
      console.error("Error creando proceso:", error);
      // No mostrar alerta aquí porque ya se mostró arriba
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue6 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando seguimiento de procesos...</p>
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
              Seguimiento de Procesos
            </h1>
            <p className="text-gray-600">
              Gestiona y monitorea el progreso de todos tus proyectos
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue6 text-white rounded-lg hover:bg-blue7 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nuevo Proceso
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Procesos</p>
              <p className="text-3xl font-bold text-gray-900">{processes.length}</p>
            </div>
            <div className="p-3 bg-blue6/10 rounded-full">
              <Target className="w-8 h-8 text-blue6" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">En Progreso</p>
              <p className="text-3xl font-bold text-gray-900">
                {processes.filter(p => p.status === "in_progress").length}
              </p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-full">
              <Play className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completados</p>
              <p className="text-3xl font-bold text-gray-900">
                {processes.filter(p => p.status === "completed").length}
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
              <p className="text-sm font-medium text-gray-600">Con Errores</p>
              <p className="text-3xl font-bold text-gray-900">
                {processes.filter(p => p.status === "error").length}
              </p>
            </div>
            <div className="p-3 bg-red-500/10 rounded-full">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar procesos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue6 focus:border-transparent"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue6 focus:border-transparent"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="in_progress">En Progreso</option>
              <option value="completed">Completado</option>
              <option value="error">Error</option>
              <option value="paused">Pausado</option>
            </select>
            
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue6 focus:border-transparent"
            >
              <option value="all">Todas las prioridades</option>
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="critical">Crítica</option>
            </select>
          </div>
        </div>
      </div>

      {/* Processes List */}
      {filteredProcesses.length === 0 ? (
        <div className="col-span-full">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-blue6/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-blue6" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay procesos creados</h3>
            <p className="text-gray-600 mb-6">
              Comienza creando tu primer proceso de seguimiento para gestionar tus proyectos
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">
                <strong>Nota:</strong> Si ves errores 404, es posible que necesites crear la tabla 'processes' en Supabase. 
                Ejecuta el script SQL <code className="bg-yellow-100 px-1 rounded">create-processes-table.sql</code> en tu base de datos.
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue6 text-white rounded-lg hover:bg-blue7 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Crear Primer Proceso
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredProcesses.map((process) => (
          <div 
            key={process.id} 
            className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
            onClick={() => router.push(`/admin/process-tracking/${process.id}`)}
          >
            {/* Process Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{process.name}</h3>
                  <p className="text-gray-600 text-sm mb-3">{process.description}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(process.status)}`}>
                      {process.status === "in_progress" ? "En Progreso" :
                       process.status === "completed" ? "Completado" :
                       process.status === "pending" ? "Pendiente" :
                       process.status === "error" ? "Error" : "Pausado"}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(process.priority)}`}>
                      {process.priority === "critical" ? "Crítica" :
                       process.priority === "high" ? "Alta" :
                       process.priority === "medium" ? "Media" : "Baja"}
                    </span>
                    <span className="text-gray-500">Asignado a: {process.assigned_to}</span>
                  </div>
                </div>
                                 <div className="flex items-center gap-2">
                   <button
                     onClick={() => router.push(`/admin/process-tracking/${process.id}`)}
                     className="p-2 text-blue6 hover:bg-blue6/10 rounded-lg transition-colors"
                     title="Ver detalles"
                   >
                     <Edit className="w-4 h-4" />
                   </button>
                 </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>Progreso</span>
                  <span>{process.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      process.progress === 100 ? "bg-green-500" :
                      process.progress > 50 ? "bg-blue-500" :
                      process.progress > 25 ? "bg-yellow-500" : "bg-gray-400"
                    }`}
                    style={{ width: `${process.progress}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Process Steps */}
            <div className="p-6">
              <h4 className="font-medium text-gray-900 mb-4">Pasos del Proceso</h4>
              <div className="space-y-3">
                {process.steps.slice(0, 4).map((step, index) => (
                  <div key={step.id} className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {step.status === "completed" ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : step.status === "error" ? (
                        <XCircle className="w-5 h-5 text-red-500" />
                      ) : step.status === "in_progress" ? (
                        <Play className="w-5 h-5 text-blue-500" />
                      ) : (
                        <Clock className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{step.name}</p>
                      <p className="text-xs text-gray-500">{step.description}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateStepStatus(process.id, step.id, "completed")}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                        title="Marcar como completado"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => updateStepStatus(process.id, step.id, "error")}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Marcar como error"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                
                {process.steps.length > 4 && (
                  <div className="text-center pt-2">
                    <button className="text-blue6 hover:text-blue7 text-sm font-medium">
                      Ver {process.steps.length - 4} pasos más
                    </button>
                  </div>
                )}
              </div>
                         </div>
           </div>
         ))}
        </div>
      )}

      {/* Create Process Modal */}
      {showCreateModal && (
        <CreateProcessModal
          templates={processTemplates}
          onCreate={createProcess}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { XCircle, MessageCircle, Globe, Settings, Wifi } from "lucide-react";

interface ProcessTemplate {
  id: string;
  name: string;
  description: string;
  steps: any[];
}

interface CreateProcessModalProps {
  templates: ProcessTemplate[];
  onCreate: (processData: {
    name: string;
    description: string;
    template_id: string;
    priority: string;
    assigned_to: string;
    due_date: string;
  }) => void;
  onClose: () => void;
}

export default function CreateProcessModal({ templates, onCreate, onClose }: CreateProcessModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    template_id: "",
    priority: "medium",
    assigned_to: "",
    due_date: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.template_id || !formData.assigned_to || !formData.due_date) {
      alert("Por favor completa todos los campos requeridos");
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreate(formData);
    } catch (error) {
      console.error("Error creando proceso:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTemplateIcon = (templateId: string) => {
    switch (templateId) {
      case "whatsapp-flow":
        return <MessageCircle className="w-5 h-5" />;
      case "web-development":
        return <Globe className="w-5 h-5" />;
      case "network-installation":
        return <Wifi className="w-5 h-5" />;
      case "consulting-project":
        return <Settings className="w-5 h-5" />;
      default:
        return <Settings className="w-5 h-5" />;
    }
  };

  const selectedTemplate = templates.find(t => t.id === formData.template_id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900">Crear Nuevo Proceso</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formulario */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plantilla de Proceso *
                </label>
                <select
                  value={formData.template_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, template_id: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue6 focus:border-transparent"
                  required
                >
                  <option value="">Seleccionar plantilla...</option>
                  {templates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Proceso *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: WhatsApp Bot - Cliente ABC"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue6 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descripción detallada del proceso..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue6 focus:border-transparent"
                ></textarea>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prioridad
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue6 focus:border-transparent"
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                    <option value="critical">Crítica</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Asignado a *
                  </label>
                  <input
                    type="text"
                    value={formData.assigned_to}
                    onChange={(e) => setFormData(prev => ({ ...prev, assigned_to: e.target.value }))}
                    placeholder="Nombre del responsable"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue6 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Entrega *
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue6 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Vista previa de la plantilla */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Vista Previa de la Plantilla</h3>
              
              {selectedTemplate ? (
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-4">
                    {getTemplateIcon(selectedTemplate.id)}
                    <div>
                      <h4 className="font-semibold text-gray-900">{selectedTemplate.name}</h4>
                      <p className="text-sm text-gray-600">{selectedTemplate.description}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h5 className="font-medium text-gray-900">Pasos del proceso:</h5>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {selectedTemplate.steps.map((step, index) => (
                        <div key={index} className="flex items-center gap-3 p-2 bg-white rounded border">
                          <div className="w-6 h-6 rounded-full bg-blue6 text-white text-xs flex items-center justify-center font-semibold">
                            {step.order}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{step.name}</p>
                            <p className="text-xs text-gray-600">{step.description}</p>
                          </div>
                          <div className="text-xs text-gray-500">
                            {step.estimated_hours}h
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total de pasos:</span>
                        <span className="font-semibold">{selectedTemplate.steps.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Horas estimadas:</span>
                        <span className="font-semibold">
                          {selectedTemplate.steps.reduce((total, step) => total + step.estimated_hours, 0)}h
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-8 text-center">
                  <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Selecciona una plantilla para ver la vista previa</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue6 text-white rounded-lg hover:bg-blue4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Creando..." : "Crear Proceso"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

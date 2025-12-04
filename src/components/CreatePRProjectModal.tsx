"use client";
import { useState } from "react";
import { X, Plus, Save, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface CreatePRProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: () => void;
}

interface ProjectFormData {
  name: string;
  description: string;
  environment: 'production' | 'staging' | 'development';
  status: 'active' | 'inactive' | 'maintenance';
  repository_url: string;
  deployment_url: string;
}

export default function CreatePRProjectModal({ isOpen, onClose, onProjectCreated }: CreatePRProjectModalProps) {
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    environment: 'development',
    status: 'active',
    repository_url: '',
    deployment_url: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('pr_projects')
        .insert([{
          ...formData,
          health_status: 'healthy',
          created_at: new Date().toISOString(),
          last_deployment: new Date().toISOString()
        }]);

      if (error) {
        throw error;
      }

      console.log('✅ Proyecto PR creado exitosamente');
      onProjectCreated();
      onClose();
      
      // Resetear formulario
      setFormData({
        name: '',
        description: '',
        environment: 'development',
        status: 'active',
        repository_url: '',
        deployment_url: ''
      });

    } catch (error: any) {
      console.error('❌ Error creando proyecto PR:', error);
      setError(error.message || 'Error al crear el proyecto');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Plus className="w-5 h-5 text-orange-600" />
            Crear Nuevo Proyecto PR
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Proyecto *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Ej: PR Analytics Dashboard"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Descripción del proyecto..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="environment" className="block text-sm font-medium text-gray-700 mb-1">
                Entorno *
              </label>
              <select
                id="environment"
                name="environment"
                required
                value={formData.environment}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="development">Desarrollo</option>
                <option value="staging">Staging</option>
                <option value="production">Producción</option>
              </select>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Estado *
              </label>
              <select
                id="status"
                name="status"
                required
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
                <option value="maintenance">Mantenimiento</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="repository_url" className="block text-sm font-medium text-gray-700 mb-1">
              URL del Repositorio
            </label>
            <input
              type="url"
              id="repository_url"
              name="repository_url"
              value={formData.repository_url}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="https://github.com/usuario/proyecto"
            />
          </div>

          <div>
            <label htmlFor="deployment_url" className="block text-sm font-medium text-gray-700 mb-1">
              URL de Despliegue
            </label>
            <input
              type="url"
              id="deployment_url"
              name="deployment_url"
              value={formData.deployment_url}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="https://proyecto.pr.ingenit.cl"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors disabled:bg-orange-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Crear Proyecto
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
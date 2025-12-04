"use client";
import { useEffect, useState } from "react";
import { FolderOpen, Plus, Edit, Trash2, Search, Globe, GitBranch, Activity, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface PRProject {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'maintenance';
  environment: 'production' | 'staging' | 'development';
  health_status: 'healthy' | 'warning' | 'error';
  repository_url?: string;
  deployment_url?: string;
  created_at: string;
  last_deployment?: string;
}

export default function PRProjectsPage() {
  const [projects, setProjects] = useState<PRProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterEnvironment, setFilterEnvironment] = useState<string>('all');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      console.log("🔍 Cargando proyectos PR...");
      
      const { data, error } = await supabase
        .from("pr_projects")
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          // Si la tabla no existe, mostrar estado vacío
          setProjects([]);
        } else {
          throw error;
        }
      } else {
        setProjects(data || []);
      }
    } catch (error) {
      console.error("❌ Error cargando proyectos PR:", error);
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (project.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || project.status === filterStatus;
    const matchesEnvironment = filterEnvironment === 'all' || project.environment === filterEnvironment;
    
    return matchesSearch && matchesStatus && matchesEnvironment;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'inactive':
        return 'text-red-600 bg-red-100';
      case 'maintenance':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getEnvironmentColor = (environment: string) => {
    switch (environment) {
      case 'production':
        return 'text-red-600 bg-red-100';
      case 'staging':
        return 'text-yellow-600 bg-yellow-100';
      case 'development':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando proyectos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-orange-100 rounded-lg">
            <FolderOpen className="w-6 h-6 text-orange-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-title text-gray-900">
            Gestión de Proyectos PR
          </h1>
        </div>
        <p className="text-sm sm:text-base text-gray-600">
          Administra los proyectos y deployments del ecosistema PR
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Proyectos</p>
              <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
            </div>
            <FolderOpen className="w-8 h-8 text-orange-600" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Activos</p>
              <p className="text-2xl font-bold text-green-600">{projects.filter(p => p.status === 'active').length}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Producción</p>
              <p className="text-2xl font-bold text-red-600">{projects.filter(p => p.environment === 'production').length}</p>
            </div>
            <Globe className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Con Problemas</p>
              <p className="text-2xl font-bold text-yellow-600">{projects.filter(p => p.health_status === 'warning' || p.health_status === 'error').length}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow border p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar proyectos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
              <option value="maintenance">Mantenimiento</option>
            </select>

            <select
              value={filterEnvironment}
              onChange={(e) => setFilterEnvironment(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">Todos los entornos</option>
              <option value="production">Producción</option>
              <option value="staging">Staging</option>
              <option value="development">Desarrollo</option>
            </select>

            <button className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Nuevo Proyecto
            </button>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project) => (
          <div key={project.id} className="bg-white rounded-lg shadow border hover:shadow-lg transition-shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-orange-600" />
                  <h3 className="font-semibold text-gray-900">{project.name}</h3>
                </div>
                {getHealthIcon(project.health_status)}
              </div>

              {project.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{project.description}</p>
              )}

              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(project.status)}`}>
                  {project.status}
                </span>
                <span className={`px-2 py-1 text-xs rounded-full ${getEnvironmentColor(project.environment)}`}>
                  {project.environment}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {project.deployment_url && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Globe className="w-4 h-4" />
                    <a 
                      href={project.deployment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-orange-600 truncate"
                    >
                      {project.deployment_url}
                    </a>
                  </div>
                )}
                {project.repository_url && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <GitBranch className="w-4 h-4" />
                    <a 
                      href={project.repository_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-orange-600 truncate"
                    >
                      Repository
                    </a>
                  </div>
                )}
              </div>

              <div className="text-xs text-gray-500 mb-4">
                {project.last_deployment ? (
                  <>Último deploy: {new Date(project.last_deployment).toLocaleString('es-CL')}</>
                ) : (
                  <>Creado: {new Date(project.created_at).toLocaleString('es-CL')}</>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button className="text-blue-600 hover:text-blue-800 p-1">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="text-red-600 hover:text-red-800 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-xs text-gray-400">
                  ID: {project.id}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-2">No se encontraron proyectos</p>
          <p className="text-sm text-gray-400">
            {searchTerm || filterStatus !== 'all' || filterEnvironment !== 'all'
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'Los proyectos aparecerán aquí cuando se creen'}
          </p>
        </div>
      )}
    </div>
  );
}
"use client";
import { useEffect, useState } from "react";
import { Users, MessageCircle, Settings, TrendingUp, Bot, ExternalLink, Globe, Wrench, Heart, Briefcase, Activity } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { trackDashboardInteraction } from "@/hooks/useVercelAnalytics";
import VisitsStats from "./VisitsStats";

interface DashboardData {
  totalCompanies: number;
  totalUsers: number;
  totalMessages: number;
  unreadMessages: number;
  recentActivity: Array<{
    id: string;
    name: string;
    email: string;
    created_at: string;
    type: string;
  }>;
  projectVisits: Array<{
    project_code: string;
    project_url: string;
    total_visits: number;
    unique_visitors: number;
    today_visits: number;
    week_visits: number;
    month_visits: number;
    last_visit: string;
  }>;
}

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalCompanies: 0,
    totalUsers: 0,
    totalMessages: 0,
    unreadMessages: 0,
    recentActivity: [],
    projectVisits: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadDashboardData();

    // Suscripción en tiempo real a rt_messages (solo direction = 'in')
    const channel = supabase.channel('rt_messages_in_dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rt_messages'
        },
        (payload) => {
          // Recargar el dashboard ante cualquier cambio en rt_messages
          loadDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      // Contar empresas
      const { count: companiesCount } = await supabase
        .from("pr_companies")
        .select("*", { count: "exact", head: true });

      // Contar usuarios
      const { count: usersCount } = await supabase
        .from("pr_users")
        .select("*", { count: "exact", head: true });


      // Contar mensajes entrantes de WhatsApp (rt_messages, direction = 'in')
      let messagesCount = 0;
      try {
        const { count: totalMessages } = await supabase
          .from("rt_messages")
          .select("*", { count: "exact", head: true })
          .eq("direction", "in");
        messagesCount = totalMessages || 0;
      } catch (error) {
        console.log("Tabla rt_messages no existe o no es accesible");
      }

      // Obtener actividad reciente de empresas y usuarios
      const { data: recentCompanies } = await supabase
        .from("pr_companies")
        .select("id, name, email, created_at")
        .order("created_at", { ascending: false })
        .limit(3);

      const { data: recentUsers } = await supabase
        .from("pr_users")
        .select("id, name, email, created_at")
        .order("created_at", { ascending: false })
        .limit(2);

      // Combinar actividad reciente
      const recentActivity = [
        ...(recentCompanies || []).map(company => ({
          ...company,
          type: 'company'
        })),
        ...(recentUsers || []).map(user => ({
          ...user,
          type: 'user'
        }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
       .slice(0, 5);

      // Obtener estadísticas de visitas de proyectos
      let projectVisits: any[] = [];
      try {
        const { data: visitsData } = await supabase
          .from("project_visit_stats")
          .select("*")
          .order("total_visits", { ascending: false });
        projectVisits = visitsData || [];
      } catch (error) {
        console.log("Vista project_visit_stats no disponible");
      }

      setDashboardData({
        totalCompanies: companiesCount || 0,
        totalUsers: usersCount || 0,
        totalMessages: messagesCount || 0,
  unreadMessages: 0,
        recentActivity,
        projectVisits
      });
    } catch (error) {
      console.error("Error cargando datos del dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue6 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 dashboard-transition">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-title text-gray-900 mb-2 dashboard-text">
          Panel de Administración
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dashboard-text">
          Bienvenido al panel de control de IngenIT
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="dashboard-card bg-white p-4 sm:p-6 rounded-md shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Empresas</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 stats-number">{dashboardData.totalCompanies}</p>
            </div>
            <div className="p-2 sm:p-3 bg-blue6/10 rounded-full flex-shrink-0 ml-3 mobile-icon-container">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue6 mobile-icon" />
            </div>
          </div>
        </div>

        <div className="dashboard-card bg-white p-4 sm:p-6 rounded-md shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Mensajes</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 stats-number">{dashboardData.totalMessages}</p>
            </div>
            <div className="p-2 sm:p-3 bg-green-500/10 rounded-full flex-shrink-0 ml-3 mobile-icon-container">
              <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 mobile-icon" />
            </div>
          </div>
        </div>

        <div className="dashboard-card bg-white p-4 sm:p-6 rounded-md shadow-lg border border-gray-100 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Mensajes No Leídos</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 stats-number">{dashboardData.unreadMessages}</p>
            </div>
            <div className="p-2 sm:p-3 bg-orange-500/10 rounded-full flex-shrink-0 ml-3 mobile-icon-container">
              <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 mobile-icon" />
            </div>
          </div>
        </div>
      </div>

      {/* Project Visits Stats */}
      {dashboardData.projectVisits.length > 0 && (
        <div className="bg-white rounded-md shadow-lg border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
            Estadísticas de Visitas por Proyecto
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboardData.projectVisits.map((project, index) => (
              <div key={index} className="bg-gray-50 rounded-md p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 text-sm uppercase">
                    {project.project_code === 'main' ? 'IngenIT Principal' : 
                     project.project_code === 'hl' ? 'HL' :
                     project.project_code === 'mt' ? 'MT - Mantenimiento' :
                     project.project_code === 'ws' ? 'WS - Web Services' :
                     project.project_code === 'pr' ? 'PR - Proyecto PR' :
                     project.project_code.toUpperCase()}
                  </h3>
                  <span className="text-xs text-gray-500 font-mono">
                    {project.project_code}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Visitas:</span>
                    <span className="font-semibold text-blue-600">{project.total_visits.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Hoy:</span>
                    <span className="font-semibold text-green-600">{project.today_visits.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Esta Semana:</span>
                    <span className="font-semibold text-orange-600">{project.week_visits.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Visitantes Únicos:</span>
                    <span className="font-semibold text-purple-600">{project.unique_visitors.toLocaleString()}</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Última visita: {new Date(project.last_visit).toLocaleString("es-CL")}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {project.project_url}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {dashboardData.projectVisits.length === 0 && (
            <div className="text-center py-6 text-gray-500">
              <p className="text-sm">No hay datos de visitas disponibles</p>
              <p className="text-xs mt-1">Las estadísticas aparecerán cuando se registren visitas</p>
            </div>
          )}
        </div>
      )}

      {/* Projects Section */}
      <div className="bg-white rounded-md shadow-lg border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
          Control de Proyectos
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Acceso directo a cada proyecto y sus datos específicos
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Proyecto Principal - IngenIT */}
          <div className="group">
            <button
              onClick={() => window.open("https://ingenit.cl", "_blank")}
              className="w-full p-4 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-md border border-blue-200 transition-all duration-200 hover:shadow-md hover:scale-105"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-blue-600 rounded-md">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <ExternalLink className="w-4 h-4 text-blue-600 group-hover:text-blue-800" />
              </div>
              <h3 className="font-semibold text-gray-900 text-left">IngenIT Principal</h3>
              <p className="text-xs text-gray-600 text-left mt-1">ingenit.cl</p>
            </button>
          </div>

          {/* Proyecto MT - Mantenimiento TI */}
          <div className="group">
            <button
              onClick={() => {
                trackDashboardInteraction('project_click', 'mt');
                window.open("https://mt.ingenit.cl", "_blank");
              }}
              className="w-full p-4 bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-md border border-green-200 transition-all duration-200 hover:shadow-md hover:scale-105"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-green-600 rounded-md">
                  <Wrench className="w-5 h-5 text-white" />
                </div>
                <ExternalLink className="w-4 h-4 text-green-600 group-hover:text-green-800" />
              </div>
              <h3 className="font-semibold text-gray-900 text-left">MT - Mantenimiento</h3>
              <p className="text-xs text-gray-600 text-left mt-1">mt.ingenit.cl</p>
            </button>
          </div>

          {/* Proyecto HL */}
          <div className="group">
            <button
              onClick={() => {
                trackDashboardInteraction('project_click', 'hl');
                router.push("/admin/hl");
              }}
              className="w-full p-4 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-md border border-blue-200 transition-all duration-200 hover:shadow-md hover:scale-105"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-blue-600 rounded-md">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <Activity className="w-4 h-4 text-blue-600 group-hover:text-blue-800" />
              </div>
              <h3 className="font-semibold text-gray-900 text-left">HL</h3>
              <p className="text-xs text-gray-600 text-left mt-1">Panel de administración</p>
            </button>
          </div>

          {/* Proyecto WS - Web Services */}
          <div className="group">
            <button
              onClick={() => {
                trackDashboardInteraction('project_click', 'ws');
                window.open("https://ws.ingenit.cl", "_blank");
              }}
              className="w-full p-4 bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-md border border-purple-200 transition-all duration-200 hover:shadow-md hover:scale-105"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-purple-600 rounded-md">
                  <Briefcase className="w-5 h-5 text-white" />
                </div>
                <ExternalLink className="w-4 h-4 text-purple-600 group-hover:text-purple-800" />
              </div>
              <h3 className="font-semibold text-gray-900 text-left">WS - Web Services</h3>
              <p className="text-xs text-gray-600 text-left mt-1">ws.ingenit.cl</p>
            </button>
          </div>

          {/* Proyecto PR - Proyecto PR */}
          <div className="group">
            <button
              onClick={() => {
                trackDashboardInteraction('project_click', 'pr');
                router.push("/admin/pr");
              }}
              className="w-full p-4 bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 rounded-md border border-orange-200 transition-all duration-200 hover:shadow-md hover:scale-105"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-orange-600 rounded-md">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <Settings className="w-4 h-4 text-orange-600 group-hover:text-orange-800" />
              </div>
              <h3 className="font-semibold text-gray-900 text-left">PR - Proyecto PR</h3>
              <p className="text-xs text-gray-600 text-left mt-1">Panel de administración</p>
            </button>
          </div>
        </div>
      </div>


      {/* Recent Activity */}
      <div className="bg-white rounded-md shadow-lg border border-gray-100 p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
          Actividad Reciente
        </h2>
        <div className="space-y-3 sm:space-y-4">
          {dashboardData.recentActivity.length > 0 ? (
            dashboardData.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-md">
                <div className="p-1.5 sm:p-2 bg-blue6/10 rounded-full flex-shrink-0">
                  {activity.type === 'company' ? (
                    <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 text-blue6" />
                  ) : (
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue6" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm sm:text-base truncate">
                    {activity.name || activity.email}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">
                    {activity.type === 'company' ? 'Nueva empresa' : 'Nuevo usuario'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(activity.created_at).toLocaleString("es-CL")}
                  </p>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                  activity.type === 'company' ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
                }`}>
                  {activity.type === 'company' ? 'Empresa' : 'Usuario'}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 sm:py-8 text-gray-500">
              <MessageCircle className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-gray-300" />
              <p className="text-sm sm:text-base">No hay actividad reciente</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-md shadow-lg border border-gray-100 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
            Acciones Rápidas
          </h3>
          <div className="space-y-2 sm:space-y-3">
            <button
              onClick={() => router.push("/admin/chat")}
              className="w-full flex items-center gap-3 p-2.5 sm:p-3 text-left hover:bg-gray-50 rounded-md transition-colors duration-200 mobile-button touch-optimized"
            >
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue6 flex-shrink-0" />
              <span className="text-sm sm:text-base">Ver Chat</span>
            </button>
            <button
              onClick={() => router.push("/admin/chatbot-conversations")}
              className="w-full flex items-center gap-3 p-2.5 sm:p-3 text-left hover:bg-gray-50 rounded-md transition-colors duration-200 mobile-button touch-optimized"
            >
              <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
              <span className="text-sm sm:text-base">Conversaciones Chatbot</span>
            </button>
            <button
              onClick={() => router.push("/admin/settings")}
              className="w-full flex items-center gap-3 p-2.5 sm:p-3 text-left hover:bg-gray-50 rounded-md transition-colors duration-200 mobile-button touch-optimized"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 flex-shrink-0" />
              <span className="text-sm sm:text-base">Configuración</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-md shadow-lg border border-gray-100 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
            Información del Sistema
          </h3>
          <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Versión:</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Estado:</span>
              <span className="text-green-600 font-medium">Activo</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Última actualización:</span>
              <span className="font-medium text-right">{new Date().toLocaleDateString("es-CL")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visitas Stats Component */}
      <section className="mt-8">
        <h2 className="text-xl font-bold mb-2 text-blue-800">Visitas - Ingenit.cl</h2>
        <VisitsStats />
      </section>
    </div>
  );
}
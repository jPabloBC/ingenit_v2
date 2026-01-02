"use client";
import { useEffect, useState } from "react";
import { Users, Database, Activity, TrendingUp, Server, CheckCircle, AlertTriangle, XCircle, BarChart3, UserPlus } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { useVercelAnalytics } from '@/hooks/useVercelAnalytics';
import { useRouter } from "next/navigation";

interface CNDashboardData {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalTables: number;
  recentActivity: Array<{
    id: string;
    action: string;
    user_email: string;
    table_name: string;
    created_at: string;
  }>;
  systemMetrics: {
    databaseSize: number;
    lastSync: string;
    errorRate: number;
    activeConnections: number;
  };
}

export default function CNAdminPage() {
  const [dashboardData, setDashboardData] = useState<CNDashboardData>({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    totalTables: 0,
    recentActivity: [],
    systemMetrics: {
      databaseSize: 0,
      lastSync: new Date().toISOString(),
      errorRate: 0,
      activeConnections: 0
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const router = useRouter();

  // Rastrear visitas
  useVercelAnalytics();

  useEffect(() => {
    loadCNData();
  }, []);

  const loadCNData = async () => {
    try {
      console.log("🔍 Iniciando carga de datos CN...");
      if (!isSupabaseConfigured()) {
        const msg = "Supabase no está configurado. Revisa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local.";
        console.error("❌ ", msg);
        setSupabaseError(msg);
        setIsLoading(false);
        return;
      }
      
      // Cargar usuarios CN mediante endpoint admin para evitar RLS recursiva
      try {
        const res = await fetch('/api/admin/cn/users');
        const payload = await res.json();
        if (!res.ok) {
          const msg = payload?.error || JSON.stringify(payload) || 'Error desconocido al obtener usuarios';
          console.error('❌ Error cargando usuarios CN desde admin API:', payload);
          setSupabaseError(`Error cargando usuarios CN: ${msg}`);
          setIsLoading(false);
          return;
        }

        const users = payload.users || [];
        const totalUsers = users.length;
        const activeUsers = users.filter((u: any) => u.status === 'active').length || 0;
        const inactiveUsers = users.filter((u: any) => u.status !== 'active').length || 0;

        setDashboardData({
          totalUsers,
          activeUsers,
          inactiveUsers,
          totalTables: 0,
          recentActivity: [],
          systemMetrics: {
            databaseSize: 0,
            lastSync: new Date().toISOString(),
            errorRate: 0,
            activeConnections: 0
          }
        });
      } catch (err) {
        console.error('❌ Error inesperado cargando usuarios CN via admin API:', err);
        setSupabaseError(String(err));
        setIsLoading(false);
        return;
      }

      // dashboard state already set from admin API response above

    } catch (error) {
      console.error("❌ Error general cargando datos CN:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {supabaseError && (
          <div className="mb-4 p-4 rounded-md bg-red-50 border border-red-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-red-800">Problema con Supabase</p>
                <p className="text-xs text-red-700 mt-1 whitespace-pre-wrap">{supabaseError}</p>
              </div>
              <div className="flex-shrink-0">
                <button
                  onClick={() => {
                    setSupabaseError(null);
                    loadCNData();
                  }}
                  className="px-3 py-1 bg-white border border-red-200 text-red-800 rounded-md text-sm"
                >
                  Reintentar
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Server className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-600" />
                CN - cn.ingenit.cl
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Gestión de usuarios y tablas CN
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push("/admin/dashboard")}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors text-sm font-medium"
              >
                Volver al Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
              {/* Total Users */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                      Total Usuarios
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
                      {dashboardData.totalUsers}
                    </p>
                  </div>
                  <div className="p-2 sm:p-3 bg-cyan-100 rounded-lg">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-600" />
                  </div>
                </div>
              </div>

              {/* Active Users */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                      Usuarios Activos
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-1">
                      {dashboardData.activeUsers}
                    </p>
                  </div>
                  <div className="p-2 sm:p-3 bg-green-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                </div>
              </div>

              {/* Inactive Users */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                      Usuarios Inactivos
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold text-orange-600 mt-1">
                      {dashboardData.inactiveUsers}
                    </p>
                  </div>
                  <div className="p-2 sm:p-3 bg-orange-100 rounded-lg">
                    <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                  </div>
                </div>
              </div>

              {/* Total Tables */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                      Tablas CN
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold text-purple-600 mt-1">
                      {dashboardData.totalTables}
                    </p>
                  </div>
                  <div className="p-2 sm:p-3 bg-purple-100 rounded-lg">
                    <Database className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
                Acciones Rápidas
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Manage Users */}
                <button
                  onClick={() => router.push("/admin/cn/users")}
                  className="p-4 bg-gradient-to-br from-cyan-50 to-cyan-100 hover:from-cyan-100 hover:to-cyan-200 rounded-md border border-cyan-200 transition-all duration-200 hover:shadow-md text-left"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-cyan-600 rounded-md">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Gestión de Usuarios</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Administrar usuarios de cn.ingenit.cl
                  </p>
                </button>

                {/* Database Management */}
                <button
                  onClick={() => router.push("/admin/cn/database")}
                  className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-md border border-purple-200 transition-all duration-200 hover:shadow-md text-left"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-600 rounded-md">
                      <Database className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Tablas CN</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Gestionar tablas cn_*
                  </p>
                </button>

                {/* Analytics */}
                <button
                  onClick={() => router.push("/admin/cn/analytics")}
                  className="p-4 bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-md border border-green-200 transition-all duration-200 hover:shadow-md text-left"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-600 rounded-md">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Analíticas</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Estadísticas y reportes
                  </p>
                </button>
              </div>
            </div>

            {/* System Status */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
                Estado del Sistema
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center gap-3">
                    <Activity className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">Conexiones Activas</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {dashboardData.systemMetrics.activeConnections}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-gray-700">Tamaño BD</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {dashboardData.systemMetrics.databaseSize} MB
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">Tasa de Error</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {dashboardData.systemMetrics.errorRate}%
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

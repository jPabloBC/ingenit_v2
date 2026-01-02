"use client";
import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, TrendingDown, Activity, Calendar, ArrowLeft, Users, Database } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

interface AnalyticsData {
  userGrowth: {
    current: number;
    previous: number;
    change: number;
  };
  activityMetrics: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
  };
  registrationTrend: Array<{
    date: string;
    count: number;
  }>;
  statusDistribution: {
    active: number;
    inactive: number;
    pending: number;
  };
}

export default function CNAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    userGrowth: { current: 0, previous: 0, change: 0 },
    activityMetrics: { dailyActiveUsers: 0, weeklyActiveUsers: 0, monthlyActiveUsers: 0 },
    registrationTrend: [],
    statusDistribution: { active: 0, inactive: 0, pending: 0 }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<string>("30"); // días
  const router = useRouter();

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      console.log("📊 Cargando analíticas CN...");

      // Cargar usuarios
      const { data: users, error } = await supabase
        .from("cn_users")
        .select("*");

      if (error) {
        console.error("❌ Error cargando datos:", error);
        if (error.code === 'PGRST116' || 
            error.message?.includes('relation') || 
            error.message?.includes('does not exist')) {
          console.log("📋 Tabla cn_users no existe");
          setIsLoading(false);
          return;
        }
      }

      if (users && users.length > 0) {
        // Calcular distribución de estados
        const statusDist = {
          active: users.filter(u => u.status === 'active').length,
          inactive: users.filter(u => u.status === 'inactive').length,
          pending: users.filter(u => u.status === 'pending').length
        };

        // Calcular crecimiento (últimos 30 días vs anteriores 30 días)
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

        const currentUsers = users.filter(u => new Date(u.created_at) >= thirtyDaysAgo).length;
        const previousUsers = users.filter(u => {
          const date = new Date(u.created_at);
          return date >= sixtyDaysAgo && date < thirtyDaysAgo;
        }).length;

        const change = previousUsers > 0 
          ? ((currentUsers - previousUsers) / previousUsers) * 100 
          : 100;

        // Tendencia de registros (últimos 7 días)
        const registrationTrend = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          const dateStr = date.toISOString().split('T')[0];
          const count = users.filter(u => {
            const userDate = new Date(u.created_at).toISOString().split('T')[0];
            return userDate === dateStr;
          }).length;
          registrationTrend.push({ date: dateStr, count });
        }

        setAnalytics({
          userGrowth: {
            current: currentUsers,
            previous: previousUsers,
            change: Math.round(change)
          },
          activityMetrics: {
            dailyActiveUsers: users.filter(u => u.last_login && 
              new Date(u.last_login) >= new Date(now.getTime() - 24 * 60 * 60 * 1000)
            ).length,
            weeklyActiveUsers: users.filter(u => u.last_login && 
              new Date(u.last_login) >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            ).length,
            monthlyActiveUsers: users.filter(u => u.last_login && 
              new Date(u.last_login) >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            ).length
          },
          registrationTrend,
          statusDistribution: statusDist
        });
      }
    } catch (error) {
      console.error("❌ Error general:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.push("/admin/cn")}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-600" />
                Analíticas CN
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Estadísticas y métricas de cn.ingenit.cl
              </p>
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setDateRange("7")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                dateRange === "7"
                  ? "bg-cyan-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              7 días
            </button>
            <button
              onClick={() => setDateRange("30")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                dateRange === "30"
                  ? "bg-cyan-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              30 días
            </button>
            <button
              onClick={() => setDateRange("90")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                dateRange === "90"
                  ? "bg-cyan-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              90 días
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
          </div>
        ) : (
          <>
            {/* Growth Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
              {/* User Growth */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600">Crecimiento Usuarios</h3>
                  {analytics.userGrowth.change >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">
                    {analytics.userGrowth.current}
                  </span>
                  <span className={`text-sm font-medium ${
                    analytics.userGrowth.change >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {analytics.userGrowth.change >= 0 ? '+' : ''}{analytics.userGrowth.change}%
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  vs período anterior ({analytics.userGrowth.previous} usuarios)
                </p>
              </div>

              {/* Daily Active Users */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600">Usuarios Activos Diarios</h3>
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">
                    {analytics.activityMetrics.dailyActiveUsers}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Últimas 24 horas
                </p>
              </div>

              {/* Weekly Active Users */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600">Usuarios Activos Semanales</h3>
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">
                    {analytics.activityMetrics.weeklyActiveUsers}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Últimos 7 días
                </p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Registration Trend */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Tendencia de Registros
                </h3>
                <div className="space-y-3">
                  {analytics.registrationTrend.map((day, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-24">
                        {new Date(day.date).toLocaleDateString('es-CL', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                      <div className="flex-1">
                        <div className="h-8 bg-gray-100 rounded-md overflow-hidden">
                          <div
                            className="h-full bg-cyan-600 transition-all duration-300"
                            style={{
                              width: `${day.count > 0 
                                ? (day.count / Math.max(...analytics.registrationTrend.map(d => d.count))) * 100 
                                : 0}%`
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-8 text-right">
                        {day.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Distribution */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Distribución por Estado
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        Activos
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {analytics.statusDistribution.active}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{
                          width: `${(analytics.statusDistribution.active / 
                            (analytics.statusDistribution.active + analytics.statusDistribution.inactive + analytics.statusDistribution.pending)) * 100}%`
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        Pendientes
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {analytics.statusDistribution.pending}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500"
                        style={{
                          width: `${(analytics.statusDistribution.pending / 
                            (analytics.statusDistribution.active + analytics.statusDistribution.inactive + analytics.statusDistribution.pending)) * 100}%`
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 flex items-center gap-2">
                        <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                        Inactivos
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {analytics.statusDistribution.inactive}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-500"
                        style={{
                          width: `${(analytics.statusDistribution.inactive / 
                            (analytics.statusDistribution.active + analytics.statusDistribution.inactive + analytics.statusDistribution.pending)) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Total Usuarios</span>
                    <span className="text-2xl font-bold text-gray-900">
                      {analytics.statusDistribution.active + 
                       analytics.statusDistribution.inactive + 
                       analytics.statusDistribution.pending}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Metrics */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Métricas Adicionales
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Usuarios Activos Mes</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {analytics.activityMetrics.monthlyActiveUsers}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Database className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tablas CN</p>
                    <p className="text-2xl font-bold text-gray-900">0</p>
                    <p className="text-xs text-gray-500">Configurar</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Activity className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tasa Actividad</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {analytics.statusDistribution.active > 0
                        ? Math.round((analytics.activityMetrics.weeklyActiveUsers / analytics.statusDistribution.active) * 100)
                        : 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

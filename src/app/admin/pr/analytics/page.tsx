"use client";
import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, Users, Globe, Activity, Calendar, Download, RefreshCw } from "lucide-react";

interface AnalyticsData {
  totalVisits: number;
  uniqueUsers: number;
  bounceRate: number;
  avgSessionDuration: number;
  topPages: Array<{
    page: string;
    views: number;
    percentage: number;
  }>;
  trafficSources: Array<{
    source: string;
    visitors: number;
    percentage: number;
  }>;
  timeSeriesData: Array<{
    date: string;
    visits: number;
    users: number;
  }>;
}

export default function PRAnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalVisits: 0,
    uniqueUsers: 0,
    bounceRate: 0,
    avgSessionDuration: 0,
    topPages: [],
    trafficSources: [],
    timeSeriesData: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');

  useEffect(() => {
    loadAnalyticsData();
  }, [dateRange]);

  const loadAnalyticsData = async () => {
    try {
      setIsLoading(true);
      console.log("🔍 Cargando datos de analytics PR...");
      
      // Intentar cargar datos reales de analytics desde Supabase
      // Por ahora, establecemos datos en cero ya que no hay tabla de analytics configurada
      const emptyData: AnalyticsData = {
        totalVisits: 0,
        uniqueUsers: 0,
        bounceRate: 0,
        avgSessionDuration: 0,
        topPages: [],
        trafficSources: [],
        timeSeriesData: []
      };
      
      setAnalyticsData(emptyData);
    } catch (error) {
      console.error("❌ Error cargando analytics PR:", error);
      // En caso de error, mostrar datos vacíos
      setAnalyticsData({
        totalVisits: 0,
        uniqueUsers: 0,
        bounceRate: 0,
        avgSessionDuration: 0,
        topPages: [],
        trafficSources: [],
        timeSeriesData: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getDateRangeLabel = (range: string) => {
    switch (range) {
      case '7d': return 'Últimos 7 días';
      case '30d': return 'Últimos 30 días';
      case '90d': return 'Últimos 90 días';
      default: return 'Últimos 7 días';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-orange-600" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-title text-gray-900">
                Analytics PR
              </h1>
            </div>
            <p className="text-sm sm:text-base text-gray-600">
              Análisis y métricas del proyecto PR
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="90d">Últimos 90 días</option>
            </select>
            
            <button 
              onClick={loadAnalyticsData}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </button>
            
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Visitas Totales</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.totalVisits.toLocaleString()}</p>
              {analyticsData.totalVisits > 0 && <p className="text-xs text-green-600 mt-1">+12.5% vs período anterior</p>}
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Globe className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Usuarios Únicos</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.uniqueUsers.toLocaleString()}</p>
              {analyticsData.uniqueUsers > 0 && <p className="text-xs text-green-600 mt-1">+8.3% vs período anterior</p>}
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tasa de Rebote</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.bounceRate}%</p>
              {analyticsData.bounceRate > 0 && <p className="text-xs text-red-600 mt-1">+2.1% vs período anterior</p>}
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Duración Promedio</p>
              <p className="text-2xl font-bold text-gray-900">{formatDuration(analyticsData.avgSessionDuration)}</p>
              {analyticsData.avgSessionDuration > 0 && <p className="text-xs text-green-600 mt-1">+15.2% vs período anterior</p>}
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Traffic Over Time */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tráfico en el Tiempo</h2>
          <div className="h-64 flex items-end justify-between gap-2">
            {analyticsData.timeSeriesData.map((item, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="w-full bg-orange-200 rounded-t relative" style={{ height: `${(item.visits / 2000) * 100}%`, minHeight: '4px' }}>
                  <div className="w-full bg-orange-500 rounded-t" style={{ height: `${(item.users / item.visits) * 100}%` }}></div>
                </div>
                <span className="text-xs text-gray-500 mt-1 transform rotate-45 origin-left">
                  {new Date(item.date).toLocaleDateString('es-CL', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              <span className="text-sm text-gray-600">Usuarios</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-200 rounded"></div>
              <span className="text-sm text-gray-600">Visitas</span>
            </div>
          </div>
        </div>

        {/* Top Pages */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Páginas Más Visitadas</h2>
          {analyticsData.topPages.length > 0 ? (
            <div className="space-y-3">
              {analyticsData.topPages.map((page, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{page.page}</span>
                      <span className="text-sm text-gray-500">{page.views.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-orange-500 h-2 rounded-full" 
                        style={{ width: `${page.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No hay datos de páginas disponibles</p>
              <p className="text-sm text-gray-400">Los datos aparecerán cuando haya tráfico registrado</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Sources */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Fuentes de Tráfico</h2>
          <div className="space-y-4">
            {analyticsData.trafficSources.map((source, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `hsl(${index * 60}, 70%, 50%)` }}></div>
                  <span className="text-sm font-medium text-gray-900">{source.source}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-900">{source.visitors.toLocaleString()}</span>
                  <span className="text-xs text-gray-500 ml-2">({source.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Actividad Reciente</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-blue-100 rounded-full">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Nuevo usuario registrado</p>
                <p className="text-xs text-gray-500">Hace 2 minutos</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-green-100 rounded-full">
                <Activity className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Pico de tráfico detectado</p>
                <p className="text-xs text-gray-500">Hace 15 minutos</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-orange-100 rounded-full">
                <Globe className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Nueva página indexada</p>
                <p className="text-xs text-gray-500">Hace 1 hora</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
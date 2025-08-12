"use client";
import { useEffect, useState } from "react";
import { Users, MessageCircle, Settings, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

interface DashboardData {
  totalQuotes: number;
  totalClients: number;
  recentQuotes: Array<{
    id: string;
    client_name: string;
    project_title: string;
    total_amount: number;
    created_at: string;
  }>;
}

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalQuotes: 0,
    totalClients: 0,
    recentQuotes: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: quotesData } = await supabase
        .from("quotes")
        .select("id, client_name, project_title, total_amount, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      const { data: clientsData } = await supabase
        .from("clients")
        .select("id");

      const { count: quotesCount } = await supabase
        .from("quotes")
        .select("*", { count: "exact", head: true });

      const { count: clientsCount } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true });

      setDashboardData({
        totalQuotes: quotesCount || 0,
        totalClients: clientsCount || 0,
        recentQuotes: quotesData || []
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
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-title text-gray-900 mb-2">
          Panel de Administración
        </h1>
        <p className="text-gray-600">
          Bienvenido al panel de control de IngenIT
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Contactos</p>
              <p className="text-3xl font-bold text-gray-900">{dashboardData.totalClients}</p>
            </div>
            <div className="p-3 bg-blue6/10 rounded-full">
              <Users className="w-8 h-8 text-blue6" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Mensajes</p>
              <p className="text-3xl font-bold text-gray-900">{dashboardData.totalQuotes}</p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-full">
              <MessageCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Mensajes No Leídos</p>
              <p className="text-3xl font-bold text-gray-900">{dashboardData.totalQuotes}</p>
            </div>
            <div className="p-3 bg-orange-500/10 rounded-full">
              <TrendingUp className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Actividad Reciente
        </h2>
        <div className="space-y-4">
          {dashboardData.recentQuotes.length > 0 ? (
            dashboardData.recentQuotes.map((quote, index) => (
              <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="p-2 bg-blue6/10 rounded-full">
                  <MessageCircle className="w-5 h-5 text-blue6" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {quote.client_name}
                  </p>
                  <p className="text-sm text-gray-600 truncate">
                    {quote.project_title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(quote.created_at).toLocaleString("es-CL")}
                  </p>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  "bg-blue-100 text-blue-800"
                }`}>
                  Cotización
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No hay actividad reciente</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Acciones Rápidas
          </h3>
          <div className="space-y-3">
            <button
              onClick={() => router.push("/admin/chat")}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors duration-200"
            >
              <MessageCircle className="w-5 h-5 text-blue6" />
              <span>Ver Chat</span>
            </button>
            <button
              onClick={() => router.push("/admin/settings")}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors duration-200"
            >
              <Settings className="w-5 h-5 text-gray-600" />
              <span>Configuración</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Información del Sistema
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Versión:</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Estado:</span>
              <span className="text-green-600 font-medium">Activo</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Última actualización:</span>
              <span className="font-medium">{new Date().toLocaleDateString("es-CL")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
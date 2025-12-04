"use client";
import { useEffect, useState } from "react";
import { Users, Heart, Activity, TrendingUp, UserCheck, UserX, Calendar, MapPin, Building, Bed, Star, Hotel } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useVercelAnalytics } from '@/hooks/useVercelAnalytics';

interface HLUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  last_activity: string;
  health_data?: {
    blood_pressure?: string;
    heart_rate?: number;
    weight?: number;
    height?: number;
  };
}

interface HLDashboardData {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  pendingUsers: number;
  recentUsers: HLUser[];
  healthMetrics: {
    avgHeartRate: number;
    avgBloodPressure: string;
    totalCheckups: number;
  };
}

export default function HLAdminPage() {
  const [dashboardData, setDashboardData] = useState<HLDashboardData>({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    pendingUsers: 0,
    recentUsers: [],
    healthMetrics: {
      avgHeartRate: 0,
      avgBloodPressure: '0/0',
      totalCheckups: 0
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  // Rastrear visitas
  useVercelAnalytics();

  useEffect(() => {
    loadHLData();
  }, []);

  const loadHLData = async () => {
    try {
      console.log("🔍 Iniciando carga de datos HL...");
      
      // Cargar usuarios administradores (hl_user)
      console.log("📊 Cargando usuarios administradores...");
      const { data: adminUsers, error: adminUsersError } = await supabase
        .from("hl_user")
        .select(`
          id, 
          name,
          email, 
          phone,
          status,
          created_at
        `)
        .limit(10);

      console.log("📋 Resultado admin users:", { adminUsers, adminUsersError });

      if (adminUsersError) {
        console.error("❌ Error cargando usuarios administradores:", adminUsersError);
        // Si es error de esquema no encontrado, mostrar mensaje informativo
        if (adminUsersError.code === 'PGRST116' || 
            adminUsersError.message?.includes('relation') || 
            adminUsersError.message?.includes('does not exist')) {
          console.log("📋 Esquema HL no configurado, mostrando datos vacíos");
          setDashboardData({
            totalUsers: 0,
            activeUsers: 0,
            inactiveUsers: 0,
            pendingUsers: 0,
            recentUsers: [],
            healthMetrics: {
              avgHeartRate: 0,
              avgBloodPressure: '0 activas',
              totalCheckups: 0
            }
          });
          setLoading(false);
          return;
        }
        throw adminUsersError;
      }

      // Cargar datos de negocio
      console.log("📊 Cargando datos de negocio...");
      const { data: businessData, error: businessError } = await supabase
        .from("hl_business")
        .select("id, user_id, business_name, business_type, status")
        .limit(50);

      console.log("📋 Resultado business:", { businessData, businessError });

      if (businessError) {
        console.warn("⚠️ Error cargando datos de negocio (continuando):", businessError);
      }

      // Cargar huéspedes globales
      console.log("📊 Cargando huéspedes globales...");
      const { data: guestsData, error: guestsError } = await supabase
        .from("hl_guests")
        .select("id, name, email, phone, document, created_at, created_by")
        .limit(50);

      console.log("📋 Resultado guests:", { guestsData, guestsError });

      if (guestsError) {
        console.warn("⚠️ Error cargando huéspedes (continuando):", guestsError);
      }

      // Cargar reservas globales
      console.log("📊 Cargando reservas globales...");
      const { data: reservationsData, error: reservationsError } = await supabase
        .from("hl_reservations")
        .select("id, business_id, status, payment_status, total_amount, created_at, created_by")
        .limit(100);

      console.log("📋 Resultado reservas:", { reservationsData, reservationsError });

      if (reservationsError) {
        console.warn("⚠️ Error cargando reservas (continuando):", reservationsError);
      }

      // Cargar suscripciones
      console.log("📊 Cargando suscripciones...");
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from("hl_user_subscriptions")
        .select("id, user_id, business_id, plan_id, status, amount, payment_status, created_at")
        .limit(50);

      console.log("📋 Resultado subscriptions:", { subscriptionsData, subscriptionsError });

      if (subscriptionsError) {
        console.warn("⚠️ Error cargando suscripciones (continuando):", subscriptionsError);
      }

      // Calcular métricas
      const totalAdminUsers = adminUsers?.length || 0;
      const totalGuests = guestsData?.length || 0;
      const totalReservations = reservationsData?.length || 0;
      
      // Usuarios con suscripciones activas
      const activeSubscriptions = subscriptionsData?.filter(sub => sub.status === 'active').length || 0;

      // Calcular métricas por usuario
      const usersWithData = adminUsers?.map(admin => {
        const userBusiness = businessData?.find(b => b.user_id === admin.id);
        const userSubscription = subscriptionsData?.find(s => s.user_id === admin.id);
        
        // Huéspedes creados por este usuario
        const userGuests = guestsData?.filter(g => g.created_by === admin.id) || [];
        
        // Reservas de este usuario (por business_id)
        const userReservations = reservationsData?.filter(r => 
          userBusiness && r.business_id === userBusiness.id
        ) || [];
        
        return {
          ...admin,
          business: userBusiness,
          subscription: userSubscription,
          guestsCount: userGuests.length,
          reservationsCount: userReservations.length,
          activeGuests: userGuests.length
        };
      }) || [];

      const dashboardData: HLDashboardData = {
        totalUsers: totalAdminUsers,
        activeUsers: activeSubscriptions,
        inactiveUsers: totalGuests,
        pendingUsers: totalReservations,
        recentUsers: usersWithData.slice(0, 5).map(user => ({
          id: user.id,
          name: user.business?.business_name || user.name || 'Sin nombre',
          email: user.email || 'Sin email',
          phone: user.business?.business_type || user.phone || 'Sin tipo',
          status: user.subscription?.status || user.status || 'pending',
          created_at: user.created_at || new Date().toISOString(),
          last_activity: user.created_at || new Date().toISOString(),
          health_data: {
            blood_pressure: `${user.guestsCount} huéspedes`,
            heart_rate: user.reservationsCount,
            weight: user.activeGuests,
            height: 0
          }
        })),
        healthMetrics: {
          avgHeartRate: totalGuests,
          avgBloodPressure: `${activeSubscriptions} activas`,
          totalCheckups: totalReservations
        }
      };

      setDashboardData(dashboardData);
    } catch (error) {
      console.error("❌ Error general cargando datos de HL:", error);
      console.error("❌ Tipo de error:", typeof error);
      console.error("❌ Stack trace:", error instanceof Error ? error.stack : 'No stack available');
      
      // Fallback con datos de ejemplo
      setDashboardData({
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        pendingUsers: 0,
        recentUsers: [],
        healthMetrics: {
          avgHeartRate: 0,
          avgBloodPressure: '0/0',
          totalCheckups: 0
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando datos de Health/Life...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 dashboard-transition">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-600 rounded-md">
            <Hotel className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-title text-gray-900 dashboard-text">
            HL - Panel de Administración
          </h1>
        </div>
        <p className="text-sm sm:text-base text-gray-600 dashboard-text">
          Gestión de hoteles, reservas y huéspedes del esquema app_hl
        </p>
        
        {dashboardData.totalUsers === 0 && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Sistema Hotelero sin datos
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>El sistema hotelero está configurado correctamente, pero no hay datos registrados. Para comenzar, crea usuarios administradores, negocios, huéspedes y reservas.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="dashboard-card bg-white p-4 sm:p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Usuarios Admin</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 stats-number">{dashboardData.totalUsers}</p>
            </div>
            <div className="p-2 sm:p-3 bg-blue-500/10 rounded-full flex-shrink-0 ml-3 mobile-icon-container">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 mobile-icon" />
            </div>
          </div>
        </div>

        <div className="dashboard-card bg-white p-4 sm:p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Suscripciones Activas</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-600 stats-number">{dashboardData.activeUsers}</p>
            </div>
            <div className="p-2 sm:p-3 bg-green-500/10 rounded-full flex-shrink-0 ml-3 mobile-icon-container">
              <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 mobile-icon" />
            </div>
          </div>
        </div>

        <div className="dashboard-card bg-white p-4 sm:p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Huéspedes</p>
              <p className="text-2xl sm:text-3xl font-bold text-orange-500 stats-number">{dashboardData.inactiveUsers}</p>
            </div>
            <div className="p-2 sm:p-3 bg-orange-500/10 rounded-full flex-shrink-0 ml-3 mobile-icon-container">
              <Bed className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 mobile-icon" />
            </div>
          </div>
        </div>

        <div className="dashboard-card bg-white p-4 sm:p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Reservas</p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-600 stats-number">{dashboardData.pendingUsers}</p>
            </div>
            <div className="p-2 sm:p-3 bg-blue-500/10 rounded-full flex-shrink-0 ml-3 mobile-icon-container">
              <Star className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 mobile-icon" />
            </div>
          </div>
        </div>
      </div>

      {/* Hotel Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-white rounded-md shadow-lg border border-gray-100 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
            Métricas del Hotel
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Huéspedes</span>
              <span className="font-semibold text-blue-600">{dashboardData.healthMetrics.avgHeartRate}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Suscripciones Activas</span>
              <span className="font-semibold text-yellow-600">{dashboardData.healthMetrics.avgBloodPressure}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total de Reservas</span>
              <span className="font-semibold text-green-600">{dashboardData.healthMetrics.totalCheckups}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-md shadow-lg border border-gray-100 p-4 sm:p-6 lg:col-span-2">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
            Usuarios Administradores
          </h3>
          <div className="space-y-3">
            {dashboardData.recentUsers.map((user) => (
              <div key={user.id} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-md">
                <div className="p-1.5 sm:p-2 bg-blue-500/10 rounded-full flex-shrink-0">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm sm:text-base truncate">
                    {user.name}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">
                    {user.email} • {user.phone}
                  </p>
                  <p className="text-xs text-gray-500">
                    {user.health_data.blood_pressure} • {user.health_data.heart_rate} reservas • {user.health_data.weight} activos
                  </p>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                  user.status === 'active' ? 'bg-green-100 text-green-800' :
                  user.status === 'inactive' ? 'bg-orange-100 text-orange-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {user.status === 'active' ? 'Activo' :
                   user.status === 'inactive' ? 'Inactivo' : 'Pendiente'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Analytics */}

      {/* Quick Actions */}
      <div className="bg-white rounded-md shadow-lg border border-gray-100 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
          Acciones Rápidas
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-md transition-colors duration-200 mobile-button touch-optimized">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" />
            <span className="text-sm sm:text-base">Ver Todos los Usuarios</span>
          </button>
          <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-md transition-colors duration-200 mobile-button touch-optimized">
            <Bed className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
            <span className="text-sm sm:text-base">Gestionar Huéspedes</span>
          </button>
          <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-md transition-colors duration-200 mobile-button touch-optimized">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
            <span className="text-sm sm:text-base">Ver Reservas</span>
          </button>
          <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-md transition-colors duration-200 mobile-button touch-optimized">
            <Building className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
            <span className="text-sm sm:text-base">Gestionar Negocios</span>
          </button>
        </div>
      </div>
    </div>
  );
}

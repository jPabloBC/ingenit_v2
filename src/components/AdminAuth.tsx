"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

interface AdminAuthProps {
  children: React.ReactNode;
}

export default function AdminAuth({ children }: AdminAuthProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log("🔍 AdminAuth - Verificando autenticación...");
        
        // Verificar si Supabase está configurado
        if (!isSupabaseConfigured()) {
          console.log("⚠️ Supabase no configurado, usando fallback localStorage");
          // Fallback a localStorage si Supabase no está configurado
          const adminToken = localStorage.getItem("adminToken");
          const adminUser = localStorage.getItem("adminUser");
          
          if (!adminToken || !adminUser) {
            console.log("🚫 No hay sesión localStorage, redirigiendo a login");
            router.push("/admin/login");
            return;
          }
          
          try {
            const userData = JSON.parse(adminUser);
            if (!userData.email || !userData.role) {
              throw new Error("Datos de usuario inválidos");
            }
            console.log("✅ Usuario autenticado (localStorage):", userData.email);
            setIsAuthenticated(true);
          } catch (error) {
            console.error("💥 Error parseando usuario localStorage:", error);
            localStorage.removeItem("adminToken");
            localStorage.removeItem("adminUser");
            router.push("/admin/login");
            return;
          }
        } else {
          console.log("🔐 Usando autenticación Supabase");
          
          // Obtener la sesión actual de Supabase
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error("💥 Error obteniendo sesión Supabase:", error);
            router.push("/admin/login");
            return;
          }

          if (!session) {
            console.log("🚫 No hay sesión Supabase, redirigiendo a login");
            router.push("/admin/login");
            return;
          }

          console.log("✅ Sesión Supabase encontrada:", session.user.email);
          
          // Verificar que el usuario tenga rol de admin o dev
          const { data: profile, error: profileError } = await supabase
            .from('rt_profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            console.log("⚠️ Error verificando perfil:", profileError.message);
            // Si no existe la tabla profiles, permitir acceso temporal
            if (profileError.code === 'PGRST116') {
              console.log("📝 Tabla profiles no encontrada, permitiendo acceso temporal");
              setIsAuthenticated(true);
              return;
            }
            await supabase.auth.signOut();
            router.push("/admin/login");
            return;
          }

          if (!profile || !['admin', 'dev'].includes(profile.role)) {
            console.log("🚫 Usuario no tiene permisos de administrador o desarrollador");
            await supabase.auth.signOut();
            router.push("/admin/login");
            return;
          }

          console.log(`✅ Usuario autenticado con permisos de ${profile.role}`);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error("💥 Error en AdminAuth:", error);
        router.push("/admin/login");
        return;
      } finally {
        // Siempre establecer loading como false después de un tiempo máximo
        setTimeout(() => {
          setIsLoading(false);
        }, 1000);
      }
    };

    // Ejecutar verificación
    checkAuth();
  }, [router]);

  // Mostrar loading con timeout
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autenticación...</p>
          <p className="text-xs text-gray-500 mt-2">Si se queda aquí, recarga la página</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Recargar Página
          </button>
        </div>
      </div>
    );
  }

  // Si no está autenticado, no mostrar nada
  if (!isAuthenticated) {
    return null;
  }

  // Si está autenticado, mostrar el contenido
  return <>{children}</>;
} 
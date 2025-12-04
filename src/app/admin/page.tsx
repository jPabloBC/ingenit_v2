"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AdminRedirect() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Obtener la sesión actual de Supabase
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error verificando sesión:", error);
          router.push("/admin/login");
          return;
        }

        if (!session) {
          router.push("/admin/login");
          return;
        }

        // Obtener perfil completo (incluyendo allowed_screens)
        const { data: profile, error: profileError } = await supabase
          .from('rt_profiles')
          .select('role, allowed_screens')
          .eq('id', session.user.id)
          .single();

        if (profileError || !profile) {
          console.error("No se pudo obtener el perfil del usuario");
          await supabase.auth.signOut();
          router.push("/admin/login");
          return;
        }

        if (profile.role === 'admin') {
          router.push("/admin/dashboard");
          return;
        }

        if (profile.role === 'user') {
          // Buscar la primera pantalla permitida
          const allowed = Array.isArray(profile.allowed_screens) ? profile.allowed_screens : [];
          if (allowed.length === 0) {
            console.error("Usuario sin pantallas permitidas");
            await supabase.auth.signOut();
            router.push("/admin/login");
            return;
          }
          // Consultar el screen_id de la primera pantalla permitida
          const { data: screen, error: screenError } = await supabase
            .from('rt_screens')
            .select('screen_id')
            .eq('id', allowed[0])
            .single();
          if (screenError || !screen) {
            console.error("No se pudo obtener la pantalla autorizada");
            await supabase.auth.signOut();
            router.push("/admin/login");
            return;
          }
          // Redirigir a la ruta de la pantalla autorizada
          router.push(`/admin/${screen.screen_id}`);
          return;
        }

        // Si no es admin ni user, denegar acceso
        await supabase.auth.signOut();
        router.push("/admin/login");
      } catch (error) {
        console.error("Error en redirección:", error);
        router.push("/admin/login");
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue6 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirigiendo...</p>
      </div>
    </div>
  );
} 
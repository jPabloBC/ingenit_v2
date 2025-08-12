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

        // Verificar que el usuario tenga el rol de admin
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profileError || !profile || profile.role !== 'admin') {
          console.error("Usuario no tiene permisos de admin");
          await supabase.auth.signOut();
          router.push("/admin/login");
          return;
        }

        // Redirigir al dashboard
        router.push("/admin/dashboard");
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
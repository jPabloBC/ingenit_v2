"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      if (isSupabaseConfigured()) {
        // Iniciar sesión con Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setLoginAttempts(prev => prev + 1);
          
          // Manejar errores específicos
          if (error.message.includes("Invalid login credentials")) {
            setError("Credenciales inválidas. Verifica tu email y contraseña.");
          } else if (error.message.includes("Email not confirmed")) {
            setError("Email no confirmado. Revisa tu bandeja de entrada.");
          } else {
            setError(`Error de autenticación: ${error.message}`);
          }
          return;
        }

        if (data.user) {
          // Verificar que el usuario tenga rol de admin o dev
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();

          if (profileError) {
            // Si no existe la tabla profiles, permitir acceso temporal
            if (profileError.code === 'PGRST116') {
              setSuccess("¡Login exitoso! Redirigiendo...");
              setTimeout(() => {
                router.push("/admin/dashboard");
              }, 1000);
              return;
            }
            await supabase.auth.signOut();
            setError("Error verificando permisos de administrador");
            return;
          }

          if (!profile || !['admin', 'dev'].includes(profile.role)) {
            await supabase.auth.signOut();
            setError("No tienes permisos de administrador o desarrollador");
            return;
          }

          setSuccess("¡Login exitoso! Redirigiendo...");
          setTimeout(() => {
            router.push("/admin/dashboard");
          }, 1000);
        }
      } else {
        // Fallback a localStorage
        if (email === "gerencia@ingenit.cl" && password === "admin123") {
          const token = "demo-token-" + Date.now();
          const userData = { 
            email, 
            role: "dev",
            name: "Desarrollador"
          };
          
          localStorage.setItem("adminToken", token);
          localStorage.setItem("adminUser", JSON.stringify(userData));
          
          setSuccess("¡Login exitoso! Redirigiendo...");
          
          setTimeout(() => {
            router.push("/admin/dashboard");
          }, 1000);
        } else {
          setLoginAttempts(prev => prev + 1);
          setError("Credenciales inválidas. Usa: gerencia@ingenit.cl / admin123");
        }
      }
    } catch (error) {
      console.error("Error signing in:", error);
      setError("Error al iniciar sesión");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setError("");
    setResetSuccess("");

    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
          redirectTo: `${window.location.origin}/admin/reset-password`,
        });

        if (error) {
          setError(`Error al enviar email de reset: ${error.message}`);
        } else {
          setResetSuccess("Email de restablecimiento enviado. Revisa tu bandeja de entrada.");
          
          // Redirigir a la página de confirmación después de 2 segundos
          setTimeout(() => {
            router.push(`/admin/reset-sent?email=${encodeURIComponent(resetEmail)}`);
          }, 2000);
        }
      } else {
        setResetSuccess("Email de restablecimiento enviado. Revisa tu bandeja de entrada.");
        
        // En modo fallback, simular el envío
        setTimeout(() => {
          router.push(`/admin/reset-sent?email=${encodeURIComponent(resetEmail)}`);
        }, 2000);
      }
    } catch (error) {
      console.error("Error signing up:", error);
      setError("Error al registrarse");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-gray-50 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-title text-gray-900 mb-2">
            Panel de Administración
          </h1>
          <p className="text-gray-600">
            Accede a tu panel de control
          </p>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {!showResetForm ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-red-600 text-sm">{error}</p>
                  {loginAttempts >= 3 && (
                    <button
                      type="button"
                      onClick={() => setShowResetForm(true)}
                      className="mt-2 text-xs text-red-600 hover:text-red-700 underline"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-green-600 text-sm">{success}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                  placeholder="correo@ingenit.cl"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
              </button>

              {loginAttempts >= 2 && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowResetForm(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              )}
            </form>
          ) : (
            <form onSubmit={handlePasswordReset} className="space-y-6">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Restablecer Contraseña
                </h3>
                <p className="text-sm text-gray-600">
                  Ingresa tu email para recibir un enlace de restablecimiento
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {resetSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-green-600 text-sm">{resetSuccess}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                  placeholder="correo@ingenit.cl"
                  required
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {resetLoading ? "Enviando..." : "Enviar Email"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetForm(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-300"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            © 2025 IngenIT ® - Panel de Administración
          </p>
        </div>
      </div>
    </div>
  );
} 
"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function ResetSent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isResending, setIsResending] = useState(false);
  
  // Obtener el email de los parámetros de URL si existe
  const email = searchParams.get('email') || 'tu correo electrónico';

  const handleResend = async () => {
    setIsResending(true);
    
    // Simular reenvío
    setTimeout(() => {
      setIsResending(false);
      alert("Email de restablecimiento reenviado. Revisa tu bandeja de entrada.");
    }, 2000);
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-gray-50 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-title text-gray-900 mb-2">
            Email Enviado
          </h1>
          <p className="text-gray-600">
            Revisa tu bandeja de entrada
          </p>
        </div>

        {/* Contenido */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="text-center space-y-6">
            {/* Icono de éxito */}
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Email de Restablecimiento Enviado
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                Hemos enviado un enlace de restablecimiento a:
              </p>
              <p className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                {email}
              </p>
            </div>

            {/* Información adicional */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">¿No recibiste el email?</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Revisa tu carpeta de spam o correo no deseado</li>
                <li>• Verifica que el email esté correcto</li>
                <li>• Espera unos minutos antes de intentar nuevamente</li>
                <li>• El enlace expira en 1 hora por seguridad</li>
              </ul>
            </div>

            {/* Botones */}
            <div className="flex space-x-3">
              <button
                onClick={() => router.push("/admin/login")}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Volver al Login
              </button>
              <button
                onClick={handleResend}
                disabled={isResending}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-300 disabled:opacity-50"
              >
                {isResending ? "Reenviando..." : "Reenviar Email"}
              </button>
            </div>

            {/* Información de seguridad */}
            <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
              <h4 className="text-sm font-semibold text-yellow-800 mb-2">🔒 Seguridad</h4>
              <p className="text-xs text-yellow-700">
                Por seguridad, el enlace de restablecimiento expira en 1 hora. 
                Si no lo usas, deberás solicitar uno nuevo.
              </p>
            </div>
          </div>
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
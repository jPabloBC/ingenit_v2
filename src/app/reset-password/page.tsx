"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ResetPasswordPublic() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const t = searchParams?.get('token');
    if (!t) {
      setError('Enlace de restablecimiento inválido');
      return;
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      setIsLoading(false);
      return;
    }

    try {
      const token = searchParams?.get('token');
      if (!token) {
        setError('Token de restablecimiento no proporcionado');
        setIsLoading(false);
        return;
      }

      const res = await fetch('/api/admin/cn/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });

      const bodyRes = await res.json().catch(() => null);
      if (!res.ok) {
        setError(bodyRes?.error || 'Error al actualizar contraseña');
      } else {
        setSuccess('¡Contraseña actualizada exitosamente!');
      }
    } catch (err) {
      console.error('Error setting password:', err);
      setError('Error al actualizar la contraseña');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-title text-gray-900 mb-2">Restablecer Contraseña</h1>
          <p className="text-gray-600">Establece tu nueva contraseña segura</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-green-600 text-sm">{success}</p>
                <p className="text-green-600 text-xs mt-2">Pulsa el botón para abrir la app CN.</p>
                <div className="mt-3 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      try { window.open('https://cn.ingenit.cl', '_blank'); } catch (e) {}
                      try { window.close(); } catch (e) {}
                    }}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
                  >
                    Abrir CN
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Nueva Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors">
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Confirmar Contraseña</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                  placeholder="••••••••"
                  required
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors">
                  {showConfirmPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
              {isLoading ? "Actualizando..." : "Actualizar Contraseña"}
            </button>

          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">Consejos de Seguridad:</h3>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Usa al menos 6 caracteres</li>
              <li>• Combina letras, números y símbolos</li>
              <li>• No uses información personal</li>
              <li>• Cambia tu contraseña regularmente</li>
              <li>• Después de actualizar, inicia sesión con tu nueva contraseña</li>
            </ul>
          </div>

        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">© 2025 IngenIT ®</p>
        </div>
      </div>
    </div>
  );
}

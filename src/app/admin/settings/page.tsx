"use client";
import { useState } from "react";
import { Save, Shield, Bell, Globe, Database } from "lucide-react";

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    notifications: true,
    autoReply: false,
    language: "es",
    timezone: "America/Santiago",
    theme: "light"
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Simular guardado
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    // Aquí implementarías la lógica real de guardado
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-title text-gray-900 mb-2">
          Configuración
        </h1>
        <p className="text-gray-600">
          Gestiona la configuración del panel de administración
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Notificaciones */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue6/10 rounded-full">
              <Bell className="w-6 h-6 text-blue6" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Notificaciones</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Notificaciones push</p>
                <p className="text-sm text-gray-600">Recibe notificaciones de nuevos mensajes</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={(e) => setSettings({...settings, notifications: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue6/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue6"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Respuesta automática</p>
                <p className="text-sm text-gray-600">Activar respuestas automáticas fuera de horario</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoReply}
                  onChange={(e) => setSettings({...settings, autoReply: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue6/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue6"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Configuración Regional */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-500/10 rounded-full">
              <Globe className="w-6 h-6 text-green-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Configuración Regional</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Idioma
              </label>
              <select
                value={settings.language}
                onChange={(e) => setSettings({...settings, language: e.target.value})}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue6 focus:border-blue6 transition-all duration-200"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Zona horaria
              </label>
              <select
                value={settings.timezone}
                onChange={(e) => setSettings({...settings, timezone: e.target.value})}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue6 focus:border-blue6 transition-all duration-200"
              >
                <option value="America/Santiago">Chile (GMT-3)</option>
                <option value="America/New_York">Nueva York (GMT-5)</option>
                <option value="Europe/Madrid">Madrid (GMT+1)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Seguridad */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-500/10 rounded-full">
              <Shield className="w-6 h-6 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Seguridad</h2>
          </div>
          
          <div className="space-y-4">
            <button className="w-full text-left p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors duration-200">
              <p className="font-medium text-gray-900">Cambiar contraseña</p>
              <p className="text-sm text-gray-600">Actualiza tu contraseña de acceso</p>
            </button>
            
            <button className="w-full text-left p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors duration-200">
              <p className="font-medium text-gray-900">Autenticación de dos factores</p>
              <p className="text-sm text-gray-600">Activar 2FA para mayor seguridad</p>
            </button>
          </div>
        </div>

        {/* Base de Datos */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-500/10 rounded-full">
              <Database className="w-6 h-6 text-purple-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Base de Datos</h2>
          </div>
          
          <div className="space-y-4">
            <button className="w-full text-left p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors duration-200">
              <p className="font-medium text-gray-900">Respaldar datos</p>
              <p className="text-sm text-gray-600">Crear una copia de seguridad</p>
            </button>
            
            <button className="w-full text-left p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors duration-200">
              <p className="font-medium text-gray-900">Limpiar caché</p>
              <p className="text-sm text-gray-600">Optimizar el rendimiento</p>
            </button>
          </div>
        </div>
      </div>

      {/* Botón de guardar */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-blue6 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue7 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          <Save className="w-5 h-5" />
          {isSaving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
} 
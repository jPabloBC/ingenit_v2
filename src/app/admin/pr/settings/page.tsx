"use client";
import { useEffect, useState } from "react";
import { Settings, Save, RefreshCw, Bell, Shield, Database, Globe, Mail, Smartphone, Key, AlertTriangle } from "lucide-react";

interface PRSettings {
  general: {
    siteName: string;
    siteDescription: string;
    siteUrl: string;
    adminEmail: string;
    timezone: string;
    language: string;
  };
  notifications: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    systemAlerts: boolean;
    userRegistrations: boolean;
    errorReports: boolean;
  };
  security: {
    twoFactorAuth: boolean;
    passwordPolicy: 'basic' | 'medium' | 'strong';
    sessionTimeout: number;
    maxLoginAttempts: number;
  };
  api: {
    apiUrl: string;
    apiKey: string;
    rateLimit: number;
    enableCors: boolean;
  };
}

export default function PRSettingsPage() {
  const [settings, setSettings] = useState<PRSettings>({
    general: {
      siteName: 'PR IngenIT',
      siteDescription: 'Sistema de gestión de proyectos PR',
      siteUrl: 'https://pr.ingenit.cl',
      adminEmail: 'admin@pr.ingenit.cl',
      timezone: 'America/Santiago',
      language: 'es'
    },
    notifications: {
      emailNotifications: true,
      smsNotifications: false,
      systemAlerts: true,
      userRegistrations: true,
      errorReports: true
    },
    security: {
      twoFactorAuth: false,
      passwordPolicy: 'medium',
      sessionTimeout: 30,
      maxLoginAttempts: 5
    },
    api: {
      apiUrl: 'https://api.pr.ingenit.cl',
      apiKey: '***************',
      rateLimit: 1000,
      enableCors: true
    }
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      console.log("🔍 Cargando configuraciones PR...");
      
      // Simular carga de configuraciones desde Supabase
      // En un caso real, cargaríamos desde pr_settings
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error("❌ Error cargando configuraciones PR:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      console.log("💾 Guardando configuraciones PR...");
      
      // Simular guardado en Supabase
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSavedMessage('Configuraciones guardadas exitosamente');
      setTimeout(() => setSavedMessage(''), 3000);
      
    } catch (error) {
      console.error("❌ Error guardando configuraciones PR:", error);
      setSavedMessage('Error al guardar configuraciones');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (section: keyof PRSettings, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando configuraciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Settings className="w-6 h-6 text-orange-600" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-title text-gray-900">
                Configuraciones PR
              </h1>
            </div>
            <p className="text-sm sm:text-base text-gray-600">
              Configura los parámetros del sistema PR
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={loadSettings}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Recargar
            </button>
            
            <button
              onClick={saveSettings}
              disabled={isSaving}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors disabled:bg-orange-400 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Guardar
                </>
              )}
            </button>
          </div>
        </div>
        
        {savedMessage && (
          <div className={`mt-4 p-3 rounded-md ${savedMessage.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {savedMessage}
          </div>
        )}
      </div>

      <div className="space-y-8">
        {/* General Settings */}
        <div className="bg-white rounded-lg shadow border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900">Configuración General</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Sitio</label>
              <input
                type="text"
                value={settings.general.siteName}
                onChange={(e) => handleInputChange('general', 'siteName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL del Sitio</label>
              <input
                type="url"
                value={settings.general.siteUrl}
                onChange={(e) => handleInputChange('general', 'siteUrl', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                rows={3}
                value={settings.general.siteDescription}
                onChange={(e) => handleInputChange('general', 'siteDescription', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email de Administrador</label>
              <input
                type="email"
                value={settings.general.adminEmail}
                onChange={(e) => handleInputChange('general', 'adminEmail', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zona Horaria</label>
              <select
                value={settings.general.timezone}
                onChange={(e) => handleInputChange('general', 'timezone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="America/Santiago">Chile (Santiago)</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">Estados Unidos (Este)</option>
                <option value="Europe/Madrid">España (Madrid)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-lg shadow border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900">Notificaciones</h2>
          </div>
          
          <div className="space-y-4">
            {Object.entries(settings.notifications).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {key === 'emailNotifications' && 'Notificaciones por Email'}
                    {key === 'smsNotifications' && 'Notificaciones por SMS'}
                    {key === 'systemAlerts' && 'Alertas del Sistema'}
                    {key === 'userRegistrations' && 'Registros de Usuario'}
                    {key === 'errorReports' && 'Reportes de Error'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {key === 'emailNotifications' && 'Recibir notificaciones por correo electrónico'}
                    {key === 'smsNotifications' && 'Recibir notificaciones por mensaje de texto'}
                    {key === 'systemAlerts' && 'Alertas críticas del sistema'}
                    {key === 'userRegistrations' && 'Notificar cuando se registren nuevos usuarios'}
                    {key === 'errorReports' && 'Reportes automáticos de errores'}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={value as boolean}
                    onChange={(e) => handleInputChange('notifications', key, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-lg shadow border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900">Seguridad</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Autenticación de Dos Factores</p>
                <p className="text-sm text-gray-500">Require verificación adicional para iniciar sesión</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.security.twoFactorAuth}
                  onChange={(e) => handleInputChange('security', 'twoFactorAuth', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
              </label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Política de Contraseñas</label>
                <select
                  value={settings.security.passwordPolicy}
                  onChange={(e) => handleInputChange('security', 'passwordPolicy', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="basic">Básica (6+ caracteres)</option>
                  <option value="medium">Media (8+ caracteres, mayús/minús)</option>
                  <option value="strong">Fuerte (12+ caracteres, símbolos)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tiempo de Sesión (minutos)</label>
                <input
                  type="number"
                  min="5"
                  max="480"
                  value={settings.security.sessionTimeout}
                  onChange={(e) => handleInputChange('security', 'sessionTimeout', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* API Settings */}
        <div className="bg-white rounded-lg shadow border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900">Configuración API</h2>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL de la API</label>
                <input
                  type="url"
                  value={settings.api.apiUrl}
                  onChange={(e) => handleInputChange('api', 'apiUrl', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Límite de Peticiones/hora</label>
                <input
                  type="number"
                  min="100"
                  max="10000"
                  value={settings.api.rateLimit}
                  onChange={(e) => handleInputChange('api', 'rateLimit', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={settings.api.apiKey}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Regenerar
                </button>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Habilitar CORS</p>
                <p className="text-sm text-gray-500">Permitir peticiones desde otros dominios</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.api.enableCors}
                  onChange={(e) => handleInputChange('api', 'enableCors', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-semibold text-red-900">Zona de Peligro</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-red-900">Restablecer Configuraciones</p>
                <p className="text-sm text-red-700">Restaura todas las configuraciones a sus valores por defecto</p>
              </div>
              <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
                Restablecer
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-red-900">Limpiar Caché del Sistema</p>
                <p className="text-sm text-red-700">Elimina todos los archivos en caché (puede afectar el rendimiento temporalmente)</p>
              </div>
              <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
                Limpiar Caché
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
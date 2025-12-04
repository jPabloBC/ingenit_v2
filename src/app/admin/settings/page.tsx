"use client";
import { useState, useEffect, useRef } from "react";
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { Save, Shield, Bell, Globe, Database, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { AuthError } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

const AVAILABLE_SCREENS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "hl", label: "HL - Gestor Hotelero" },
  { id: "mt", label: "MT - Mantenimiento" },
  { id: "ws", label: "WS - Web Services" },
  { id: "pr", label: "PR - Proyecto PR" },
  { id: "settings", label: "Configuración" },
];

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

      {/* Gestión de Usuarios RT */}
      <RTUsersManagement />
    </div>
  );
}

function ScreensAdminPanel({ screens, onAdd, onEdit, onDelete }: any) {
  const [newScreen, setNewScreen] = useState({ screen_id: "", label: "" });
  const [editScreenId, setEditScreenId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  return (
    <section className="mb-10 bg-white rounded-xl shadow p-6 max-w-full mx-auto mt-8">
      <h2 className="text-xl font-bold mb-4 text-blue-800">Administrar Screens</h2>
      <form
        onSubmit={e => {
          e.preventDefault();
          if (!newScreen.screen_id || !newScreen.label) return;
          onAdd(newScreen);
          setNewScreen({ screen_id: "", label: "" });
        }}
        className="flex flex-col md:flex-row gap-3 mb-4"
      >
        <input
          type="text"
          placeholder="ID (ej: dashboard)"
          className="border rounded px-3 py-2 flex-1"
          value={newScreen.screen_id}
          onChange={e => setNewScreen({ ...newScreen, screen_id: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Nombre visible"
          className="border rounded px-3 py-2 flex-1"
          value={newScreen.label}
          onChange={e => setNewScreen({ ...newScreen, label: e.target.value })}
          required
        />
        <button type="submit" className="bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700 transition">Agregar</button>
      </form>
      <ul className="divide-y">
        {screens.map((screen: any) => (
          <li key={screen.id} className="flex items-center justify-between py-2">
            {editScreenId === screen.id ? (
              <>
                <input
                  type="text"
                  className="border rounded px-2 py-1 mr-2"
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                />
                <button className="text-green-600 mr-2" onClick={() => { onEdit(screen.id, editLabel); setEditScreenId(null); }}>Guardar</button>
                <button className="text-gray-500" onClick={() => setEditScreenId(null)}>Cancelar</button>
              </>
            ) : (
              <>
                <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded mr-2">{screen.screen_id}</span>
                <span className="flex-1">{screen.label}</span>
                <button className="text-blue-600 ml-2" onClick={() => { setEditScreenId(screen.id); setEditLabel(screen.label); }}>Editar</button>
                <button className="text-red-600 ml-2" onClick={() => onDelete(screen.id)}>Eliminar</button>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function RTUsersManagement() {
    // Capitalizar nombres y apellidos
    function capitalizeWords(str: string) {
      return str.replace(/\b\w+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    }
  const [profiles, setProfiles] = useState<any[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [apps, setApps] = useState<any[]>([]);
  const [screens, setScreens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState({
      email: "",
      role: "",
      app_id: "",
      password: "",
      first_name: "",
      last_name: "",
      phone: ""
    });
  const [selectedScreens, setSelectedScreens] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<any | null>(null);
  const [editingScreens, setEditingScreens] = useState<string[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data: profilesData } = await supabase.from("rt_profiles").select("id, email, role, app_id, first_name, last_name, phone, full_name, created_at, updated_at");
      const { data: appsData } = await supabase.from("rt_apps").select("id, name");
      const { data: screensData } = await supabase.from("rt_screens").select("id, screen_id, label").order("label");
      setProfiles(profilesData || []);
      setApps(appsData || []);
      setScreens(screensData || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!newUser.email || !newUser.role || !newUser.app_id || !newUser.password) {
      setError("Todos los campos son obligatorios.");
      return;
    }
    if (selectedScreens.length === 0) {
      setError("Debes seleccionar al menos un acceso.");
      return;
    }
    // Procesar teléfono: asegurar formato internacional +[código][número]
    let phone = newUser.phone;
    if (phone && !phone.startsWith('+')) {
      phone = '+' + phone;
    }
    // Procesar campos
    const processedUser = {
      ...newUser,
      phone,
      first_name: capitalizeWords(newUser.first_name),
      last_name: capitalizeWords(newUser.last_name),
      email: newUser.email.toLowerCase(),
    };
    // 1. Crear usuario en Supabase Auth vía API interna
    const res = await fetch('/api/crear-usuario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: processedUser.email,
        password: processedUser.password,
        role: processedUser.role,
        app_id: processedUser.app_id,
        first_name: processedUser.first_name,
        last_name: processedUser.last_name,
        phone: processedUser.phone,
        allowed_screens: selectedScreens
      })
    });
    const authResult = await res.json();
    if (!res.ok) {
      setError("Error creando usuario en Auth: " + (authResult.error || 'Error desconocido'));
      return;
    }
    
    // El perfil ya fue creado por el backend, solo actualizar la UI
    setSuccess("Usuario creado exitosamente.");
    setNewUser({
      email: "",
      role: "user",
      app_id: "",
      password: "",
      first_name: "",
      last_name: "",
      phone: ""
    });
    setSelectedScreens([]);
    // Refrescar lista
    const { data: profilesData } = await supabase.from("rt_profiles").select("id, email, role, app_id, first_name, last_name, phone, full_name, created_at, updated_at");
    setProfiles(profilesData || []);
  };

  // Cargar permisos de un usuario
  const handleEditScreens = async (profile: any) => {
    setEditingProfile(profile);
    const { data: perms } = await supabase.from("rt_permissions").select("screen").eq("profile_id", profile.id);
    setEditingScreens(perms ? perms.map((p: any) => p.screen) : []);
  };

  // Guardar cambios de accesos
  const handleSaveScreens = async () => {
    if (!editingProfile) return;
    // Eliminar permisos actuales
    await supabase.from("rt_permissions").delete().eq("profile_id", editingProfile.id);
    // Insertar nuevos permisos
    const newPerms = editingScreens.map(screen => ({ profile_id: editingProfile.id, screen }));
    if (newPerms.length > 0) {
      await supabase.from("rt_permissions").insert(newPerms);
    }
    setEditingProfile(null);
    setEditingScreens([]);
    setSuccess("Accesos actualizados correctamente.");
  };

  // CRUD screens
  const handleAddScreen = async (screen: any) => {
    const { error } = await supabase.from("rt_screens").insert([screen]);
    if (!error) {
      const { data: screensData } = await supabase.from("rt_screens").select("id, screen_id, label").order("label");
      setScreens(screensData || []);
    }
  };
  const handleEditScreen = async (id: string, label: string) => {
    const { error } = await supabase.from("rt_screens").update({ label, updated_at: new Date() }).eq("id", id);
    if (!error) {
      const { data: screensData } = await supabase.from("rt_screens").select("id, screen_id, label").order("label");
      setScreens(screensData || []);
    }
  };
  const handleDeleteScreen = async (id: string) => {
    const { error } = await supabase.from("rt_screens").delete().eq("id", id);
    if (!error) {
      const { data: screensData } = await supabase.from("rt_screens").select("id, screen_id, label").order("label");
      setScreens(screensData || []);
    }
  };

  return (
    <>
      <ScreensAdminPanel
        screens={screens}
        onAdd={handleAddScreen}
        onEdit={handleEditScreen}
        onDelete={handleDeleteScreen}
      />
      <section className="mt-0 bg-white rounded-none shadow-none p-4 w-full min-h-screen">
        <h2 className="text-2xl font-bold mb-4 text-blue-800">Gestión de Usuarios RT</h2>
        <form
          onSubmit={handleCreateUser}
          className="mb-6 flex flex-col gap-4 items-stretch w-full px-4 sm:px-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
            <input
              type="text"
              placeholder="Nombres"
              className="border rounded px-3 py-2 w-full"
              value={newUser.first_name || ''}
              onChange={e => setNewUser({ ...newUser, first_name: capitalizeWords(e.target.value) })}
              required
            />
            <input
              type="text"
              placeholder="Apellidos"
              className="border rounded px-3 py-2 w-full"
              value={newUser.last_name || ''}
              onChange={e => setNewUser({ ...newUser, last_name: capitalizeWords(e.target.value) })}
              required
            />
            <input
              type="email"
              placeholder="Email"
              className="border rounded px-3 py-2 w-full"
              value={newUser.email}
              onChange={e => setNewUser({ ...newUser, email: e.target.value.toLowerCase() })}
              required
            />
            <div className="relative w-full">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Contraseña"
                className="border rounded px-3 py-2 w-full pr-10"
                value={newUser.password}
                onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-200 hover:text-gray-300"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className="w-full">
              <div className="relative w-full">
                <PhoneInput
                  country={"cl"}
                  value={newUser.phone}
                  onChange={value => setNewUser({ ...newUser, phone: value })}
                  inputClass="!w-full !border !rounded !px-3 !py-5 !text-base !bg-white focus:!ring-2 focus:!ring-blue-400 focus:!border-blue-400 !pl-10"
                  buttonClass="!border-none !bg-transparent !px-0 !absolute !left-1 !top-1/2 !-translate-y-1/2"
                  containerClass="!w-full !relative"
                  dropdownClass="!z-50"
                  placeholder="Teléfono"
                  enableSearch
                  disableDropdown={false}
                  countryCodeEditable={true}
                />
              </div>
            </div>
            <select
              className="border rounded px-3 py-2 w-full"
                value={newUser.role || ""}
              onChange={e => setNewUser({ ...newUser, role: e.target.value })}
              required
            >
                <option value="" disabled>Seleccionar rol</option>
              <option value="user">Usuario</option>
              <option value="dev">Desarrollador</option>
              <option value="admin">Administrador</option>
            </select>
            <select
              className="border rounded px-3 py-2 w-full"
              value={newUser.app_id}
              onChange={e => setNewUser({ ...newUser, app_id: e.target.value })}
              required
            >
              <option value="">Selecciona App</option>
              {apps.map(app => (
                <option key={app.id} value={app.id}>{app.name}</option>
              ))}
            </select>
          </div>
          {/* Selector de accesos permitidos visual tipo grid de botones */}
          <div className="mt-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Accesos permitidos (Screens):</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {screens.length === 0 ? (
                <span className="col-span-full text-gray-400">No hay screens disponibles</span>
              ) : (
                screens.map(screen => {
                  const selected = selectedScreens.includes(screen.id);
                  return (
                    <button
                      type="button"
                      key={screen.id}
                      className={`px-3 py-2 rounded border text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'}`}
                      onClick={() => {
                        setSelectedScreens(selected
                          ? selectedScreens.filter(s => s !== screen.id)
                          : [...selectedScreens, screen.id]);
                      }}
                    >
                      {screen.label}
                    </button>
                  );
                })
              )}
            </div>
          </div>
          <button type="submit" className="bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700 transition self-end mt-2">Crear Usuario</button>
        </form>
        {error && <div className="text-red-600 mb-4">{error}</div>}
        {success && <div className="text-green-600 mb-4">{success}</div>}
        <h3 className="text-lg font-semibold mb-2">Usuarios Existentes</h3>
        {loading ? (
          <div className="text-gray-500">Cargando...</div>
        ) : (
          <>
            {/* Vista tipo tabla solo en pantallas grandes (lg+) */}
            <div className="hidden lg:block overflow-x-auto w-full">
              <table className="min-w-full text-left border-t mt-2 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="py-2 px-2 whitespace-nowrap">Nombres y Apellidos</th>
                    <th className="py-2 px-2 whitespace-nowrap">Email</th>
                    <th className="py-2 px-2 whitespace-nowrap">Teléfono</th>
                    <th className="py-2 px-2 whitespace-nowrap">Descripción</th>
                    <th className="py-2 px-2 whitespace-nowrap">Creado</th>
                    <th className="py-2 px-2 whitespace-nowrap">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map(profile => (
                    <tr key={profile.id} className="border-t even:bg-gray-50">
                      <td className="py-2 px-2 whitespace-nowrap max-w-xs truncate">{`${profile.first_name || ''} ${profile.last_name || ''}`.trim()}</td>
                      <td className="py-2 px-2 whitespace-nowrap max-w-xs truncate">{profile.email}</td>
                      <td className="py-2 px-2 whitespace-nowrap max-w-xs truncate">{profile.phone}</td>
                      <td className="py-2 px-2 whitespace-nowrap max-w-xs truncate">{profile.full_name}</td>
                      <td className="py-2 px-2 whitespace-nowrap">{profile.created_at ? new Date(profile.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}</td>
                      <td className="py-2 px-2 whitespace-nowrap">
                        <button
                          className="text-blue-600 underline hover:text-blue-800"
                          onClick={() => handleEditScreens(profile)}
                        >
                          Editar accesos
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Vista tipo tarjeta en mobile y pantallas medianas */}
            <div className="flex flex-col gap-4 lg:hidden mt-2 w-full overflow-x-visible">
              {profiles.map(profile => (
                <div key={profile.id} className="bg-white rounded-xl shadow border border-gray-200 p-4 flex flex-col gap-2 w-full">
                  <div className="font-semibold text-base text-gray-900">{`${profile.first_name || ''} ${profile.last_name || ''}`.trim()}</div>
                  <div className="text-sm text-gray-700"><span className="font-medium">Email:</span> {profile.email}</div>
                  <div className="text-sm text-gray-700"><span className="font-medium">Teléfono:</span> {profile.phone}</div>
                  <div className="text-sm text-gray-700"><span className="font-medium">Descripción:</span> {profile.full_name}</div>
                  <div className="text-sm text-gray-700"><span className="font-medium">Creado:</span> {profile.created_at ? new Date(profile.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}</div>
                  <div>
                    <button
                      className="text-blue-600 underline hover:text-blue-800 text-sm font-medium"
                      onClick={() => handleEditScreens(profile)}
                    >
                      Editar accesos
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {/* Modal de edición de accesos */}
        {editingProfile && (
          <div ref={modalRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md relative">
              <h3 className="text-xl font-bold mb-4">Editar accesos de {editingProfile.email}</h3>
              <div className="flex flex-wrap gap-3 mb-6">
                {screens.map(screen => (
                  <label key={screen.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingScreens.includes(screen.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setEditingScreens([...editingScreens, screen.id]);
                        } else {
                          setEditingScreens(editingScreens.filter(s => s !== screen.id));
                        }
                      }}
                    />
                    <span>{screen.label}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-4 justify-end">
                <button
                  className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                  onClick={() => { setEditingProfile(null); setEditingScreens([]); }}
                >
                  Cancelar
                </button>
                <button
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                  onClick={handleSaveScreens}
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
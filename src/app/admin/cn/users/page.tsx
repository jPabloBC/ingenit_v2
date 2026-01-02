"use client";
import { useEffect, useState } from "react";
import { supabase } from '@/lib/supabaseClient';
import { Users, Search, Plus, Edit, Trash2, Mail, Phone, MapPin, Calendar, CheckCircle, XCircle, ArrowLeft, Filter } from "lucide-react";
import CNUserModal from '@/components/CNUserModal';
import { useRouter } from "next/navigation";

interface CNUser {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  status: 'active' | 'inactive' | 'pending';
  role?: string;
  location?: string;
  created_at: string;
  last_login?: string;
  last_session_revoked?: boolean | null;
}

export default function CNUsersPage() {
  const [users, setUsers] = useState<CNUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<CNUser | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadUsers();
    // Suscripción realtime a cn_users y cn_sessions
    const channel = supabase
      .channel('realtime:cn_users_and_sessions')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cn_users' }, (payload) => {
          console.info('realtime event cn_users', payload);
          setRealtimeConnected(true);
          loadUsersSilent();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cn_sessions' }, (payload) => {
          console.info('realtime event cn_sessions', payload);
          setRealtimeConnected(true);
          loadUsersSilent();
        })
      .subscribe();

    // Fallback polling every 5s in case Realtime is not delivering events
    const pollInterval = setInterval(() => {
      console.debug('Polling users fallback');
      // mark realtime as disconnected if no events have set it recently
      setRealtimeConnected(false);
      loadUsersSilent();
    }, 5000);

    return () => {
      try { supabase.removeChannel(channel); } catch (e) {}
      clearInterval(pollInterval);
    };
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/cn/users');
      const payload = await res.json();
      if (!res.ok) {
        console.error('Error cargando usuarios desde admin API:', payload);
        setUsers([]);
        return;
      }
      setUsers(payload.users || []);
    } catch (error) {
      console.error('❌ Error general:', error);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Silent loader: updates users without toggling global loading spinner
  const loadUsersSilent = async () => {
    try {
      const res = await fetch('/api/admin/cn/users');
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        console.error('Error cargando usuarios (silent):', payload);
        return;
      }
      setUsers(payload.users || []);
    } catch (error) {
      console.error('❌ Error general (silent):', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("¿Estás seguro de eliminar este usuario?")) return;

    try {
      const res = await fetch(`/api/admin/cn/users?id=${encodeURIComponent(userId)}`, {
        method: 'DELETE'
      });
      const payload = await res.json();
      if (!res.ok) {
        console.error('Error deleting user:', payload);
        alert('Error al eliminar usuario');
        return;
      }
      alert('Usuario eliminado exitosamente');
      loadUsers();
    } catch (error) {
      console.error("❌ Error:", error);
      alert("Error al eliminar usuario");
    }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/admin/cn/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, status: newStatus })
      });
      const payload = await res.json();
      if (!res.ok) {
        console.error('Error updating status:', payload);
        alert('Error al actualizar estado');
        return;
      }
      alert('Estado actualizado exitosamente');
      loadUsers();
    } catch (error) {
      console.error("❌ Error:", error);
      alert("Error al actualizar estado");
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setShowCreateModal(true);
  };

  const handleRefresh = () => {
    loadUsers();
  };

  const openEditModal = (user: CNUser) => {
    setEditingUser(user);
    setShowCreateModal(true);
  };

  // Filtrar usuarios
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone?.includes(searchQuery);
    
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      active: "bg-green-100 text-green-800 border-green-200",
      inactive: "bg-gray-100 text-gray-800 border-gray-200",
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200"
    };
    
    const labels = {
      active: "Activo",
      inactive: "Inactivo",
      pending: "Pendiente"
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${styles[status as keyof typeof styles] || styles.inactive}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const getStatusIcon = (status: string) => {
    if (status === 'active') return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (status === 'pending') return <Calendar className="w-4 h-4 text-yellow-600" />;
    return <XCircle className="w-4 h-4 text-gray-600" />;
  };

  const getSessionBadge = (revoked: boolean | null | undefined) => {
    if (revoked === false) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full border bg-green-100 text-green-800 border-green-200">Activa</span>;
    }
    if (revoked === true) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full border bg-gray-100 text-gray-800 border-gray-200">Cerrada</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium rounded-full border bg-yellow-100 text-yellow-800 border-yellow-200">Desconocida</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {showCreateModal && (
          <CNUserModal
            user={editingUser}
            onClose={() => { setShowCreateModal(false); setEditingUser(null); }}
            onSaved={() => loadUsers()}
          />
        )}
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.push("/admin/cn")}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-600" />
                Gestión de Usuarios CN
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Administra los usuarios de cn.ingenit.cl
              </p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 w-full sm:max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, email o teléfono..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent appearance-none bg-white w-full sm:w-auto"
                >
                  <option value="all">Todos los estados</option>
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                  <option value="pending">Pendientes</option>
                </select>
              </div>

              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-md transition-colors font-medium whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Nuevo Usuario
              </button>
              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md transition-colors font-medium"
                title="Refrescar lista"
              >
                Refrescar
              </button>
              <div className="flex items-center ml-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${realtimeConnected ? 'bg-green-100 text-green-800 border-green-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'}`}>
                  {realtimeConnected ? 'Realtime' : 'Polling'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              </div>
              <Users className="w-8 h-8 text-cyan-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Activos</p>
                <p className="text-2xl font-bold text-green-600">
                  {users.filter(u => u.status === 'active').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {users.filter(u => u.status === 'pending').length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
              </div>
            ) : filteredUsers.length > 0 ? (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contacto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sesión
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha Registro
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-cyan-100 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-cyan-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.full_name || "Sin nombre"}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {user.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-gray-400" />
                              {user.phone}
                            </div>
                          )}
                          {user.location && (
                            <div className="flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-500">{user.location}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(user.status)}
                          {getStatusBadge(user.status)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900">
                          {user.role || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {getSessionBadge(user.last_session_revoked)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {new Date(user.created_at).toLocaleDateString('es-CL')}
                        </div>
                        {user.last_login && (
                          <div className="text-xs text-gray-500">
                            Último acceso: {new Date(user.last_login).toLocaleDateString('es-CL')}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleStatusChange(user.id, user.status === 'active' ? 'inactive' : 'active')}
                            className="p-2 text-gray-600 hover:text-cyan-600 hover:bg-cyan-50 rounded-md transition-colors"
                            title={user.status === 'active' ? 'Desactivar' : 'Activar'}
                          >
                            {user.status === 'active' ? (
                              <XCircle className="w-4 h-4" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchQuery || statusFilter !== "all" 
                    ? "No se encontraron usuarios con los filtros aplicados"
                    : "No hay usuarios registrados"}
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-md transition-colors"
                >
                  Crear primer usuario
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Pagination Info */}
        {filteredUsers.length > 0 && (
          <div className="mt-4 text-sm text-gray-600 text-center">
            Mostrando {filteredUsers.length} de {users.length} usuarios
          </div>
        )}
      </div>
    </div>
  );
}

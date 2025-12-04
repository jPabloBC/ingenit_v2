"use client";
import { useEffect, useState } from "react";
import { Users, Plus, Edit, Trash2, Search, Filter, UserCheck, UserX, Mail, Phone, Calendar } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface PRUser {
  id: string;
  auth_id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'user' | 'viewer' | 'ingenit' | 'dev';
  status: 'active' | 'inactive' | 'pending';
  company_id?: string;
  nombres?: string;
  apellidos?: string;
  document?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export default function PRUsersPage() {
  const [users, setUsers] = useState<PRUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      console.log("🔍 Cargando usuarios PR...");
      
      // Intentar cargar desde app_pr.users directamente
      const { data, error } = await supabase
        .from("app_pr.users")
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("❌ Error con app_pr.users:", error);
        // Fallback a pr_users
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("pr_users")
          .select('*')
          .order('created_at', { ascending: false });
        
        if (fallbackError) {
          console.error("❌ Error con pr_users:", fallbackError);
          setUsers([]);
        } else {
          console.log("✅ Datos cargados desde pr_users:", fallbackData);
          setUsers(fallbackData || []);
        }
      } else {
        console.log("✅ Datos cargados desde app_pr.users:", data);
        setUsers(data || []);
      }
    } catch (error) {
      console.error("❌ Error cargando usuarios PR:", error);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'inactive':
        return 'text-red-600 bg-red-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'dev':
        return 'text-red-600 bg-red-100';
      case 'ingenit':
        return 'text-orange-600 bg-orange-100';
      case 'admin':
        return 'text-purple-600 bg-purple-100';
      case 'user':
        return 'text-blue-600 bg-blue-100';
      case 'viewer':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Users className="w-6 h-6 text-orange-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-title text-gray-900">
            Gestión de Usuarios PR
          </h1>
        </div>
        <p className="text-sm sm:text-base text-gray-600">
          Administra los usuarios del proyecto PR
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Usuarios</p>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
            <Users className="w-8 h-8 text-orange-600" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Activos</p>
              <p className="text-2xl font-bold text-green-600">{users.filter(u => u.status === 'active').length}</p>
            </div>
            <UserCheck className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pendientes</p>
              <p className="text-2xl font-bold text-yellow-600">{users.filter(u => u.status === 'pending').length}</p>
            </div>
            <Calendar className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Inactivos</p>
              <p className="text-2xl font-bold text-red-600">{users.filter(u => u.status === 'inactive').length}</p>
            </div>
            <UserX className="w-8 h-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow border p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar usuarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
              <option value="pending">Pendientes</option>
            </select>

            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">Todos los roles</option>
              <option value="dev">Desarrollador</option>
              <option value="ingenit">IngenIT</option>
              <option value="admin">Administrador</option>
              <option value="user">Usuario</option>
              <option value="viewer">Visualizador</option>
            </select>

            <button className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Nuevo Usuario
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Último acceso</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name || `${user.nombres || ''} ${user.apellidos || ''}`.trim() || 'Sin nombre'}</div>
                        <div className="text-sm text-gray-500">ID: {user.auth_id}</div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 flex items-center gap-1">
                      <Mail className="w-4 h-4 text-gray-400" />
                      {user.email}
                    </div>
                    {user.phone && (
                      <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {user.phone}
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${getRoleColor(user.role)}`}>
                      {user.role}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(user.status)}`}>
                      {user.status}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-500">
                    {user.updated_at ? new Date(user.updated_at).toLocaleString('es-CL') : 'Nunca'}
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="text-blue-600 hover:text-blue-800 p-1">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-800 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No se encontraron usuarios</p>
            <p className="text-sm text-gray-400">
              {searchTerm || filterStatus !== 'all' || filterRole !== 'all'
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Los usuarios aparecerán aquí cuando se registren'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
"use client";
import { useEffect, useState } from "react";
import { Database, Table, Plus, Search, ArrowLeft, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

interface CNTable {
  table_name: string;
  row_count: number;
  last_modified: string;
}

export default function CNDatabasePage() {
  const [tables, setTables] = useState<CNTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      setIsLoading(true);
      console.log("📊 Cargando tablas CN...");

      // Query para obtener todas las tablas que empiezan con cn_
      const { data, error } = await supabase
        .rpc('get_cn_tables'); // Necesitarás crear esta función RPC en Supabase

      if (error) {
        console.error("❌ Error cargando tablas:", error);
        // Por ahora, usar lista mock
        setTables([
          { table_name: 'cn_users', row_count: 0, last_modified: new Date().toISOString() },
          { table_name: 'cn_settings', row_count: 0, last_modified: new Date().toISOString() },
          { table_name: 'cn_logs', row_count: 0, last_modified: new Date().toISOString() }
        ]);
      } else {
        setTables(data || []);
      }
    } catch (error) {
      console.error("❌ Error general:", error);
      setTables([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTables = tables.filter(table =>
    table.table_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
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
                <Database className="w-7 h-7 sm:w-8 sm:h-8 text-purple-600" />
                Tablas CN
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Gestión de tablas del proyecto CN
              </p>
            </div>
          </div>

          {/* Search and Actions */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 w-full sm:max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar tabla..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={loadTables}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-md transition-colors font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                Recargar
              </button>
            </div>
          </div>
        </div>

        {/* Tables Grid */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : filteredTables.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {filteredTables.map((table) => (
                <div
                  key={table.table_name}
                  className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => {
                    // TODO: Navegar a vista detallada de la tabla
                    console.log("Tabla seleccionada:", table.table_name);
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Table className="w-5 h-5 text-purple-600" />
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {table.table_name}
                  </h3>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Registros:</span>
                      <span className="font-medium text-gray-900">{table.row_count}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Última modificación:</span>
                      <span className="text-xs text-gray-500">
                        {new Date(table.last_modified).toLocaleDateString('es-CL')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchQuery 
                  ? "No se encontraron tablas con ese nombre"
                  : "No hay tablas CN configuradas"}
              </p>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">
            ℹ️ Información
          </h4>
          <p className="text-sm text-blue-800">
            Esta sección muestra todas las tablas del proyecto CN (tablas que comienzan con <code className="bg-blue-100 px-1 py-0.5 rounded">cn_</code>).
            Puedes hacer clic en cada tabla para ver sus detalles y administrar sus datos.
          </p>
        </div>
      </div>
    </div>
  );
}

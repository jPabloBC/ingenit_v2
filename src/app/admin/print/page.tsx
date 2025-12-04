"use client";
import { useEffect, useState } from "react";
import { Printer, FileText, Settings, Image } from "lucide-react";

export default function PrintDashboard() {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Aquí puedes cargar datos o inicializar lógica de impresión
  }, []);

  return (
    <main className="relative z-0 min-h-screen bg-white text-gray-900 font-body">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        <h1 className="text-xl md:text-2xl font-title text-gray7 mb-6 font-normal flex items-center gap-3">
          <Printer className="w-6 h-6 text-gray7" />
          Panel de Impresiones
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <a href="/admin/print/image" className="block bg-yellow-50 border border-yellow-200 rounded-xl p-6 shadow hover:shadow-lg transition no-underline">
            <div className="flex items-center gap-3">
              <Image className="w-7 h-7 text-yellow-600" />
              <h2 className="font-semibold text-lg">Imágenes</h2>
            </div>
          </a>
          <a href="/admin/print/history" className="block bg-blue-50 border border-blue-200 rounded-xl p-6 shadow hover:shadow-lg transition no-underline">
            <div className="flex items-center gap-3">
              <FileText className="w-7 h-7 text-blue-600" />
              <h2 className="font-semibold text-lg">Historial</h2>
            </div>
          </a>
        </div>
      </div>
    </main>
  );
}

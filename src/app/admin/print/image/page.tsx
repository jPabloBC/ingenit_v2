"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { listPrintJobs, createPrintJob, getPrintJob, deletePrintJob } from "@/lib/printJobs";
import { generatePrintJobId } from "@/lib/printJobIdGenerator";
import { Plus, RefreshCw, CornerUpLeft } from "lucide-react";

// Helper para mostrar solo el número correlativo (ej: PRINT_001 => 001)
function getCorrelativo(name: string) {
  if (!name) return '';
  const match = name.match(/\d+$/);
  return match ? match[0] : name;
}
function getShortUuid(id: string) {
  return id?.split("-")[0] || "";
}


export default function PrintImagePage() {
  // Estados para print jobs y archivos
  const router = useRouter();
  const [jobs, setJobs] = useState<Array<{ id: string; name: string; description?: string; created_at?: string; status?: string }>>([]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  // Ya no se usan nombre/desc manuales


  // Crear un nuevo print job con correlativo
  const handleCreateJob = async () => {
    setError("");
    setLoading(true);
    try {
      const correlativo = await generatePrintJobId();
      const job = await createPrintJob({ name: correlativo });
      setJobs([job, ...jobs]);
      // Redirigir a la nueva screen del documento
      router.push(`/admin/print/image/${job.id}`);
    } catch (err: any) {
      setError("Error creando documento: " + (err.message || err.toString()));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setError("");
    setLoading(true);
    try {
      const jobsList = await listPrintJobs();
      setJobs(jobsList);
    } catch (err: any) {
      setError("Error cargando documentos: " + (err.message || err.toString()));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = confirm('¿Eliminar documento? Esta acción no se puede deshacer.');
    if (!ok) return;
    setError("");
    setLoading(true);
    try {
      await deletePrintJob(id);
      setJobs(prev => prev.filter(j => j.id !== id));
    } catch (err: any) {
      setError('Error eliminando documento: ' + (err.message || err.toString()));
    } finally {
      setLoading(false);
    }
  };




  // Solo cargar print jobs
  useEffect(() => {
    handleRefresh();
  }, []);
  // Eliminar archivo de Dropbox y Supabase
  // (Esta función no se usa en esta pantalla, pero restauro la definición por si la necesitas)
  /*
  const handleDelete = async (id: string, path: string) => {
    setLoading(true);
    try {
      await deleteFile(path);
      await deleteFileRecord(id);
      setUploaded(uploaded.filter(img => img.id !== id));
    } catch (err: any) {
      setError("Error eliminando archivo: " + (err.message || err.toString()));
    } finally {
      setLoading(false);
    }
  };
  */

  return (
    <div className="max-w-full mx-auto p-4 sm:p-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-normal text-gray7 md:text-3xl">Creador de Documentos para Impresión</h1>
      </div>

      {/* Controles móviles: fila de iconos debajo de la hamburguesa */}
      <div className="block sm:hidden w-full mb-4">
        <div className="flex flex-row items-center justify-between gap-2 w-full">
          <button
            onClick={handleCreateJob}
            className="flex-1 h-12 flex items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 shadow"
            disabled={loading}
            title="Crear nuevo documento"
            aria-label="Crear nuevo documento"
          >
            <Plus className="w-6 h-6" />
          </button>
          <button
            onClick={handleRefresh}
            className="flex-1 h-12 flex items-center justify-center rounded-lg bg-red-600 text-white hover:bg-red-700 shadow"
            title="Actualizar lista"
            aria-label="Actualizar lista"
            disabled={loading}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/print')}
            className="flex-1 h-12 flex items-center justify-center rounded-lg bg-gray-400 hover:bg-gray-500 text-white text-base shadow"
            aria-label="Volver a Print"
          >
            <CornerUpLeft className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Controles desktop: fila fija arriba a la derecha */}
      <div className="hidden sm:fixed sm:right-6 sm:top-6 sm:z-50 sm:flex sm:items-center sm:gap-3">
        <button
          onClick={handleCreateJob}
          className="w-14 h-14 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 shadow-lg"
          disabled={loading}
          title="Crear nuevo documento"
          aria-label="Crear nuevo documento"
        >
          <Plus className="w-6 h-6" />
        </button>
        <button
          onClick={handleRefresh}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 shadow-lg"
          title="Actualizar lista"
          aria-label="Actualizar lista"
          disabled={loading}
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/print')}
          className="px-3 py-1.5 bg-gray-400 hover:bg-gray-500 text-white rounded-md text-sm shadow-sm"
          aria-label="Volver a Print"
        >
          <CornerUpLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Lista de documentos existentes */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <label className="block mb-1 font-semibold">Documentos existentes:</label>
        </div>
        {error && <div className="text-sm text-red-600 my-2">{error}</div>}

        {/* Mobile: tarjetas */}
        <div className="block sm:hidden">
          {jobs.length === 0 && !loading ? (
            <div className="text-sm text-gray-600 mt-2">No hay documentos creados todavía.</div>
          ) : (
            <div className="flex flex-col gap-3 mt-2">
              {jobs.map(job => (
                <div key={job.id} className="rounded-xl border bg-white shadow p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <a href={`/admin/print/image/${job.id}`} className="text-blue-700 hover:underline font-mono text-lg font-semibold truncate">
                        {getCorrelativo(job.name)}
                      </a>
                      <div className="text-xs text-gray-400 break-all">{job.id}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs ${job.status === 'done' ? 'bg-green-100 text-green-800' : job.status === 'error' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {job.status || 'pending'}
                    </span>
                  </div>
                  {job.description && <div className="text-xs text-gray-500">{job.description}</div>}
                  <div className="text-xs text-gray-500">{job.created_at ? new Date(job.created_at).toLocaleString() : '-'}</div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => router.push(`/admin/print/image/${job.id}`)}
                      className="flex-1 px-2 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded text-sm hover:bg-blue-100"
                    >
                      Ver
                    </button>
                    <button
                      onClick={() => handleDelete(job.id)}
                      className="flex-1 px-2 py-2 bg-red-50 border border-red-200 text-red-700 rounded text-sm hover:bg-red-100"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop: tabla */}
        <div className="hidden sm:block">
          {jobs.length === 0 && !loading ? (
            <div className="text-sm text-gray-600 mt-2">No hay documentos creados todavía.</div>
          ) : (
            <div className="mt-2 border rounded divide-y">
              <div className="grid grid-cols-12 gap-2 p-2 bg-gray-50 text-sm font-semibold">
                <div className="col-span-1">Nº</div>
                <div className="col-span-4">UUID</div>
                <div className="col-span-3">Creado</div>
                <div className="col-span-2">Estado</div>
                <div className="col-span-1">Acciones</div>
              </div>
              {jobs.map(job => (
                <div key={job.id} className="grid grid-cols-12 gap-2 p-3 items-center">
                  <div className="col-span-1 truncate">
                    <a href={`/admin/print/image/${job.id}`} className="text-blue-700 hover:underline font-mono">
                      {getCorrelativo(job.name)}
                    </a>
                    {job.description && <div className="text-xs text-gray-500">{job.description}</div>}
                  </div>
                  <div className="col-span-4 break-all text-xs text-gray-400">{job.id}</div>
                  <div className="col-span-3 text-sm text-gray-600">
                    {job.created_at ? new Date(job.created_at).toLocaleString() : '-'}
                  </div>
                  <div className="col-span-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${job.status === 'done' ? 'bg-green-100 text-green-800' : job.status === 'error' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {job.status || 'pending'}
                    </span>
                  </div>
                  <div className="col-span-1 flex gap-2">
                    <button
                      onClick={() => router.push(`/admin/print/image/${job.id}`)}
                      className="px-2 py-1 bg-white border rounded text-sm hover:bg-gray-50"
                    >
                      Ver
                    </button>
                    <button
                      onClick={() => handleDelete(job.id)}
                      className="px-2 py-1 bg-red-50 border border-red-200 text-red-700 rounded text-sm hover:bg-red-100"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

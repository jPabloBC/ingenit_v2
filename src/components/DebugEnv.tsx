"use client";

export default function DebugEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return (
    <div className="fixed top-4 right-4 bg-yellow-100 border border-yellow-400 rounded-lg p-4 max-w-md z-50">
      <h3 className="font-semibold text-yellow-800 mb-2">Debug: Variables de Entorno</h3>
      <div className="text-xs space-y-1">
        <p><strong>SUPABASE_URL:</strong> {supabaseUrl ? '✅ Configurado' : '❌ Faltante'}</p>
        <p><strong>SUPABASE_ANON_KEY:</strong> {supabaseKey ? '✅ Configurado' : '❌ Faltante'}</p>
        {!supabaseUrl || !supabaseKey ? (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
            <p className="text-red-700 text-xs">
              Crea un archivo <code>.env.local</code> en la raíz del proyecto con:
            </p>
            <pre className="text-xs mt-1">
{`NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key`}
            </pre>
          </div>
        ) : (
          <p className="text-green-700">✅ Variables configuradas correctamente</p>
        )}
      </div>
    </div>
  );
} 
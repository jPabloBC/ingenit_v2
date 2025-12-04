import { supabase } from "@/lib/supabaseClient";

export async function saveFileRecord({ dropbox_path, file_name, file_type, metadata }: {
  dropbox_path: string;
  file_name: string;
  file_type: string;
  metadata?: any;
}) {
  const { data, error } = await supabase
    .from("rt_storage")
    .insert([
      {
        dropbox_path,
        file_name,
        file_type,
        metadata: metadata || null,
      },
    ])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listFilesByPrintJob(print_job_id: string) {
  const { data, error } = await supabase
    .from("rt_storage")
    .select("id, dropbox_path, file_name, file_type, created_at, metadata")
    .order("created_at", { ascending: false });
  if (error) throw error;
  // Filtrar en memoria para mayor compatibilidad
  return (data || []).filter((f: any) => f.metadata?.print_job_id === print_job_id);
}

export async function deleteFileRecord(id: string) {
  const { error } = await supabase
    .from("rt_storage")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

import { supabase } from "@/lib/supabaseClient";

export async function createPrintJob({ name, description, metadata }: {
  name: string;
  description?: string;
  metadata?: any;
}) {
  const { data, error } = await supabase
    .from("rt_print_jobs")
    .insert([
      {
        name,
        description: description || null,
        metadata: metadata || null,
      },
    ])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listPrintJobs() {
  const { data, error } = await supabase
    .from("rt_print_jobs")
    .select("id, name, description, created_at, status")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getPrintJob(id: string) {
  const { data, error } = await supabase
    .from("rt_print_jobs")
    .select("id, name, description, created_at, status, metadata")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function updatePrintJob(id: string, updates: any) {
  const { data, error } = await supabase
    .from("rt_print_jobs")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePrintJob(id: string) {
  const { error } = await supabase
    .from("rt_print_jobs")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

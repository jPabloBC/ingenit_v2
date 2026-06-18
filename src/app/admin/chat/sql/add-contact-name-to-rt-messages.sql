-- Guardar nombre de perfil de WhatsApp del remitente
-- Ejecutar una vez en Supabase SQL editor

alter table if exists public.rt_messages
  add column if not exists contact_name text;

create index if not exists idx_rt_messages_contact_name
  on public.rt_messages (contact_name);


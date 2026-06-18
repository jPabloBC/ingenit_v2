alter table public.rt_personal_banks
add column if not exists logo_url text;

create index if not exists idx_rt_personal_banks_code
on public.rt_personal_banks (code);


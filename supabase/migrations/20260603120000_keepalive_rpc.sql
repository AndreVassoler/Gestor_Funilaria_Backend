-- Evita pausa do projeto Supabase por inatividade (ping via GitHub Actions).
create or replace function public.keepalive()
returns text
language sql
security definer
set search_path = public
as $$
  select 'ok'::text;
$$;

grant execute on function public.keepalive() to anon, authenticated, service_role;

-- Atualiza o cache do PostgREST (evita 404 logo após criar a função).
notify pgrst, 'reload schema';

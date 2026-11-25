-- Solo los correos de esta lista pueden recibir el rol de administrador.
-- La lista NO se llena aquí (el repositorio es público): se llena a mano en cada base.
--   local: supabase/seed.sql · nube: insert hecho por la dueña al publicar.
create table if not exists public.admin_allowlist (
  email text primary key check (email = lower(trim(email)) and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_at timestamptz not null default now()
);
alter table public.admin_allowlist enable row level security;
revoke all on table public.admin_allowlist from public, anon, authenticated;

create or replace function public.can_be_admin(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from auth.users u join public.admin_allowlist a on a.email = lower(u.email)
    where u.id = target
  );
$$;
revoke all on function public.can_be_admin(uuid) from public, anon, authenticated;

-- Igual que antes, más: nadie fuera de la lista pasa a administrador.
create or replace function public.admin_set_role(target uuid, new_role public.app_role) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'SOLO_ADMIN' using errcode = '42501'; end if;
  if target = auth.uid() then raise exception 'NO_PUEDES_CAMBIAR_TU_ROL' using errcode = 'P0001'; end if;
  if new_role = 'admin' and not public.can_be_admin(target) then
    raise exception 'ADMIN_NO_PERMITIDO' using errcode = '42501';
  end if;
  perform set_config('activa.allow_role_change', 'on', true);
  update public.profiles set role = new_role where id = target;
  if not found then raise exception 'CUENTA_NO_EXISTE' using errcode = 'P0002'; end if;
end $$;

-- Lista de cuentas: suma can_be_admin para que la página solo ofrezca «Administrador» a quien puede serlo.
drop function if exists public.admin_list_users(text);
create function public.admin_list_users(search text default null)
returns table (id uuid, email text, full_name text, role public.app_role, created_at timestamptz,
               requested_role text, nutri_status text, avatar_path text, can_be_admin boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'SOLO_ADMIN' using errcode = '42501'; end if;
  return query
    select p.id, u.email::text, p.full_name, p.role, p.created_at,
           p.requested_role::text, p.nutri_status::text, p.avatar_path,
           exists (select 1 from public.admin_allowlist a where a.email = lower(u.email))
    from public.profiles p join auth.users u on u.id = p.id
    where search is null or u.email ilike '%' || search || '%' or p.full_name ilike '%' || search || '%'
    order by (p.nutri_status = 'pendiente') desc nulls last, p.created_at desc
    limit 200;
end $$;
revoke all on function public.admin_list_users(text) from public, anon;
grant execute on function public.admin_list_users(text) to authenticated;

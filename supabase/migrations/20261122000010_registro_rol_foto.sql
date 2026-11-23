-- Registro con tipo de cuenta (paciente / nutricionista), solicitud de nutricionista y foto de perfil (22/11/2026).
-- Spec: docs/superpowers/specs/2026-11-22-registro-rol-foto-inicio.md (sección 1).

-- ============ Columnas nuevas en profiles ============
alter table public.profiles
  add column if not exists requested_role text null check (requested_role in ('nutricionista')),
  add column if not exists nutri_status text null check (nutri_status in ('pendiente', 'aprobado', 'rechazado')),
  add column if not exists avatar_path text null;   -- ruta en el bucket avatars: '<user_id>/<archivo>'

-- ============ Nadie cambia su propia solicitud ni su estado desde la página ============
-- Mismo permiso que protect_role: solo admin_review_nutri (activa.allow_role_change).
-- avatar_path no se protege: lo cambia el propio usuario.
create or replace function public.protect_nutri_fields() returns trigger
language plpgsql as $$
begin
  if (new.requested_role is distinct from old.requested_role or new.nutri_status is distinct from old.nutri_status)
     and current_setting('activa.allow_role_change', true) is distinct from 'on'
     and auth.uid() is not null then
    raise exception 'ROL_PROTEGIDO' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger profiles_protect_nutri before update on public.profiles
  for each row execute function public.protect_nutri_fields();

-- ============ Registro: tipo de cuenta ============
-- Copia la versión vigente (migración 2) y añade account_type. Nutricionista: sin cupo y en revisión.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  bd date := nullif(new.raw_user_meta_data ->> 'birth_date', '')::date;
  tipo text := coalesce(nullif(new.raw_user_meta_data ->> 'account_type', ''), 'paciente');
begin
  if bd is not null and bd > (current_date - interval '16 years') then
    raise exception 'MENOR_DE_16' using errcode = 'P0001';
  end if;
  if tipo not in ('paciente', 'nutricionista') then
    raise exception 'DATOS_INVALIDOS' using errcode = 'P0001';
  end if;
  if tipo = 'paciente' and not public.phase_on(3)
     and (select count(*) from public.profiles where role = 'usuario' and requested_role is null)
         >= (select s.patient_limit from public.app_settings s where s.id = 1) then
    raise exception 'CUPO_LLENO' using errcode = 'P0001';
  end if;
  if tipo = 'nutricionista' then
    insert into public.profiles (id, full_name, birth_date, requested_role, nutri_status)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), bd, 'nutricionista', 'pendiente');
  else
    insert into public.profiles (id, full_name, birth_date)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), bd);
  end if;
  return new;
end $$;

-- ============ Estado público: el cupo no cuenta a nutricionistas ============
-- Copia la versión vigente (migración 2); solo cambia patients_count.
create or replace function public.get_public_settings() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'phase1', s.phase1,
    'phase2', s.phase2,
    'phase3', s.phase3,
    'patient_limit', s.patient_limit,
    'patients_count', (select count(*) from public.profiles p where p.role = 'usuario' and p.requested_role is null))
  from public.app_settings s where s.id = 1
$$;

-- ============ Admin revisa la solicitud de nutricionista ============
create or replace function public.admin_review_nutri(target uuid, approve boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  st text;
begin
  if not public.is_admin() then raise exception 'SOLO_ADMIN' using errcode = '42501'; end if;
  select p.nutri_status into st from public.profiles p where p.id = target for update;
  if st is distinct from 'pendiente' then raise exception 'SIN_SOLICITUD' using errcode = 'P0001'; end if;
  perform set_config('activa.allow_role_change', 'on', true);
  if approve then
    update public.profiles set role = 'nutricionista', nutri_status = 'aprobado' where id = target;
    insert into public.notifications (user_id, kind, title, body, link)
    values (target, 'nutri_solicitud', 'Tu cuenta de nutricionista fue aprobada',
            'Ya puedes atender pacientes desde tu panel.', '/perfil');
  else
    update public.profiles set nutri_status = 'rechazado' where id = target;
    insert into public.notifications (user_id, kind, title, body, link)
    values (target, 'nutri_solicitud', 'Tu solicitud de nutricionista no fue aprobada',
            'Sigues con tu cuenta de paciente. Escríbenos si quieres revisarla.', '/contacto');
  end if;
end $$;

-- ============ Lista de cuentas: más columnas, pendientes primero ============
drop function if exists public.admin_list_users(text);
create function public.admin_list_users(search text default null)
returns table (id uuid, email text, full_name text, role public.app_role, created_at timestamptz,
               requested_role text, nutri_status text, avatar_path text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'SOLO_ADMIN' using errcode = '42501'; end if;
  return query
    select p.id, u.email::text, p.full_name, p.role, p.created_at,
           p.requested_role::text, p.nutri_status::text, p.avatar_path
    from public.profiles p join auth.users u on u.id = p.id
    where search is null or u.email ilike '%' || search || '%' or p.full_name ilike '%' || search || '%'
    order by (p.nutri_status = 'pendiente') desc nulls last, p.created_at desc
    limit 200;
end $$;

-- ============ Bucket privado de fotos de perfil ============
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- avatars: carpeta = id de la persona. Dueño sube/cambia/borra y ve; staff ve.
drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects for select to authenticated
  using (bucket_id = 'avatars'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()));
drop policy if exists avatars_insert on storage.objects;
create policy avatars_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists avatars_update on storage.objects;
create policy avatars_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists avatars_delete on storage.objects;
create policy avatars_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============ Permisos de ejecución (mismos que la base local; ver 20261122000009) ============
revoke all on function public.get_public_settings() from public;
grant execute on function public.get_public_settings() to anon, authenticated;

revoke all on function public.handle_new_user() from public;
grant execute on function public.handle_new_user() to anon, authenticated;

revoke all on function public.protect_nutri_fields() from public, anon;
grant execute on function public.protect_nutri_fields() to anon, authenticated;

revoke all on function public.admin_review_nutri(uuid, boolean) from public, anon;
grant execute on function public.admin_review_nutri(uuid, boolean) to authenticated;

revoke all on function public.admin_list_users(text) from public, anon;
grant execute on function public.admin_list_users(text) to authenticated;

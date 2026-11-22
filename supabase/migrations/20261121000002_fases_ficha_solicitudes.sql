-- Migración 2: fases (interruptores y cupo), ficha del paciente y solicitudes de atención.
-- Fuente de nombres: docs/superpowers/plans/2026-11-21-db-contrato.md (Migración 2).

-- ============ Fases y cupo ============
create table public.app_settings (
  id int primary key default 1 check (id = 1),
  phase1 bool not null default true,
  phase2 bool not null default false,
  phase3 bool not null default false,
  patient_limit int not null default 5 check (patient_limit between 0 and 100000),
  updated_at timestamptz default now()
);
insert into public.app_settings (id) values (1) on conflict (id) do nothing;

create trigger app_settings_touch before update on public.app_settings
  for each row execute function public.touch_updated_at();

alter table public.app_settings enable row level security;
-- Todos leen la configuración; nadie la escribe directamente (solo admin_set_settings).
create policy app_settings_read on public.app_settings for select using (true);

create or replace function public.phase_on(n int) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select case n when 1 then s.phase1 when 2 then s.phase2 when 3 then s.phase3 else false end
       from public.app_settings s where s.id = 1),
    false)
$$;

create or replace function public.get_public_settings() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'phase1', s.phase1,
    'phase2', s.phase2,
    'phase3', s.phase3,
    'patient_limit', s.patient_limit,
    'patients_count', (select count(*) from public.profiles p where p.role = 'usuario'))
  from public.app_settings s where s.id = 1
$$;

create or replace function public.admin_set_settings(p_phase1 bool, p_phase2 bool, p_phase3 bool, p_patient_limit int)
returns json
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'SOLO_ADMIN' using errcode = '42501'; end if;
  update public.app_settings
     set phase1 = p_phase1, phase2 = p_phase2, phase3 = p_phase3, patient_limit = p_patient_limit
   where id = 1;
  return public.get_public_settings();
end $$;

-- Registro: menores de 16 fuera; cupo de pacientes mientras la fase 3 esté apagada.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  bd date := nullif(new.raw_user_meta_data ->> 'birth_date', '')::date;
begin
  if bd is not null and bd > (current_date - interval '16 years') then
    raise exception 'MENOR_DE_16' using errcode = 'P0001';
  end if;
  if not public.phase_on(3)
     and (select count(*) from public.profiles where role = 'usuario')
         >= (select s.patient_limit from public.app_settings s where s.id = 1) then
    raise exception 'CUPO_LLENO' using errcode = 'P0001';
  end if;
  insert into public.profiles (id, full_name, birth_date)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), bd);
  return new;
end $$;

-- ============ Retiro de la migración 1 (nutrition_requests, sustituida por ficha + solicitudes) ============
drop table if exists public.nutrition_requests cascade;
drop function if exists public.take_nutrition_request(uuid);
drop function if exists public.answer_nutrition_request(uuid, text);

-- ============ Ficha del paciente ============
create table public.patient_intakes (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  weight_kg numeric(5, 1) not null check (weight_kg between 25 and 350),
  height_cm numeric(5, 1) not null check (height_cm between 100 and 250),
  waist_cm numeric(5, 1) check (waist_cm between 40 and 250),
  goal text check (goal in ('bajar_peso', 'ganar_musculo', 'mantener', 'resistencia', 'bienestar')),
  activity_level text check (activity_level in ('sedentario', 'ligero', 'moderado', 'intenso')),
  health_notes text check (char_length(health_notes) <= 1000),
  photo_path text,                                      -- '<user_id>/<archivo>' en body-photos
  consent_photo boolean not null default false,
  consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (photo_path is null or consent_photo)
);

create trigger patient_intakes_touch before update on public.patient_intakes
  for each row execute function public.touch_updated_at();

create or replace function public.patient_intake_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_birth date;
begin
  if not public.phase_on(1) then raise exception 'FASE_NO_ACTIVA' using errcode = 'P0001'; end if;
  if new.photo_path is not null then
    select p.birth_date into v_birth from public.profiles p where p.id = new.user_id;
    if v_birth is not null and date_part('year', age(current_date, v_birth))::int < 18 then
      raise exception 'FOTO_MENOR_18' using errcode = 'P0001';
    end if;
  end if;
  if new.consent_photo and new.consent_at is null then
    new.consent_at := now();
  end if;
  return new;
end $$;

create trigger patient_intakes_guard before insert or update on public.patient_intakes
  for each row execute function public.patient_intake_guard();

-- ============ Solicitudes de atención ============
create table public.care_requests (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  nutritionist_id uuid references public.profiles(id) on delete set null,
  status text not null default 'abierta' check (status in ('abierta', 'aceptada', 'finalizada', 'cancelada')),
  message text check (char_length(message) <= 500),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  closed_at timestamptz
);

-- Un paciente tiene como mucho una solicitud activa (abierta o aceptada).
create unique index care_requests_one_active_idx on public.care_requests(patient_id)
  where status in ('abierta', 'aceptada');
create index care_requests_status_idx on public.care_requests(status, created_at);

create or replace function public.is_my_patient(p_patient uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.care_requests c
     where c.patient_id = p_patient and c.nutritionist_id = auth.uid() and c.status = 'aceptada')
$$;

alter table public.care_requests enable row level security;
create policy care_requests_read on public.care_requests for select to authenticated
  using (patient_id = auth.uid() or public.is_admin()
         or (public.is_staff() and (status = 'abierta' or nutritionist_id = auth.uid())));

-- Ficha: dueño, admin y el nutricionista de su solicitud aceptada.
alter table public.patient_intakes enable row level security;
create policy patient_intakes_read on public.patient_intakes for select to authenticated
  using (user_id = auth.uid() or public.is_admin() or public.is_my_patient(user_id));
create policy patient_intakes_insert on public.patient_intakes for insert to authenticated
  with check (user_id = auth.uid());
create policy patient_intakes_update on public.patient_intakes for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy patient_intakes_delete on public.patient_intakes for delete to authenticated
  using (user_id = auth.uid());

-- Paciente pide atención. Requiere fase 2, rol usuario, ficha y ninguna solicitud activa.
create or replace function public.request_care(p_message text) returns public.care_requests
language plpgsql security definer set search_path = public as $$
declare
  v_row public.care_requests;
begin
  if auth.uid() is null then raise exception 'SIN_SESION' using errcode = '42501'; end if;
  if not public.phase_on(2) then raise exception 'FASE_NO_ACTIVA' using errcode = 'P0001'; end if;
  if public.my_role() is distinct from 'usuario' then raise exception 'NO_PERMITIDO' using errcode = '42501'; end if;
  if not exists (select 1 from public.patient_intakes i where i.user_id = auth.uid()) then
    raise exception 'FALTA_FICHA' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.care_requests c
              where c.patient_id = auth.uid() and c.status in ('abierta', 'aceptada')) then
    raise exception 'YA_TIENES_SOLICITUD' using errcode = 'P0001';
  end if;
  begin
    insert into public.care_requests (patient_id, message)
    values (auth.uid(), nullif(trim(p_message), ''))
    returning * into v_row;
  exception when unique_violation then
    raise exception 'YA_TIENES_SOLICITUD' using errcode = 'P0001';
  end;
  return v_row;
end $$;

-- Paciente cancela su solicitud activa.
create or replace function public.cancel_care_request(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.care_requests c set status = 'cancelada', closed_at = now()
   where c.id = p_id and c.patient_id = auth.uid() and c.status in ('abierta', 'aceptada');
  if not found then raise exception 'NO_EXISTE' using errcode = 'P0001'; end if;
end $$;

-- Nutricionista toma una solicitud abierta (S4 lo cambiará para exigir suscripción).
create or replace function public.accept_care_request(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'SOLO_NUTRICIONISTA' using errcode = '42501'; end if;
  if not public.phase_on(2) then raise exception 'FASE_NO_ACTIVA' using errcode = 'P0001'; end if;
  update public.care_requests c
     set status = 'aceptada', nutritionist_id = auth.uid(), accepted_at = now()
   where c.id = p_id and c.status = 'abierta';
  if not found then raise exception 'YA_TOMADA' using errcode = 'P0001'; end if;
end $$;

-- Nutricionista asignado (o admin) cierra el acompañamiento.
create or replace function public.finish_care_request(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.care_requests c set status = 'finalizada', closed_at = now()
   where c.id = p_id and c.status = 'aceptada'
     and (c.nutritionist_id = auth.uid() or public.is_admin());
  if not found then raise exception 'NO_EXISTE' using errcode = 'P0001'; end if;
end $$;

-- La solicitud activa más reciente del paciente que llama; null si no hay.
create or replace function public.my_care_request() returns json
language sql stable security definer set search_path = public as $$
  select (select json_build_object(
            'id', c.id,
            'status', c.status,
            'message', c.message,
            'created_at', c.created_at,
            'accepted_at', c.accepted_at,
            'nutritionist_id', c.nutritionist_id,
            'nutritionist_name', n.full_name)
            from public.care_requests c
            left join public.profiles n on n.id = c.nutritionist_id
           where c.patient_id = auth.uid() and c.status in ('abierta', 'aceptada')
           order by c.created_at desc
           limit 1)
$$;

-- Datos del nutricionista asignado a mi solicitud aceptada; null si no hay.
create or replace function public.my_nutritionist() returns json
language sql stable security definer set search_path = public as $$
  select (select json_build_object('id', n.id, 'full_name', n.full_name)
            from public.care_requests c
            join public.profiles n on n.id = c.nutritionist_id
           where c.patient_id = auth.uid() and c.status = 'aceptada'
           limit 1)
$$;

-- Solicitudes abiertas para el staff, la más antigua primero.
create or replace function public.list_open_care_requests()
returns table (id uuid, patient_id uuid, status text, message text, created_at timestamptz,
               patient_name text, patient_age int, patient_sex text, patient_goal text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'SOLO_NUTRICIONISTA' using errcode = '42501'; end if;
  return query
    select c.id, c.patient_id, c.status, c.message, c.created_at,
           p.full_name,
           date_part('year', age(current_date, p.birth_date))::int,
           p.sex,
           coalesce(i.goal, p.goal)
      from public.care_requests c
      join public.profiles p on p.id = c.patient_id
      left join public.patient_intakes i on i.user_id = c.patient_id
     where c.status = 'abierta'
     order by c.created_at asc;
end $$;

-- Pacientes con solicitud aceptada conmigo (admin: todas). S1: avance en 0 (S3 lo reemplaza).
create or replace function public.list_my_patients()
returns table (patient_id uuid, full_name text, age int, sex text, request_id uuid, accepted_at timestamptz,
               days_total int, days_done int, last_followup_date date)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'SOLO_NUTRICIONISTA' using errcode = '42501'; end if;
  return query
    select c.patient_id,
           p.full_name,
           date_part('year', age(current_date, p.birth_date))::int,
           p.sex,
           c.id,
           c.accepted_at,
           0::int,
           0::int,
           null::date
      from public.care_requests c
      join public.profiles p on p.id = c.patient_id
     where c.status = 'aceptada' and (c.nutritionist_id = auth.uid() or public.is_admin())
     order by c.accepted_at asc;
end $$;

-- Marcador de calificaciones (S4 lo reemplaza).
create or replace function public.rating_summary(p_target_type text, p_target_id text) returns json
language sql stable set search_path = public as $$
  select json_build_object('average', null, 'count', 0)
$$;

-- ============ Perfiles: el staff ya no ve todos; solo el dueño, admin y su paciente ============
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin() or public.is_my_patient(id));

-- ============ Fotos del cuerpo: dueño, admin y el nutricionista de su solicitud aceptada ============
drop policy if exists body_photos_read on storage.objects;
create policy body_photos_read on storage.objects for select to authenticated
  using (bucket_id = 'body-photos' and (
           (storage.foldername(name))[1] = auth.uid()::text
           or public.is_admin()
           or (case when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                    then public.is_my_patient(((storage.foldername(name))[1])::uuid)
                    else false end)));

drop policy if exists body_photos_update on storage.objects;
create policy body_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'body-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'body-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============ Permisos de ejecución ============
revoke all on function public.phase_on(int) from public, anon;
grant execute on function public.phase_on(int) to authenticated;

revoke all on function public.get_public_settings() from public;
grant execute on function public.get_public_settings() to anon, authenticated;

revoke all on function public.admin_set_settings(bool, bool, bool, int) from public, anon;
grant execute on function public.admin_set_settings(bool, bool, bool, int) to authenticated;

revoke all on function public.is_my_patient(uuid) from public, anon;
grant execute on function public.is_my_patient(uuid) to authenticated;

revoke all on function public.patient_intake_guard() from public, anon, authenticated;

revoke all on function public.request_care(text) from public, anon;
grant execute on function public.request_care(text) to authenticated;

revoke all on function public.cancel_care_request(uuid) from public, anon;
grant execute on function public.cancel_care_request(uuid) to authenticated;

revoke all on function public.accept_care_request(uuid) from public, anon;
grant execute on function public.accept_care_request(uuid) to authenticated;

revoke all on function public.finish_care_request(uuid) from public, anon;
grant execute on function public.finish_care_request(uuid) to authenticated;

revoke all on function public.my_care_request() from public, anon;
grant execute on function public.my_care_request() to authenticated;

revoke all on function public.my_nutritionist() from public, anon;
grant execute on function public.my_nutritionist() to authenticated;

revoke all on function public.list_open_care_requests() from public, anon;
grant execute on function public.list_open_care_requests() to authenticated;

revoke all on function public.list_my_patients() from public, anon;
grant execute on function public.list_my_patients() to authenticated;

revoke all on function public.rating_summary(text, text) from public;
grant execute on function public.rating_summary(text, text) to anon, authenticated;

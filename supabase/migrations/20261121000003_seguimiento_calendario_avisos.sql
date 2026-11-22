-- Migración 3: seguimiento del nutricionista, calendario del plan, avisos.
-- Fuente de nombres: docs/superpowers/plans/2026-11-21-db-contrato.md (Migración 3).

-- ============ Seguimientos (fase 2) ============
create table public.followups (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  nutritionist_id uuid not null default auth.uid() references public.profiles(id),
  followup_date date not null default current_date,
  weight_kg numeric(5,1) check (weight_kg between 25 and 350),
  waist_cm numeric(5,1) check (waist_cm between 40 and 250),
  observations text not null check (char_length(observations) between 2 and 2000),
  recommendations text not null check (char_length(recommendations) between 2 and 2000),
  created_at timestamptz not null default now()
);
create index followups_patient_idx on public.followups(patient_id, followup_date desc);

create or replace function public.followups_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.phase_on(2) then raise exception 'FASE_NO_ACTIVA' using errcode = 'P0001'; end if;
  if not (public.is_admin() or public.is_my_patient(new.patient_id)) then
    raise exception 'NO_ES_TU_PACIENTE' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger followups_guard before insert or update on public.followups
  for each row execute function public.followups_guard();

alter table public.followups enable row level security;
-- Lectura: paciente, nutricionista autor, admin y el nutricionista asignado.
create policy followups_read on public.followups for select to authenticated
  using (patient_id = auth.uid() or nutritionist_id = auth.uid()
         or public.is_admin() or public.is_my_patient(patient_id));
create policy followups_insert on public.followups for insert to authenticated
  with check (nutritionist_id = auth.uid());
create policy followups_delete on public.followups for delete to authenticated
  using (nutritionist_id = auth.uid());

-- ============ Calendario del plan (fase 2) ============
create table public.plan_days (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  nutritionist_id uuid not null default auth.uid() references public.profiles(id),
  day date not null,
  title text not null check (char_length(title) between 2 and 120),
  meals text check (char_length(meals) <= 2000),
  exercise text check (char_length(exercise) <= 2000),
  notes text check (char_length(notes) <= 1000),
  done_at timestamptz,
  patient_note text check (char_length(patient_note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (patient_id, day)
);

create trigger plan_days_touch before update on public.plan_days
  for each row execute function public.touch_updated_at();

create or replace function public.plan_days_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.phase_on(2) then raise exception 'FASE_NO_ACTIVA' using errcode = 'P0001'; end if;
  -- Quien escribe no es el paciente: debe ser su nutricionista o admin.
  if auth.uid() is not null and auth.uid() <> new.patient_id
     and not (public.is_admin() or public.is_my_patient(new.patient_id)) then
    raise exception 'NO_ES_TU_PACIENTE' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger plan_days_guard before insert or update on public.plan_days
  for each row execute function public.plan_days_guard();

alter table public.plan_days enable row level security;
create policy plan_days_read on public.plan_days for select to authenticated
  using (patient_id = auth.uid() or public.is_my_patient(patient_id) or public.is_admin());
create policy plan_days_insert on public.plan_days for insert to authenticated
  with check (public.is_my_patient(patient_id) or public.is_admin());
create policy plan_days_update on public.plan_days for update to authenticated
  using (public.is_my_patient(patient_id) or public.is_admin())
  with check (public.is_my_patient(patient_id) or public.is_admin());
create policy plan_days_delete on public.plan_days for delete to authenticated
  using (public.is_my_patient(patient_id) or public.is_admin());

-- El paciente marca (o desmarca) un día cumplido y deja una nota. Solo toca done_at y patient_note.
create or replace function public.set_plan_day_done(p_id uuid, p_done bool, p_note text)
returns public.plan_days
language plpgsql security definer set search_path = public as $$
declare
  v_row public.plan_days;
begin
  update public.plan_days d
     set done_at = case when p_done then coalesce(d.done_at, now()) else null end,
         patient_note = p_note
   where d.id = p_id and d.patient_id = auth.uid()
  returning * into v_row;
  if not found then raise exception 'NO_EXISTE' using errcode = 'P0001'; end if;
  return v_row;
end $$;

-- Copia la semana p_from..p_from+6 a p_to.. (sin done_at ni patient_note). Devuelve cuántos días copió.
create or replace function public.copy_plan_week(p_patient uuid, p_from date, p_to date)
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  if not (public.is_admin() or public.is_my_patient(p_patient)) then
    raise exception 'NO_ES_TU_PACIENTE' using errcode = '42501';
  end if;
  if not public.phase_on(2) then raise exception 'FASE_NO_ACTIVA' using errcode = 'P0001'; end if;
  with src as (
    select d.* from public.plan_days d
     where d.patient_id = p_patient and d.day >= p_from and d.day <= p_from + 6
  ),
  ins as (
    insert into public.plan_days (patient_id, nutritionist_id, day, title, meals, exercise, notes)
    select p_patient, coalesce(auth.uid(), s.nutritionist_id), s.day + (p_to - p_from),
           s.title, s.meals, s.exercise, s.notes
      from src s
    on conflict (patient_id, day) do update
      set title = excluded.title, meals = excluded.meals,
          exercise = excluded.exercise, notes = excluded.notes
    returning 1
  )
  select count(*)::int into v_count from ins;
  return v_count;
end $$;

-- Pacientes con solicitud aceptada conmigo (admin: todas), con avance real del calendario y último seguimiento.
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
           (select count(*)::int from public.plan_days d where d.patient_id = c.patient_id),
           (select count(*)::int from public.plan_days d
             where d.patient_id = c.patient_id and d.done_at is not null),
           (select max(f.followup_date) from public.followups f where f.patient_id = c.patient_id)
      from public.care_requests c
      join public.profiles p on p.id = c.patient_id
     where c.status = 'aceptada' and (c.nutritionist_id = auth.uid() or public.is_admin())
     order by c.accepted_at asc;
end $$;

-- ============ Avisos ============
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);

alter table public.notifications enable row level security;
-- Cada usuario ve, marca y borra solo sus avisos. Nadie inserta directo: solo notify().
create policy notifications_read on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete on public.notifications for delete to authenticated
  using (user_id = auth.uid());

-- Solo la usan los triggers: sin grant a clientes.
create or replace function public.notify(p_user uuid, p_kind text, p_title text, p_body text, p_link text)
returns void
language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, kind, title, body, link)
  values (p_user, p_kind, p_title, p_body, p_link)
$$;
revoke execute on function public.notify(uuid, text, text, text, text) from public, anon, authenticated;

create or replace function public.mark_all_notifications_read() returns void
language sql security definer set search_path = public as $$
  update public.notifications set read_at = now()
   where user_id = auth.uid() and read_at is null
$$;

-- Solicitud nueva: avisa a todo el staff.
create or replace function public.notify_care_request_created() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r record;
begin
  for r in select p.id from public.profiles p where p.role in ('nutricionista', 'admin') loop
    perform public.notify(r.id, 'solicitud_nueva', 'Nueva solicitud de atención',
                          'Hay un paciente esperando atención.', '/nutri/solicitudes');
  end loop;
  return null;
end $$;

create trigger care_requests_notify_created after insert on public.care_requests
  for each row execute function public.notify_care_request_created();

-- Solicitud aceptada: avisa al paciente.
create or replace function public.notify_care_request_accepted() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'aceptada' and old.status is distinct from 'aceptada' then
    perform public.notify(new.patient_id, 'solicitud_aceptada', 'Un nutricionista aceptó tu solicitud',
                          null, '/mi-panel?tab=nutricionista');
  end if;
  return null;
end $$;

create trigger care_requests_notify_accepted after update on public.care_requests
  for each row execute function public.notify_care_request_accepted();

-- Días nuevos: avisa al paciente, sin repetir si ya hay un aviso sin leer de la última hora.
create or replace function public.notify_plan_day_created() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.notifications n
     where n.user_id = new.patient_id and n.kind = 'dia_nuevo'
       and n.read_at is null and n.created_at > now() - interval '1 hour'
  ) then
    perform public.notify(new.patient_id, 'dia_nuevo', 'Tu nutricionista agregó días a tu plan',
                          null, '/mi-panel?tab=calendario');
  end if;
  return null;
end $$;

create trigger plan_days_notify_created after insert on public.plan_days
  for each row execute function public.notify_plan_day_created();

-- Día cumplido: avisa al nutricionista que lo creó.
create or replace function public.notify_plan_day_done() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_name text;
begin
  if new.done_at is not null and old.done_at is null then
    select nullif(trim(p.full_name), '') into v_name from public.profiles p where p.id = new.patient_id;
    perform public.notify(new.nutritionist_id, 'dia_cumplido',
                          coalesce(v_name, 'Tu paciente') || ' cumplió el día ' || to_char(new.day, 'DD/MM'),
                          null, '/nutri/pacientes/' || new.patient_id::text);
  end if;
  return null;
end $$;

create trigger plan_days_notify_done after update on public.plan_days
  for each row execute function public.notify_plan_day_done();

-- Seguimiento nuevo: avisa al paciente.
create or replace function public.notify_followup_created() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.notify(new.patient_id, 'seguimiento_nuevo', 'Nuevo seguimiento de tu nutricionista',
                        null, '/mi-panel?tab=nutricionista');
  return null;
end $$;

create trigger followups_notify_created after insert on public.followups
  for each row execute function public.notify_followup_created();

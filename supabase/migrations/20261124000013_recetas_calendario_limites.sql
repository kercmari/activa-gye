-- Migración 13 (S13): recetas que llenan el calendario, límite diario de registros de la nutricionista,
-- agregar paciente (cupo y semana 1 en borrador) y saldo de recetas.
-- Fuente: docs/superpowers/specs/2026-11-24-recetas-planes-suscripcion.md (§2.3–2.6) y el plan del mismo nombre (Migración 13).
-- Las migraciones 1–12 no se tocan: aquí se redefinen funciones copiando su cuerpo vigente y cambiando solo lo pedido.

-- ============ Recetas ============
create table public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  nutritionist_id uuid not null default auth.uid() references public.profiles(id),
  kind text not null check (kind in ('dieta', 'rutina', 'recomendacion')),
  title text not null check (char_length(title) between 2 and 120),
  body text not null default '' check (char_length(body) <= 4000),
  status text not null default 'borrador' check (status in ('borrador', 'entregada')),
  counts_against_patient bool not null default false,
  delivered_at timestamptz,
  -- true cuando el sistema la crea (Semana 1 de nutri_add_patient): no cuenta para el límite diario.
  auto_creado bool not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index prescriptions_patient_idx on public.prescriptions(patient_id, status);
create trigger prescriptions_touch before update on public.prescriptions
  for each row execute function public.touch_updated_at();

alter table public.prescriptions enable row level security;
create policy prescriptions_read on public.prescriptions for select to authenticated
  using ((patient_id = auth.uid() and status = 'entregada') or public.is_my_patient(patient_id) or public.is_admin());
-- Sin escritura directa: solo por RPC.
revoke all on public.prescriptions from anon, authenticated;
grant select on public.prescriptions to authenticated;

-- ============ Calendario: cada día pertenece a una receta ============
alter table public.plan_days
  add column prescription_id uuid null references public.prescriptions(id) on delete cascade,
  add column auto_creado bool not null default false;
create index plan_days_prescription_idx on public.plan_days(prescription_id);

-- Estado de una receta (security definer: lo usan las políticas sin exponer la tabla).
create or replace function public.recipe_status(p_id uuid) returns text
language sql stable security definer set search_path = public as $$
  select r.status from public.prescriptions r where r.id = p_id
$$;
revoke all on function public.recipe_status(uuid) from public, anon;
grant execute on function public.recipe_status(uuid) to authenticated;

-- Filas nuevas: sin receta, RECETA_REQUERIDA; receta de otro paciente o no borrador, RECETA_CERRADA;
-- día ya ocupado, DIA_OCUPADO. Editar sin cambiar receta ni día no pasa por aquí.
create or replace function public.plan_days_receta_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_rx public.prescriptions;
begin
  if tg_op = 'UPDATE'
     and new.prescription_id is not distinct from old.prescription_id
     and new.patient_id = old.patient_id and new.day = old.day then
    return new;
  end if;
  if new.prescription_id is null then raise exception 'RECETA_REQUERIDA' using errcode = 'P0001'; end if;
  select * into v_rx from public.prescriptions r where r.id = new.prescription_id;
  if not found or v_rx.patient_id <> new.patient_id or v_rx.status <> 'borrador' then
    raise exception 'RECETA_CERRADA' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.plan_days d
              where d.patient_id = new.patient_id and d.day = new.day and d.id <> new.id) then
    raise exception 'DIA_OCUPADO' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function public.plan_days_receta_guard() from public, anon;
grant execute on function public.plan_days_receta_guard() to authenticated;

create trigger plan_days_receta_guard before insert or update on public.plan_days
  for each row execute function public.plan_days_receta_guard();

-- Políticas: solo se editan o borran días de recetas en borrador (o filas viejas sin receta).
drop policy if exists plan_days_update on public.plan_days;
create policy plan_days_update on public.plan_days for update to authenticated
  using ((public.is_my_patient(patient_id) or public.is_admin())
         and (prescription_id is null or public.recipe_status(prescription_id) = 'borrador'))
  with check ((public.is_my_patient(patient_id) or public.is_admin())
         and (prescription_id is null or public.recipe_status(prescription_id) = 'borrador'));
drop policy if exists plan_days_delete on public.plan_days;
create policy plan_days_delete on public.plan_days for delete to authenticated
  using ((public.is_my_patient(patient_id) or public.is_admin())
         and (prescription_id is null or public.recipe_status(prescription_id) = 'borrador'));

-- Lectura del paciente (diseño §2.4): días de una receta entregada aunque la suscripción venza;
-- días sin receta solo con suscripción activa (datos anteriores).
drop policy if exists plan_days_read on public.plan_days;
create policy plan_days_read on public.plan_days for select to authenticated
  using ((patient_id = auth.uid()
          and ((prescription_id is not null and public.recipe_status(prescription_id) = 'entregada')
               or (prescription_id is null and public.patient_subscription_active(auth.uid()))))
         or public.is_my_patient(patient_id) or public.is_admin());

-- El paciente marca (o desmarca) un día cumplido. Sigue la misma regla de lectura.
create or replace function public.set_plan_day_done(p_id uuid, p_done bool, p_note text)
returns public.plan_days
language plpgsql security definer set search_path = public as $$
declare
  v_row public.plan_days;
begin
  select * into v_row from public.plan_days d where d.id = p_id and d.patient_id = auth.uid();
  if not found then raise exception 'NO_EXISTE' using errcode = 'P0001'; end if;
  if v_row.prescription_id is not null then
    if public.recipe_status(v_row.prescription_id) <> 'entregada' then
      raise exception 'NO_EXISTE' using errcode = 'P0001';
    end if;
  elsif not public.patient_subscription_active(auth.uid()) then
    raise exception 'SIN_SUSCRIPCION' using errcode = 'P0001';
  end if;
  update public.plan_days d
     set done_at = case when p_done then coalesce(d.done_at, now()) else null end,
         patient_note = p_note
   where d.id = p_id
  returning * into v_row;
  return v_row;
end $$;

-- ============ Límite diario de registros de la nutricionista ============
-- Registros de hoy (día de Guayaquil) creados por la nutricionista, sin los que creó el sistema.
-- Volatile a propósito: cada llamada ve las filas insertadas antes en la misma sentencia.
create or replace function public.nutri_records_today(p_user uuid) returns int
language sql security definer set search_path = public as $$
  select (
    (select count(*) from public.plan_days d
      where d.nutritionist_id = p_user and not d.auto_creado
        and (d.created_at at time zone 'America/Guayaquil')::date = public.gye_today())
    + (select count(*) from public.prescriptions r
        where r.nutritionist_id = p_user and not r.auto_creado
          and (r.created_at at time zone 'America/Guayaquil')::date = public.gye_today())
  )::int
$$;
revoke all on function public.nutri_records_today(uuid) from public, anon;
grant execute on function public.nutri_records_today(uuid) to authenticated;

-- Antes de cada alta en plan_days o prescriptions: LIMITE_DIARIO si se llegó al límite del plan vigente
-- (o al gratis). La administradora no tiene límite. El sistema (flag de sesión) no cuenta.
create or replace function public.registro_diario_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_limit int;
begin
  if coalesce(current_setting('activa.registro_automatico', true), '') = 'on' then
    new.auto_creado := true;
    return new;
  end if;
  if v_uid is null or public.is_admin() or not public.is_staff() then return new; end if;
  v_limit := public.nutri_daily_limit(v_uid);
  if v_limit is null then return new; end if;
  if public.nutri_records_today(v_uid) >= v_limit then
    raise exception 'LIMITE_DIARIO' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function public.registro_diario_guard() from public, anon;
grant execute on function public.registro_diario_guard() to authenticated;

create trigger plan_days_registro_guard before insert on public.plan_days
  for each row execute function public.registro_diario_guard();
create trigger prescriptions_registro_guard before insert on public.prescriptions
  for each row execute function public.registro_diario_guard();

-- Solo las solicitudes abiertas avisan a las nutricionistas. Una aceptada al agregar un paciente no.
create or replace function public.notify_care_request_created() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r record;
begin
  if new.status <> 'abierta' then return null; end if;
  for r in select p.id from public.profiles p where p.role in ('nutricionista', 'admin') loop
    perform public.notify(r.id, 'solicitud_nueva', 'Nueva solicitud de atención',
                          'Hay un paciente esperando atención.', '/nutri/solicitudes');
  end loop;
  return null;
end $$;

-- Límites en pantalla: records_today real (antes 0).
create or replace function public.nutri_limits() returns json
language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_plan text;
begin
  if v_uid is null then raise exception 'SIN_SESION' using errcode = '42501'; end if;
  if not public.is_staff() then raise exception 'SOLO_NUTRICIONISTA' using errcode = '42501'; end if;
  select pl.name into v_plan
    from public.subscriptions s join public.subscription_plans pl on pl.id = s.plan_id
   where s.nutritionist_id = v_uid and s.status = 'activa' and s.current_period_end > now()
   order by s.created_at desc limit 1;
  return json_build_object(
    'plan_name', v_plan,
    'patient_quota', public.nutri_patient_quota(v_uid),
    'daily_record_limit', public.nutri_daily_limit(v_uid),
    'patients_used', (select count(*)::int from public.care_requests c
                       where c.nutritionist_id = v_uid and c.status = 'aceptada'),
    'records_today', public.nutri_records_today(v_uid));
end $$;
revoke all on function public.nutri_limits() from public, anon;
grant execute on function public.nutri_limits() to authenticated;

-- ============ Copiar una semana (4 parámetros: dentro de una receta borrador) ============
drop function if exists public.copy_plan_week(uuid, date, date);

-- Copia los días de p_from..p_from+6 a p_to.. dentro de la receta borrador p_prescription.
-- Si algún día de destino está ocupado, DIA_OCUPADO; si el límite diario no alcanza, LIMITE_DIARIO.
-- Cualquier error deja la copia completa sin filas nuevas. Cada día se inserta en su propia sentencia
-- para que el límite diario vea los anteriores.
create or replace function public.copy_plan_week(p_patient uuid, p_from date, p_to date, p_prescription uuid)
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_rx public.prescriptions;
  v_src record;
  v_count int := 0;
begin
  if not (public.is_admin() or public.is_my_patient(p_patient)) then
    raise exception 'NO_ES_TU_PACIENTE' using errcode = '42501';
  end if;
  if not public.phase_on(2) then raise exception 'FASE_NO_ACTIVA' using errcode = 'P0001'; end if;
  select * into v_rx from public.prescriptions r where r.id = p_prescription and r.patient_id = p_patient;
  if not found then raise exception 'NO_EXISTE' using errcode = 'P0001'; end if;
  if v_rx.status <> 'borrador' then raise exception 'RECETA_CERRADA' using errcode = 'P0001'; end if;
  if exists (select 1 from public.plan_days d
               join public.plan_days t on t.patient_id = d.patient_id and t.day = d.day + (p_to - p_from)
              where d.patient_id = p_patient and d.day between p_from and p_from + 6) then
    raise exception 'DIA_OCUPADO' using errcode = 'P0001';
  end if;
  for v_src in select d.* from public.plan_days d
                where d.patient_id = p_patient and d.day between p_from and p_from + 6
                order by d.day loop
    insert into public.plan_days (patient_id, nutritionist_id, day, title, meals, exercise, notes, prescription_id)
    values (p_patient, coalesce(auth.uid(), v_src.nutritionist_id), v_src.day + (p_to - p_from),
            v_src.title, v_src.meals, v_src.exercise, v_src.notes, p_prescription);
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;
revoke all on function public.copy_plan_week(uuid, date, date, uuid) from public, anon;
grant execute on function public.copy_plan_week(uuid, date, date, uuid) to authenticated;

-- ============ Recetas: guardar, borrar y entregar ============
create or replace function public.save_prescription(p_id uuid, p_patient uuid, p_kind text, p_title text, p_body text)
returns public.prescriptions
language plpgsql security definer set search_path = public as $$
declare
  v_row public.prescriptions;
  v_title text := nullif(trim(coalesce(p_title, '')), '');
begin
  if not public.is_staff() then raise exception 'SOLO_NUTRICIONISTA' using errcode = '42501'; end if;
  if not public.phase_on(2) then raise exception 'FASE_NO_ACTIVA' using errcode = 'P0001'; end if;
  if not (public.is_admin() or public.is_my_patient(p_patient)) then
    raise exception 'NO_ES_TU_PACIENTE' using errcode = '42501';
  end if;
  if p_kind not in ('dieta', 'rutina', 'recomendacion')
     or char_length(coalesce(v_title, '')) not between 2 and 120
     or char_length(coalesce(p_body, '')) > 4000 then
    raise exception 'DATOS_INVALIDOS' using errcode = 'P0001';
  end if;
  if p_id is null then
    insert into public.prescriptions (patient_id, nutritionist_id, kind, title, body)
    values (p_patient, auth.uid(), p_kind, v_title, coalesce(p_body, ''))
    returning * into v_row;
  else
    update public.prescriptions r
       set kind = p_kind, title = v_title, body = coalesce(p_body, '')
     where r.id = p_id and r.patient_id = p_patient and r.status = 'borrador'
    returning * into v_row;
    if not found then
      if exists (select 1 from public.prescriptions r where r.id = p_id) then
        raise exception 'RECETA_CERRADA' using errcode = 'P0001';
      end if;
      raise exception 'NO_EXISTE' using errcode = 'P0001';
    end if;
  end if;
  return v_row;
end $$;
revoke all on function public.save_prescription(uuid, uuid, text, text, text) from public, anon;
grant execute on function public.save_prescription(uuid, uuid, text, text, text) to authenticated;

create or replace function public.delete_prescription(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_rx public.prescriptions;
begin
  if not public.is_staff() then raise exception 'SOLO_NUTRICIONISTA' using errcode = '42501'; end if;
  select * into v_rx from public.prescriptions r where r.id = p_id;
  if not found then raise exception 'NO_EXISTE' using errcode = 'P0001'; end if;
  if not (public.is_admin() or public.is_my_patient(v_rx.patient_id)) then
    raise exception 'NO_ES_TU_PACIENTE' using errcode = '42501';
  end if;
  if v_rx.status <> 'borrador' then raise exception 'RECETA_CERRADA' using errcode = 'P0001'; end if;
  delete from public.prescriptions r where r.id = p_id;
end $$;
revoke all on function public.delete_prescription(uuid) from public, anon;
grant execute on function public.delete_prescription(uuid) to authenticated;

-- Entregar: bloquea la receta (for update) para que no se descuente dos veces. Pacientes de plataforma
-- descuentan 1 del saldo de su suscripción activa; los propios no descuentan.
create or replace function public.deliver_prescription(p_id uuid) returns public.prescriptions
language plpgsql security definer set search_path = public as $$
declare
  v_rx public.prescriptions;
  v_sub public.patient_subscriptions;
  v_origin text;
  v_counts bool := false;
begin
  if not public.is_staff() then raise exception 'SOLO_NUTRICIONISTA' using errcode = '42501'; end if;
  if not public.phase_on(2) then raise exception 'FASE_NO_ACTIVA' using errcode = 'P0001'; end if;
  select * into v_rx from public.prescriptions r where r.id = p_id for update;
  if not found then raise exception 'NO_EXISTE' using errcode = 'P0001'; end if;
  if not (public.is_admin() or public.is_my_patient(v_rx.patient_id)) then
    raise exception 'NO_ES_TU_PACIENTE' using errcode = '42501';
  end if;
  if v_rx.status <> 'borrador' then raise exception 'RECETA_CERRADA' using errcode = 'P0001'; end if;

  select c.origin into v_origin from public.care_requests c
   where c.patient_id = v_rx.patient_id and c.status = 'aceptada'
   order by c.accepted_at desc nulls last limit 1;
  if coalesce(v_origin, 'plataforma') = 'plataforma' then
    if not public.patient_subscription_active(v_rx.patient_id) then
      raise exception 'SIN_SUSCRIPCION_PACIENTE' using errcode = 'P0001';
    end if;
    select * into v_sub from public.patient_subscriptions s
     where s.patient_id = v_rx.patient_id and s.status = 'activa' and s.current_period_end > now()
     order by s.created_at desc limit 1
       for update;
    if v_sub.recipes_left <= 0 then raise exception 'SIN_RECETAS' using errcode = 'P0001'; end if;
    update public.patient_subscriptions s set recipes_left = s.recipes_left - 1 where s.id = v_sub.id;
    v_counts := true;
  end if;

  update public.prescriptions r
     set status = 'entregada', delivered_at = now(), counts_against_patient = v_counts
   where r.id = p_id
  returning * into v_rx;
  perform public.notify(v_rx.patient_id, 'receta_nueva', 'Tienes una receta nueva',
                        'Tu nutricionista te envió una receta: ' || v_rx.title, '/mi-panel?tab=calendario');
  return v_rx;
end $$;
revoke all on function public.deliver_prescription(uuid) from public, anon;
grant execute on function public.deliver_prescription(uuid) to authenticated;

-- Saldo de recetas: {left, quota, period_end}. Lo ven el paciente, su nutricionista y la administradora.
create or replace function public.patient_recipe_balance(p_patient uuid default auth.uid()) returns json
language plpgsql stable security definer set search_path = public as $$
declare
  v_left int;
  v_quota int;
  v_end timestamptz;
begin
  if auth.uid() is null then raise exception 'SIN_SESION' using errcode = '42501'; end if;
  if not (p_patient = auth.uid() or public.is_admin() or public.is_my_patient(p_patient)) then
    raise exception 'NO_ES_TU_PACIENTE' using errcode = '42501';
  end if;
  select s.recipes_left, coalesce(pl.recipe_quota, 0), s.current_period_end into v_left, v_quota, v_end
    from public.patient_subscriptions s join public.subscription_plans pl on pl.id = s.plan_id
   where s.patient_id = p_patient and s.status = 'activa' and s.current_period_end > now()
   order by s.created_at desc limit 1;
  return json_build_object('left', coalesce(v_left, 0), 'quota', coalesce(v_quota, 0), 'period_end', v_end);
end $$;
revoke all on function public.patient_recipe_balance(uuid) from public, anon;
grant execute on function public.patient_recipe_balance(uuid) to authenticated;

-- ============ Agregar paciente (nutricionista) ============
-- Crea la atención aceptada (origen propio), una receta «Semana 1» en borrador con 7 días desde el primer
-- hueco a partir de mañana. Los días salen de la plantilla que elegiría assign_trial según la ficha;
-- sin ficha (o sin plantilla) quedan vacíos con título «Día N».
create or replace function public.nutri_add_patient(p_email text) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(trim(coalesce(p_email, '')));
  v_patient public.profiles;
  v_intake public.patient_intakes;
  v_tpl_id uuid;
  v_quota int;
  v_used int;
  v_age int;
  v_bmi numeric;
  v_rx uuid;
  v_start date := public.gye_today() + 1;
begin
  if v_uid is null then raise exception 'SIN_SESION' using errcode = '42501'; end if;
  if not public.is_staff() then raise exception 'SOLO_NUTRICIONISTA' using errcode = '42501'; end if;
  if not public.phase_on(2) then raise exception 'FASE_NO_ACTIVA' using errcode = 'P0001'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'DATOS_INVALIDOS' using errcode = 'P0001'; end if;

  select p.* into v_patient from public.profiles p join auth.users u on u.id = p.id
   where lower(u.email) = v_email and p.role = 'usuario';
  if not found then raise exception 'PACIENTE_NO_REGISTRADO' using errcode = 'P0001'; end if;
  if exists (select 1 from public.care_requests c
              where c.patient_id = v_patient.id and c.status in ('abierta', 'aceptada')) then
    raise exception 'PACIENTE_OCUPADO' using errcode = 'P0001';
  end if;

  -- Cupo: mismo bloqueo que accept_care_request (fila de la suscripción o candado por nutricionista).
  if not public.is_admin() then
    if public.subscription_active(v_uid) then
      select p.patient_quota into v_quota
        from public.subscriptions s join public.subscription_plans p on p.id = s.plan_id
       where s.nutritionist_id = v_uid and s.status = 'activa' and s.current_period_end > now()
       order by s.created_at desc limit 1
         for update of s;
    else
      perform pg_advisory_xact_lock(hashtext(v_uid::text));
      v_quota := public.nutri_patient_quota(v_uid);
    end if;
    select count(*)::int into v_used from public.care_requests c
     where c.nutritionist_id = v_uid and c.status = 'aceptada';
    if v_used >= v_quota then raise exception 'CUPO_PLAN_LLENO' using errcode = 'P0001'; end if;
  end if;

  insert into public.care_requests (patient_id, nutritionist_id, status, origin, accepted_at)
  values (v_patient.id, v_uid, 'aceptada', 'propio', now());

  -- Lo que sigue lo crea el sistema: no cuenta para el límite diario.
  perform set_config('activa.registro_automatico', 'on', true);

  -- Plantilla según la ficha (misma búsqueda que assign_trial, sin el bloqueo de atención por nutricionista).
  select * into v_intake from public.patient_intakes i where i.user_id = v_patient.id;
  if found then
    v_age := case when v_patient.birth_date is null then 30
                  else date_part('year', age(public.gye_today(), v_patient.birth_date))::int end;
    v_bmi := v_intake.weight_kg / ((v_intake.height_cm / 100.0) ^ 2);
    select t.id into v_tpl_id from public.plan_templates t
     where not t.is_fallback
       and (t.sex = 'cualquiera' or t.sex = v_patient.sex)
       and v_age between t.age_min and t.age_max
       and v_bmi >= t.bmi_min and v_bmi < t.bmi_max
       and (t.goal is null or t.goal = v_intake.goal)
       and exists (select 1 from public.plan_template_items i where i.template_id = t.id)
     order by (t.status = 'aprobada') desc,
              (t.goal is not null) desc,
              (t.sex <> 'cualquiera') desc,
              (t.bmi_max - t.bmi_min) asc,
              t.name asc
     limit 1;
    if v_tpl_id is null then
      select t.id into v_tpl_id from public.plan_templates t
       where t.is_fallback
         and exists (select 1 from public.plan_template_items i where i.template_id = t.id);
    end if;
  end if;

  insert into public.prescriptions (patient_id, nutritionist_id, kind, title, body, status)
  values (v_patient.id, v_uid, 'dieta', 'Semana 1',
          'Primera semana de tu plan. Tu nutricionista la irá ajustando.', 'borrador')
  returning id into v_rx;

  -- Primer hueco de 7 días a partir de mañana.
  while exists (select 1 from public.plan_days d
                 where d.patient_id = v_patient.id and d.day between v_start and v_start + 6) loop
    v_start := v_start + 1;
    if v_start > public.gye_today() + 800 then raise exception 'SIN_HUECO' using errcode = 'P0001'; end if;
  end loop;

  insert into public.plan_days (patient_id, nutritionist_id, day, title, meals, exercise, notes, prescription_id)
  select v_patient.id, v_uid, v_start + (n - 1), 'Día ' || n,
         (select string_agg(to_char(i.at_time, 'HH24:MI') || ' ' || i.title
                            || coalesce(' · ' || i.detail, ''), E'\n' order by i.at_time, i.sort)
            from public.plan_template_items i
           where i.template_id = v_tpl_id and i.day_number = n and i.kind = 'comida'),
         (select string_agg(to_char(i.at_time, 'HH24:MI') || ' ' || i.title
                            || coalesce(' · ' || i.detail, ''), E'\n' order by i.at_time, i.sort)
            from public.plan_template_items i
           where i.template_id = v_tpl_id and i.day_number = n and i.kind = 'rutina'),
         (select string_agg(to_char(i.at_time, 'HH24:MI') || ' ' || i.title
                            || coalesce(' · ' || i.detail, ''), E'\n' order by i.at_time, i.sort)
            from public.plan_template_items i
           where i.template_id = v_tpl_id and i.day_number = n and i.kind = 'habito'),
         v_rx
    from generate_series(1, 7) as n;

  perform set_config('activa.registro_automatico', 'off', true);
  return json_build_object('patient_id', v_patient.id, 'prescription_id', v_rx);
end $$;
revoke all on function public.nutri_add_patient(text) from public, anon;
grant execute on function public.nutri_add_patient(text) to authenticated;

-- ============ Listas y tablero ============
-- Pacientes con solicitud aceptada conmigo (admin: todas). Suma origen y saldo de recetas (plataforma).
drop function if exists public.list_my_patients();
create function public.list_my_patients()
returns table (patient_id uuid, full_name text, age int, sex text, request_id uuid, accepted_at timestamptz,
               days_total int, days_done int, last_followup_date date, origin text, recipes_left int)
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
           (select max(f.followup_date) from public.followups f where f.patient_id = c.patient_id),
           c.origin,
           case when c.origin = 'plataforma' then
             coalesce((select s.recipes_left from public.patient_subscriptions s
                        where s.patient_id = c.patient_id and s.status = 'activa' and s.current_period_end > now()
                        order by s.created_at desc limit 1), 0)
           end
      from public.care_requests c
      join public.profiles p on p.id = c.patient_id
     where c.status = 'aceptada' and (c.nutritionist_id = auth.uid() or public.is_admin())
     order by c.accepted_at asc;
end $$;
revoke all on function public.list_my_patients() from public, anon;
grant execute on function public.list_my_patients() to authenticated;

-- Tablero: + límites (records_today real) y recetas entregadas esta semana (Guayaquil, lunes a domingo).
create or replace function public.nutri_dashboard() returns json
language plpgsql stable security definer set search_path = public as $$
declare
  v_monday date;
  v_total int;
  v_done int;
begin
  if not public.is_staff() then raise exception 'SOLO_NUTRICIONISTA' using errcode = '42501'; end if;
  v_monday := date_trunc('week', (now() at time zone 'America/Guayaquil'))::date;
  select count(*)::int, count(d.done_at)::int into v_total, v_done
    from public.plan_days d
   where d.nutritionist_id = auth.uid() and d.day between v_monday and v_monday + 6;

  return json_build_object(
    'open_requests', (select count(*)::int from public.care_requests c where c.status = 'abierta'),
    'my_patients', (select count(*)::int from public.care_requests c
                     where c.status = 'aceptada' and c.nutritionist_id = auth.uid()),
    'week_days_total', v_total,
    'week_days_done', v_done,
    'pending_invoices', (select count(*)::int from public.invoices i
                          where i.payee_id = auth.uid() and i.status in ('pendiente', 'reportada')),
    'subscription', public.my_subscription(),
    'limits', public.nutri_limits(),
    'recipes_week', (select count(*)::int from public.prescriptions p
                      where p.nutritionist_id = auth.uid() and p.status = 'entregada'
                        and (p.delivered_at at time zone 'America/Guayaquil')::date between v_monday and v_monday + 6));
end $$;
revoke all on function public.nutri_dashboard() from public, anon;
grant execute on function public.nutri_dashboard() to authenticated;

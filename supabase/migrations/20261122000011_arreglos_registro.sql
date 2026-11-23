-- Arreglos de RE5 (XR6): la solicitud de nutricionista pendiente no entra por la puerta de paciente.
-- Hallazgo BLOCKING de RE5: elegir «Soy nutricionista» con el cupo lleno dejaba una cuenta pendiente que
-- guardaba su ficha, recibía la semana gratis y no contaba como paciente.
-- Cambios: (a) ficha, semana gratis y pedir atención responden SOLICITUD_EN_REVISION si la cuenta está pendiente;
-- (b) un nutricionista rechazado cuenta como paciente (handle_new_user y get_public_settings).
-- Las funciones se copian de sus versiones vigentes (migraciones 2, 8 y 10) con solo esos cambios.

create or replace function public.nutri_en_revision(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = p_user and p.nutri_status = 'pendiente')
$$;
revoke all on function public.nutri_en_revision(uuid) from public, anon;
grant execute on function public.nutri_en_revision(uuid) to authenticated;

-- ============ (a) Ficha: copia de patient_intake_guard (migración 2) ============
create or replace function public.patient_intake_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_birth date;
begin
  if not public.phase_on(1) then raise exception 'FASE_NO_ACTIVA' using errcode = 'P0001'; end if;
  if public.nutri_en_revision(new.user_id) then raise exception 'SOLICITUD_EN_REVISION' using errcode = 'P0001'; end if;
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

-- ============ (a) Semana gratis: copia de assign_trial (migración 8) ============
create or replace function public.assign_trial() returns public.trials
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_row public.trials;
  v_intake public.patient_intakes;
  v_profile public.profiles;
  v_tpl public.plan_templates;
  v_age int;
  v_bmi numeric;
  v_bmr numeric;
  v_mult numeric;
  v_adj int;
  v_kcal int;
  v_factor numeric;
begin
  if v_uid is null then raise exception 'SIN_SESION' using errcode = '42501'; end if;
  if not public.phase_on(1) then raise exception 'FASE_NO_ACTIVA' using errcode = 'P0001'; end if;
  if public.nutri_en_revision(v_uid) then raise exception 'SOLICITUD_EN_REVISION' using errcode = 'P0001'; end if;

  select * into v_row from public.trials t where t.user_id = v_uid;
  if found then return v_row; end if;

  select * into v_intake from public.patient_intakes i where i.user_id = v_uid;
  if not found then raise exception 'FALTA_FICHA' using errcode = 'P0001'; end if;
  if cardinality(v_intake.conditions) > 0
     or nullif(trim(coalesce(v_intake.health_notes, '')), '') is not null then
    raise exception 'REQUIERE_NUTRICIONISTA' using errcode = 'P0001';
  end if;

  select * into v_profile from public.profiles p where p.id = v_uid;
  v_age := case when v_profile.birth_date is null then 30
                else date_part('year', age(public.gye_today(), v_profile.birth_date))::int end;
  v_bmi := v_intake.weight_kg / ((v_intake.height_cm / 100.0) ^ 2);

  -- Candidatas: sexo, edad, IMC y objetivo encajan, y la plantilla tiene ítems.
  select t.* into v_tpl from public.plan_templates t
   where not t.is_fallback
     and (t.sex = 'cualquiera' or t.sex = v_profile.sex)
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
  if not found then
    select * into v_tpl from public.plan_templates t
     where t.is_fallback
       and exists (select 1 from public.plan_template_items i where i.template_id = t.id);
    if not found then raise exception 'SIN_PLANTILLA' using errcode = 'P0001'; end if;
  end if;

  -- Calorías (Mifflin-St Jeor).
  v_bmr := 10 * v_intake.weight_kg + 6.25 * v_intake.height_cm - 5 * v_age
         + case v_profile.sex when 'masculino' then 5 when 'femenino' then -161 else -78 end;
  v_mult := case coalesce(v_intake.activity_level, v_profile.activity_level)
              when 'sedentario' then 1.2
              when 'ligero' then 1.375
              when 'moderado' then 1.55
              when 'intenso' then 1.725
              else 1.375 end;
  v_adj := case v_intake.goal when 'bajar_peso' then -400 when 'ganar_musculo' then 300 else 0 end;
  v_kcal := round(greatest(1200, least(4000, v_bmr * v_mult + v_adj)) / 50.0)::int * 50;
  v_factor := greatest(0.6, least(1.6, round(v_kcal::numeric / v_tpl.kcal_base, 2)));

  insert into public.trials (user_id, template_id, template_name, template_status, author_name,
                             kcal_target, portion_factor, started_on)
  values (v_uid, v_tpl.id, v_tpl.name, v_tpl.status, v_tpl.author_name,
          v_kcal, v_factor, public.gye_today())
  returning * into v_row;

  insert into public.trial_days (user_id, day_number, unlocked_on)
  select v_uid, d, case when d = 1 then public.gye_today() else null end
    from generate_series(1, 7) d;

  insert into public.trial_items (user_id, day_number, at_time, kind, title, detail, sort)
  select v_uid, i.day_number, i.at_time, i.kind, i.title, i.detail, i.sort
    from public.plan_template_items i
   where i.template_id = v_tpl.id;

  return v_row;
end $$;

-- ============ (a) Pedir atención: copia de request_care (migración 2) ============
create or replace function public.request_care(p_message text) returns public.care_requests
language plpgsql security definer set search_path = public as $$
declare
  v_row public.care_requests;
begin
  if auth.uid() is null then raise exception 'SIN_SESION' using errcode = '42501'; end if;
  if not public.phase_on(2) then raise exception 'FASE_NO_ACTIVA' using errcode = 'P0001'; end if;
  if public.nutri_en_revision(auth.uid()) then raise exception 'SOLICITUD_EN_REVISION' using errcode = 'P0001'; end if;
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

-- ============ (b) Cupo: un nutricionista rechazado cuenta como paciente ============
-- Copia de handle_new_user (migración 10); solo cambia el conteo del cupo.
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
     and (select count(*) from public.profiles
           where role = 'usuario' and (requested_role is null or nutri_status = 'rechazado'))
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

-- ============ (b) Conteo público: mismo criterio que el cupo ============
-- Copia de get_public_settings (migración 10); solo cambia patients_count.
create or replace function public.get_public_settings() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'phase1', s.phase1,
    'phase2', s.phase2,
    'phase3', s.phase3,
    'patient_limit', s.patient_limit,
    'patients_count', (select count(*) from public.profiles p
                        where p.role = 'usuario' and (p.requested_role is null or p.nutri_status = 'rechazado')))
  from public.app_settings s where s.id = 1
$$;

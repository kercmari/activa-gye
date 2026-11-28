-- Semana gratis para todos: assign_trial ya no responde REQUIERE_NUTRICIONISTA
-- cuando la ficha tiene condiciones de salud o notas; el plan se genera siempre.
CREATE OR REPLACE FUNCTION public.assign_trial()
 RETURNS trials
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  -- Siempre hay semana gratis, también con condiciones de salud (la nutricionista es opcional).

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
end $function$;

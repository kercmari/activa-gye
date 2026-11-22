-- Ronda 2 (XT2): renovar una suscripción de paciente vencida (H1) y condiciones en texto libre (H6).
-- Redefine funciones de la migración 6 sin tocarla: copias de sus cuerpos con los cambios marcados.

-- H6: assign_trial también responde REQUIERE_NUTRICIONISTA cuando health_notes (texto libre) tiene texto.
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

-- H1: el paciente elige el plan mensual; una suscripción activa cuyo período ya terminó pasa a 'vencida'
-- antes de cualquier insert, para que no choque con el índice de suscripción abierta.
create or replace function public.choose_patient_plan(p_plan uuid) returns public.invoices
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_plan public.subscription_plans;
  v_sub uuid;
  v_row public.invoices;
begin
  if v_uid is null then raise exception 'SIN_SESION' using errcode = '42501'; end if;
  if not public.phase_on(2) then raise exception 'FASE_NO_ACTIVA' using errcode = 'P0001'; end if;
  select * into v_plan from public.subscription_plans p
   where p.id = p_plan and p.active and p.audience = 'paciente';
  if not found then raise exception 'NO_EXISTE' using errcode = 'P0001'; end if;
  if public.patient_subscription_active(v_uid) then
    raise exception 'YA_TIENES_SUSCRIPCION' using errcode = 'P0001';
  end if;

  -- Una suscripción activa cuyo período terminó queda vencida (y no bloquea la renovación).
  update public.patient_subscriptions s set status = 'vencida'
   where s.patient_id = v_uid and s.status = 'activa' and s.current_period_end <= now();

  -- Si había una elección pendiente, se anula junto con su factura.
  update public.invoices i set status = 'anulada'
   where i.payer_id = v_uid and i.kind = 'suscripcion_paciente' and i.status in ('pendiente', 'reportada')
     and i.patient_subscription_id in (select s.id from public.patient_subscriptions s
                                        where s.patient_id = v_uid and s.status = 'pendiente');
  update public.patient_subscriptions s set status = 'cancelada'
   where s.patient_id = v_uid and s.status = 'pendiente';

  insert into public.patient_subscriptions (patient_id, plan_id, status)
  values (v_uid, v_plan.id, 'pendiente')
  returning id into v_sub;

  insert into public.invoices (payer_id, payee_id, kind, patient_subscription_id, concept, amount)
  values (v_uid, null, 'suscripcion_paciente', v_sub,
          v_plan.name || ' – 1 mes', v_plan.monthly_price)
  returning * into v_row;
  return v_row;
end $$;
revoke all on function public.choose_patient_plan(uuid) from public, anon;
grant execute on function public.choose_patient_plan(uuid) to authenticated;

-- H1: la suscripción activa cuyo período terminó se muestra como 'vencida' (mismas columnas y orden).
create or replace function public.my_patient_subscription()
returns table (id uuid, plan_id uuid, plan_name text, monthly_price numeric,
               status text, current_period_end timestamptz, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select s.id, s.plan_id, p.name, p.monthly_price,
         case when s.status = 'activa' and s.current_period_end <= now() then 'vencida'
              else s.status end as status,
         s.current_period_end, s.created_at
    from public.patient_subscriptions s
    join public.subscription_plans p on p.id = s.plan_id
   where s.patient_id = auth.uid() and s.status <> 'cancelada'
   order by s.created_at desc
   limit 1
$$;
revoke all on function public.my_patient_subscription() from public, anon;
grant execute on function public.my_patient_subscription() to authenticated;

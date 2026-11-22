-- Migración 6: semana gratis (plantillas, días que se abren con el progreso), chequeo diario,
-- suscripción del paciente y guía pública.
-- Fuente de nombres y reglas: docs/superpowers/plans/2026-11-21-db-contrato-semana.md (Migración 6).

-- ============ 6.1 Hora local ============
create or replace function public.gye_today() returns date
language sql stable as $$ select (now() at time zone 'America/Guayaquil')::date $$;
grant execute on function public.gye_today() to anon, authenticated;

-- ============ 6.2 Ficha: columnas nuevas ============
alter table public.patient_intakes
  add column allergies text check (char_length(allergies) <= 300),
  add column conditions text[] not null default '{}'
    check (conditions <@ array['diabetes','hipertension','embarazo','renal','otra']::text[]);

-- ============ 6.3 Plantillas (las define la nutricionista) ============
create table public.plan_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  description text check (char_length(description) <= 500),
  sex text not null default 'cualquiera' check (sex in ('cualquiera','femenino','masculino')),
  age_min int not null default 18 check (age_min between 0 and 120),
  age_max int not null default 120 check (age_max between 0 and 120),
  bmi_min numeric(4,1) not null default 0,
  bmi_max numeric(4,1) not null default 99,
  goal text check (goal in ('bajar_peso','ganar_musculo','mantener','resistencia','bienestar')), -- null = cualquiera
  kcal_base int not null default 2000 check (kcal_base between 1200 and 4000),
  author_name text not null default 'Pendiente de revisión' check (char_length(author_name) between 2 and 120),
  status text not null default 'borrador' check (status in ('borrador','aprobada')),
  is_fallback bool not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (age_min <= age_max), check (bmi_min < bmi_max)
);
create unique index plan_templates_one_fallback on public.plan_templates((true)) where is_fallback;
create trigger plan_templates_touch before update on public.plan_templates
  for each row execute function public.touch_updated_at();

create table public.plan_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.plan_templates(id) on delete cascade,
  day_number int not null check (day_number between 1 and 7),
  at_time time not null,
  kind text not null check (kind in ('comida','rutina','habito')),
  title text not null check (char_length(title) between 2 and 120),
  detail text check (char_length(detail) <= 1000),
  sort int not null default 0
);
create index plan_template_items_tpl on public.plan_template_items(template_id, day_number, at_time);

-- Los pacientes nunca leen plantillas: verían los días cerrados.
alter table public.plan_templates enable row level security;
create policy plan_templates_staff_read on public.plan_templates for select to authenticated
  using (public.is_staff());
create policy plan_templates_staff_write on public.plan_templates for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

alter table public.plan_template_items enable row level security;
create policy plan_template_items_staff_read on public.plan_template_items for select to authenticated
  using (public.is_staff());
create policy plan_template_items_staff_write on public.plan_template_items for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ============ 6.4 Semana del paciente ============
create table public.trials (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  template_id uuid references public.plan_templates(id) on delete set null,
  template_name text not null,
  template_status text not null,            -- copia: 'borrador' | 'aprobada'
  author_name text not null,
  kcal_target int not null,
  portion_factor numeric(3,2) not null,
  started_on date not null default public.gye_today(),
  created_at timestamptz not null default now()
);
create table public.trial_days (
  user_id uuid not null references public.trials(user_id) on delete cascade,
  day_number int not null check (day_number between 1 and 7),
  unlocked_on date,            -- null = cerrado; > gye_today() = se abre ese día
  completed_at timestamptz,
  primary key (user_id, day_number)
);
create table public.trial_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.trials(user_id) on delete cascade,
  day_number int not null check (day_number between 1 and 7),
  at_time time not null,
  kind text not null check (kind in ('comida','rutina','habito')),
  title text not null,
  detail text,
  sort int not null default 0,
  done_at timestamptz
);
create index trial_items_user_day on public.trial_items(user_id, day_number, at_time);

-- Día abierto para el usuario: desbloqueado y con fecha ya llegada (hora de Guayaquil).
-- Interna: la usan las RPC (sin grant a clientes). La política RLS de trial_items repite la misma
-- condición en línea, porque una política evalúa con los privilegios del cliente.
create or replace function public.trial_day_open(p_user uuid, p_day int) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.trial_days d
     where d.user_id = p_user and d.day_number = p_day
       and d.unlocked_on is not null and d.unlocked_on <= public.gye_today())
$$;
revoke all on function public.trial_day_open(uuid, int) from public, anon, authenticated;

alter table public.trials enable row level security;
create policy trials_read on public.trials for select to authenticated
  using (user_id = auth.uid() or public.is_my_patient(user_id) or public.is_admin());

alter table public.trial_days enable row level security;
create policy trial_days_read on public.trial_days for select to authenticated
  using (user_id = auth.uid() or public.is_my_patient(user_id) or public.is_admin());

alter table public.trial_items enable row level security;
create policy trial_items_read on public.trial_items for select to authenticated
  using (
    (user_id = auth.uid() and exists (
       select 1 from public.trial_days d
        where d.user_id = trial_items.user_id and d.day_number = trial_items.day_number
          and d.unlocked_on is not null and d.unlocked_on <= public.gye_today()))
    or public.is_my_patient(user_id) or public.is_admin());
-- Sin políticas de escritura: todo por RPC.

-- ============ 6.5 Chequeo diario ============
create table public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  checkin_date date not null default public.gye_today(),
  mood int not null check (mood between 1 and 5),
  weight_kg numeric(5,1) check (weight_kg between 25 and 350),
  water_glasses int check (water_glasses between 0 and 20),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  unique (user_id, checkin_date)
);

alter table public.daily_checkins enable row level security;
create policy daily_checkins_read on public.daily_checkins for select to authenticated
  using (user_id = auth.uid() or public.is_my_patient(user_id) or public.is_admin());
-- Sin escritura directa: solo save_checkin().

-- ============ 6.6 Funciones de la semana ============

-- Interna (sin grant): completa el día actual cuando se cumplen las dos condiciones.
create or replace function public.trial_evaluate(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_day public.trial_days;
  v_total int;
  v_done int;
begin
  select d.* into v_day from public.trial_days d
   where d.user_id = p_user and d.completed_at is null
     and d.unlocked_on is not null and d.unlocked_on <= public.gye_today()
   order by d.day_number limit 1;
  if not found then return; end if;

  select count(*), count(i.done_at) into v_total, v_done
    from public.trial_items i
   where i.user_id = p_user and i.day_number = v_day.day_number;

  -- Al menos la mitad (redondeo hacia arriba); con 0 ítems cuenta como cumplido.
  if v_done < ceil(v_total / 2.0) then return; end if;
  if not exists (
    select 1 from public.daily_checkins c
     where c.user_id = p_user and c.checkin_date >= v_day.unlocked_on) then
    return;
  end if;

  update public.trial_days d set completed_at = now()
   where d.user_id = p_user and d.day_number = v_day.day_number;

  if v_day.day_number < 7 then
    update public.trial_days d set unlocked_on = public.gye_today() + 1
     where d.user_id = p_user and d.day_number = v_day.day_number + 1 and d.unlocked_on is null;
  else
    perform public.notify(p_user, 'semana_completada', '¡Semana completada!',
                          'Suscríbete para seguir con tu nutricionista.', '/mi-plan/suscripcion');
  end if;
end $$;
revoke all on function public.trial_evaluate(uuid) from public, anon, authenticated;

-- Asigna la semana gratis según la ficha (§3.1 del diseño). Idempotente.
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
  if cardinality(v_intake.conditions) > 0 then
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

-- Vista de la semana. p_user null = el usuario actual; otro usuario solo nutricionista asignada o admin.
create or replace function public.my_trial(p_user uuid default null) returns json
language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_target uuid := coalesce(p_user, auth.uid());
  v_self boolean;
  v_t public.trials;
  v_today date := public.gye_today();
  v_days json;
  v_current int;
  v_finished boolean;
begin
  if v_target is null then raise exception 'SIN_SESION' using errcode = '42501'; end if;
  v_self := v_target is not distinct from v_uid;
  if not v_self and not (public.is_my_patient(v_target) or public.is_admin()) then
    raise exception 'NO_ES_TU_PACIENTE' using errcode = '42501';
  end if;

  select * into v_t from public.trials t where t.user_id = v_target;
  if not found then return null; end if;

  -- El paciente ve los ítems solo de los días abiertos; nutricionista y admin, todos.
  select coalesce(json_agg(day_json order by dn), '[]'::json) into v_days from (
    select d.day_number as dn, json_build_object(
      'day_number', d.day_number,
      'unlocked', coalesce(d.unlocked_on <= v_today, false),
      'unlocked_on', d.unlocked_on,
      'completed_at', d.completed_at,
      'items_total', (select count(*) from public.trial_items i
                       where i.user_id = v_target and i.day_number = d.day_number),
      'items_done', (select count(i.done_at) from public.trial_items i
                      where i.user_id = v_target and i.day_number = d.day_number),
      'items', case when not v_self or coalesce(d.unlocked_on <= v_today, false) then
                 (select coalesce(json_agg(json_build_object(
                           'id', i.id,
                           'at_time', to_char(i.at_time, 'HH24:MI'),
                           'kind', i.kind,
                           'title', i.title,
                           'detail', i.detail,
                           'done', i.done_at is not null)
                         order by i.at_time, i.sort), '[]'::json)
                    from public.trial_items i
                   where i.user_id = v_target and i.day_number = d.day_number)
               else '[]'::json end
    ) as day_json
      from public.trial_days d
     where d.user_id = v_target
  ) x;

  select min(d.day_number) into v_current from public.trial_days d
   where d.user_id = v_target and d.completed_at is null
     and d.unlocked_on is not null and d.unlocked_on <= v_today;
  select exists (select 1 from public.trial_days d
                  where d.user_id = v_target and d.day_number = 7 and d.completed_at is not null)
    into v_finished;

  return json_build_object(
    'template_name', v_t.template_name,
    'template_status', v_t.template_status,
    'author_name', v_t.author_name,
    'kcal_target', v_t.kcal_target,
    'portion_factor', v_t.portion_factor,
    'started_on', v_t.started_on,
    'today', v_today,
    'current_day', v_current,
    'finished', v_finished,
    'days', v_days);
end $$;

-- El paciente marca o desmarca un ítem de un día abierto.
create or replace function public.set_trial_item_done(p_id uuid, p_done bool) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_item public.trial_items;
begin
  if v_uid is null then raise exception 'SIN_SESION' using errcode = '42501'; end if;
  select i.* into v_item from public.trial_items i
   where i.id = p_id and i.user_id = v_uid and public.trial_day_open(v_uid, i.day_number);
  if not found then raise exception 'NO_EXISTE' using errcode = 'P0001'; end if;

  update public.trial_items i
     set done_at = case when p_done then coalesce(i.done_at, now()) else null end
   where i.id = p_id;

  perform public.trial_evaluate(v_uid);
  return public.my_trial();
end $$;

-- Chequeo del día: una fila por día (upsert). Puede completar el día actual.
create or replace function public.save_checkin(p_mood int, p_weight numeric, p_water int, p_note text)
returns public.daily_checkins
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_row public.daily_checkins;
begin
  if v_uid is null then raise exception 'SIN_SESION' using errcode = '42501'; end if;
  if p_mood is null or p_mood not between 1 and 5 then
    raise exception 'DATOS_INVALIDOS' using errcode = 'P0001';
  end if;

  insert into public.daily_checkins (user_id, checkin_date, mood, weight_kg, water_glasses, note)
  values (v_uid, public.gye_today(), p_mood, p_weight, p_water, nullif(trim(p_note), ''))
  on conflict (user_id, checkin_date) do update
    set mood = excluded.mood,
        weight_kg = excluded.weight_kg,
        water_glasses = excluded.water_glasses,
        note = excluded.note
  returning * into v_row;

  perform public.trial_evaluate(v_uid);
  return v_row;
end $$;

revoke all on function public.assign_trial() from public, anon;
grant execute on function public.assign_trial() to authenticated;
revoke all on function public.my_trial(uuid) from public, anon;
grant execute on function public.my_trial(uuid) to authenticated;
revoke all on function public.set_trial_item_done(uuid, bool) from public, anon;
grant execute on function public.set_trial_item_done(uuid, bool) to authenticated;
revoke all on function public.save_checkin(int, numeric, int, text) from public, anon;
grant execute on function public.save_checkin(int, numeric, int, text) to authenticated;

-- ============ 6.7 Suscripción del paciente ============
alter table public.subscription_plans
  add column audience text not null default 'nutricionista' check (audience in ('nutricionista','paciente'));
insert into public.subscription_plans (name, monthly_price, patient_quota, sort, audience)
  values ('Seguimiento mensual', 15.00, 1, 10, 'paciente') on conflict (name) do nothing;

create table public.patient_subscriptions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  status text not null default 'pendiente' check (status in ('pendiente','activa','vencida','cancelada')),
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);
create unique index patient_subscriptions_one_open on public.patient_subscriptions(patient_id)
  where status in ('pendiente','activa');

alter table public.patient_subscriptions enable row level security;
create policy patient_subscriptions_read on public.patient_subscriptions for select to authenticated
  using (patient_id = auth.uid() or public.is_admin() or public.is_my_patient(patient_id));
-- Sin escritura directa: solo por RPC.

do $$
declare c record;
begin
  for c in select conname from pg_constraint
            where conrelid = 'public.invoices'::regclass and contype = 'c'
              and pg_get_constraintdef(oid) ilike '%kind%' loop
    execute format('alter table public.invoices drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.invoices add constraint invoices_kind_check
  check (kind in ('suscripcion','consulta','suscripcion_paciente'));
alter table public.invoices add column patient_subscription_id uuid
  references public.patient_subscriptions(id) on delete set null;

-- Activa si hay una suscripción de paciente vigente.
create or replace function public.patient_subscription_active(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.patient_subscriptions s
     where s.patient_id = p_user and s.status = 'activa' and s.current_period_end > now())
$$;
revoke all on function public.patient_subscription_active(uuid) from public, anon;
grant execute on function public.patient_subscription_active(uuid) to authenticated;

-- El paciente elige el plan mensual: suscripción pendiente + factura que cobra la plataforma.
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

-- Suscripción más reciente del paciente que no esté cancelada (o ninguna fila).
create or replace function public.my_patient_subscription()
returns table (id uuid, plan_id uuid, plan_name text, monthly_price numeric,
               status text, current_period_end timestamptz, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select s.id, s.plan_id, p.name, p.monthly_price, s.status, s.current_period_end, s.created_at
    from public.patient_subscriptions s
    join public.subscription_plans p on p.id = s.plan_id
   where s.patient_id = auth.uid() and s.status <> 'cancelada'
   order by s.created_at desc
   limit 1
$$;
revoke all on function public.my_patient_subscription() from public, anon;
grant execute on function public.my_patient_subscription() to authenticated;

-- Cuerpo de la migración 4 conservado; se agrega la rama de la suscripción del paciente.
create or replace function public.mark_invoice_paid(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_inv public.invoices;
begin
  if auth.uid() is null then raise exception 'SIN_SESION' using errcode = '42501'; end if;
  select * into v_inv from public.invoices i where i.id = p_id for update;
  if not found then raise exception 'NO_EXISTE' using errcode = 'P0001'; end if;
  if not (public.is_admin() or (v_inv.payee_id is not null and v_inv.payee_id = auth.uid())) then
    raise exception 'NO_PERMITIDO' using errcode = '42501';
  end if;
  if v_inv.status not in ('pendiente', 'reportada') then
    raise exception 'ESTADO_INVALIDO' using errcode = 'P0001';
  end if;

  update public.invoices i set status = 'pagada', paid_at = now() where i.id = p_id;

  if v_inv.kind = 'suscripcion' and v_inv.subscription_id is not null then
    update public.subscriptions s
       set status = 'activa',
           current_period_end = greatest(now(), coalesce(s.current_period_end, now())) + interval '30 days'
     where s.id = v_inv.subscription_id;
  end if;

  if v_inv.kind = 'suscripcion_paciente' and v_inv.patient_subscription_id is not null then
    update public.patient_subscriptions s
       set status = 'activa',
           current_period_end = greatest(now(), coalesce(s.current_period_end, now())) + interval '30 days'
     where s.id = v_inv.patient_subscription_id;
    -- Solicitud de atención para que una nutricionista la tome (si no hay una abierta o aceptada).
    if not exists (select 1 from public.care_requests c
                    where c.patient_id = v_inv.payer_id and c.status in ('abierta', 'aceptada')) then
      insert into public.care_requests (patient_id, status, message)
      values (v_inv.payer_id, 'abierta', 'Suscripción activa: continuar después de la semana gratis');
    end if;
  end if;
end $$;

-- Cuerpo de la migración 4 conservado; se agrega la anulación de la suscripción del paciente.
create or replace function public.cancel_invoice(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_inv public.invoices;
begin
  if auth.uid() is null then raise exception 'SIN_SESION' using errcode = '42501'; end if;
  select * into v_inv from public.invoices i where i.id = p_id for update;
  if not found then raise exception 'NO_EXISTE' using errcode = 'P0001'; end if;
  if not (public.is_admin() or (v_inv.payee_id is not null and v_inv.payee_id = auth.uid())) then
    raise exception 'NO_PERMITIDO' using errcode = '42501';
  end if;
  if v_inv.status = 'pagada' then raise exception 'ESTADO_INVALIDO' using errcode = 'P0001'; end if;
  if v_inv.status = 'anulada' then return; end if;

  update public.invoices i set status = 'anulada' where i.id = p_id;
  if v_inv.subscription_id is not null then
    update public.subscriptions s set status = 'cancelada'
     where s.id = v_inv.subscription_id and s.status = 'pendiente';
  end if;
  if v_inv.patient_subscription_id is not null then
    update public.patient_subscriptions s set status = 'cancelada'
     where s.id = v_inv.patient_subscription_id and s.status = 'pendiente';
  end if;
end $$;

-- ============ 6.8 Agenda pagada: lectura del paciente ============
drop policy if exists plan_days_read on public.plan_days;
create policy plan_days_read on public.plan_days for select to authenticated
  using ((patient_id = auth.uid() and public.patient_subscription_active(auth.uid()))
         or public.is_my_patient(patient_id) or public.is_admin());

-- Cuerpo de la migración 3 conservado; se exige suscripción activa del paciente.
create or replace function public.set_plan_day_done(p_id uuid, p_done bool, p_note text)
returns public.plan_days
language plpgsql security definer set search_path = public as $$
declare
  v_row public.plan_days;
begin
  if not public.patient_subscription_active(auth.uid()) then
    raise exception 'SIN_SUSCRIPCION' using errcode = 'P0001';
  end if;
  update public.plan_days d
     set done_at = case when p_done then coalesce(d.done_at, now()) else null end,
         patient_note = p_note
   where d.id = p_id and d.patient_id = auth.uid()
  returning * into v_row;
  if not found then raise exception 'NO_EXISTE' using errcode = 'P0001'; end if;
  return v_row;
end $$;

-- ============ 6.9 Guía ============
create table public.guide_entries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  category text not null check (category in ('hidratacion','porciones','antes_entrenar','despues_entrenar','comer_fuera','descanso','compras')),
  title text not null check (char_length(title) between 2 and 120),
  summary text check (char_length(summary) <= 300),
  objective text check (char_length(objective) <= 600),
  do_items text[] not null default '{}',
  avoid_items text[] not null default '{}',
  steps text[] not null default '{}',
  source text check (char_length(source) <= 200),
  published bool not null default true,
  sort int not null default 0,
  updated_at timestamptz not null default now()
);
create trigger guide_entries_touch before update on public.guide_entries
  for each row execute function public.touch_updated_at();

alter table public.guide_entries enable row level security;
create policy guide_entries_read on public.guide_entries for select to anon, authenticated
  using (published or public.is_staff());
create policy guide_entries_insert on public.guide_entries for insert to authenticated
  with check (public.is_staff());
create policy guide_entries_update on public.guide_entries for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy guide_entries_delete on public.guide_entries for delete to authenticated
  using (public.is_staff());

-- Migración 12 (S12): planes con límites, cupo gratis de la nutricionista, correo de la administradora,
-- suscripciones que se pueden mejorar y renovar, y saldo de recetas del paciente.
-- Fuente: docs/superpowers/specs/2026-11-24-recetas-planes-suscripcion.md y el plan del mismo nombre (Migración 12).
-- Las migraciones 1–11 no se tocan: aquí se redefinen funciones copiando su cuerpo vigente y cambiando solo lo pedido.

-- ============ Configuración: correo de la administradora y cupo gratis ============
alter table public.app_settings
  add column admin_email text not null default 'kerlyeliz19@gmail.com'
    check (admin_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  add column free_patient_limit int not null default 3 check (free_patient_limit > 0),
  add column free_daily_record_limit int not null default 10 check (free_daily_record_limit > 0);

-- Copia de get_public_settings (migración 11); suma el correo y los límites gratis.
create or replace function public.get_public_settings() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'phase1', s.phase1,
    'phase2', s.phase2,
    'phase3', s.phase3,
    'patient_limit', s.patient_limit,
    'patients_count', (select count(*) from public.profiles p
                        where p.role = 'usuario' and (p.requested_role is null or p.nutri_status = 'rechazado')),
    'admin_email', s.admin_email,
    'free_patient_limit', s.free_patient_limit,
    'free_daily_record_limit', s.free_daily_record_limit)
  from public.app_settings s where s.id = 1
$$;
revoke all on function public.get_public_settings() from public;
grant execute on function public.get_public_settings() to anon, authenticated;

create or replace function public.admin_set_contact_settings(p_admin_email text, p_free_patient_limit int,
                                                             p_free_daily_record_limit int)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(trim(coalesce(p_admin_email, '')));
begin
  if not public.is_admin() then raise exception 'SOLO_ADMIN' using errcode = '42501'; end if;
  if v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
     or p_free_patient_limit is null or p_free_patient_limit <= 0
     or p_free_daily_record_limit is null or p_free_daily_record_limit <= 0 then
    raise exception 'DATOS_INVALIDOS' using errcode = 'P0001';
  end if;
  update public.app_settings
     set admin_email = v_email,
         free_patient_limit = p_free_patient_limit,
         free_daily_record_limit = p_free_daily_record_limit
   where id = 1;
end $$;
revoke all on function public.admin_set_contact_settings(text, int, int) from public, anon;
grant execute on function public.admin_set_contact_settings(text, int, int) to authenticated;

-- ============ Planes: límites, recetas y textos ============
alter table public.subscription_plans
  add column daily_record_limit int null check (daily_record_limit > 0),
  add column recipe_quota int null check (recipe_quota > 0),
  add column features text[] not null default '{}';

update public.subscription_plans
   set name = 'Starter', monthly_price = 9.00, patient_quota = 15, daily_record_limit = 60, sort = 1,
       features = array['Hasta 15 pacientes activos', 'Hasta 60 registros por día',
                        'Calendario, recetas y seguimiento']
 where name = 'Básico';

update public.subscription_plans
   set name = 'Profesional', monthly_price = 19.00, patient_quota = 50, daily_record_limit = null, sort = 2,
       features = array['Hasta 50 pacientes activos', 'Registros por día sin límite',
                        'Calendario, recetas y seguimiento']
 where name = 'Pro';

update public.subscription_plans
   set monthly_price = 40.00, patient_quota = 1, recipe_quota = 10,
       features = array['10 recetas de tu nutricionista al mes',
                        'Tu calendario se llena con cada receta',
                        'Seguimiento y progreso de peso']
 where name = 'Seguimiento mensual';

-- ============ Suscripciones: saldo, origen y una activa / una pendiente por persona ============
alter table public.patient_subscriptions
  add column recipes_left int not null default 0 check (recipes_left >= 0);

alter table public.care_requests
  add column origin text not null default 'plataforma' check (origin in ('plataforma', 'propio'));

drop index if exists public.subscriptions_one_open_idx;
drop index if exists public.patient_subscriptions_one_open;
create unique index subscriptions_one_active on public.subscriptions(nutritionist_id) where status = 'activa';
create unique index subscriptions_one_pending on public.subscriptions(nutritionist_id) where status = 'pendiente';
create unique index patient_subscriptions_one_active on public.patient_subscriptions(patient_id) where status = 'activa';
create unique index patient_subscriptions_one_pending on public.patient_subscriptions(patient_id) where status = 'pendiente';

-- Límites del plan gratis y del plan vigente de la nutricionista.
create or replace function public.nutri_patient_quota(p_user uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select pl.patient_quota
       from public.subscriptions s join public.subscription_plans pl on pl.id = s.plan_id
      where s.nutritionist_id = p_user and s.status = 'activa' and s.current_period_end > now()
      order by s.created_at desc limit 1),
    (select a.free_patient_limit from public.app_settings a where a.id = 1),
    3)
$$;
revoke all on function public.nutri_patient_quota(uuid) from public, anon;
grant execute on function public.nutri_patient_quota(uuid) to authenticated;

-- Registros por día: null = sin límite (plan Profesional); sin plan vigente, el límite gratis.
create or replace function public.nutri_daily_limit(p_user uuid) returns int
language plpgsql stable security definer set search_path = public as $$
declare
  v_limit int;
begin
  if exists (select 1 from public.subscriptions s
              where s.nutritionist_id = p_user and s.status = 'activa' and s.current_period_end > now()) then
    select pl.daily_record_limit into v_limit
      from public.subscriptions s join public.subscription_plans pl on pl.id = s.plan_id
     where s.nutritionist_id = p_user and s.status = 'activa' and s.current_period_end > now()
     order by s.created_at desc limit 1;
    return v_limit;
  end if;
  select a.free_daily_record_limit into v_limit from public.app_settings a where a.id = 1;
  return coalesce(v_limit, 10);
end $$;
revoke all on function public.nutri_daily_limit(uuid) from public, anon;
grant execute on function public.nutri_daily_limit(uuid) to authenticated;

-- Límites de la nutricionista en pantalla. records_today vale 0 hasta la migración 13.
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
    'records_today', 0);
end $$;
revoke all on function public.nutri_limits() from public, anon;
grant execute on function public.nutri_limits() to authenticated;

-- Elegir plan: ya no se rechaza con una activa vigente; reemplaza la pendiente (mejora o renovación).
create or replace function public.choose_plan(p_plan uuid) returns public.invoices
language plpgsql security definer set search_path = public as $$
declare
  v_plan public.subscription_plans;
  v_sub uuid;
  v_row public.invoices;
begin
  if auth.uid() is null then raise exception 'SIN_SESION' using errcode = '42501'; end if;
  if not public.is_staff() then raise exception 'SOLO_NUTRICIONISTA' using errcode = '42501'; end if;
  if not public.phase_on(2) then raise exception 'FASE_NO_ACTIVA' using errcode = 'P0001'; end if;
  select * into v_plan from public.subscription_plans p where p.id = p_plan and p.active;
  if not found then raise exception 'NO_EXISTE' using errcode = 'P0001'; end if;

  -- Si había una elección pendiente, se cancela junto con su factura.
  update public.invoices i set status = 'anulada'
   where i.payer_id = auth.uid() and i.kind = 'suscripcion' and i.status in ('pendiente', 'reportada')
     and i.subscription_id in (select s.id from public.subscriptions s
                                where s.nutritionist_id = auth.uid() and s.status = 'pendiente');
  update public.subscriptions s set status = 'cancelada'
   where s.nutritionist_id = auth.uid() and s.status = 'pendiente';

  insert into public.subscriptions (nutritionist_id, plan_id, status)
  values (auth.uid(), v_plan.id, 'pendiente')
  returning id into v_sub;

  insert into public.invoices (payer_id, payee_id, kind, subscription_id, concept, amount)
  values (auth.uid(), null, 'suscripcion', v_sub,
          'Suscripción ' || v_plan.name || ' – 1 mes', v_plan.monthly_price)
  returning * into v_row;
  return v_row;
end $$;
revoke all on function public.choose_plan(uuid) from public, anon;
grant execute on function public.choose_plan(uuid) to authenticated;

-- El paciente elige el plan mensual: igual que antes, sin rechazar con una activa vigente.
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

  -- Una suscripción activa cuyo período terminó queda vencida.
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

-- Suscripción del paciente: la activa (si la hay) gana a una pendiente más nueva.
-- Se agrega recipes_left al final (cambia la forma de la función, por eso se borra primero).
drop function if exists public.my_patient_subscription();
create function public.my_patient_subscription()
returns table (id uuid, plan_id uuid, plan_name text, monthly_price numeric,
               status text, current_period_end timestamptz, created_at timestamptz, recipes_left int)
language sql stable security definer set search_path = public as $$
  select s.id, s.plan_id, p.name, p.monthly_price,
         case when s.status = 'activa' and s.current_period_end <= now() then 'vencida'
              else s.status end as status,
         s.current_period_end, s.created_at, s.recipes_left
    from public.patient_subscriptions s
    join public.subscription_plans p on p.id = s.plan_id
   where s.patient_id = auth.uid() and s.status <> 'cancelada'
   order by (s.status = 'activa') desc, s.created_at desc
   limit 1
$$;
revoke all on function public.my_patient_subscription() from public, anon;
grant execute on function public.my_patient_subscription() to authenticated;

-- Suscripción de la nutricionista: la activa gana a una pendiente más nueva.
create or replace function public.my_subscription() returns json
language plpgsql stable security definer set search_path = public as $$
declare
  v_sub public.subscriptions;
begin
  if auth.uid() is null then return null; end if;
  select * into v_sub from public.subscriptions s
   where s.nutritionist_id = auth.uid() and s.status <> 'cancelada'
   order by (s.status = 'activa') desc, s.created_at desc limit 1;
  if not found then return null; end if;
  return json_build_object(
    'id', v_sub.id,
    'status', case when v_sub.status = 'activa' and v_sub.current_period_end <= now()
                   then 'vencida' else v_sub.status end,
    'current_period_end', v_sub.current_period_end,
    'created_at', v_sub.created_at,
    'plan', (select json_build_object('id', p.id, 'name', p.name, 'monthly_price', p.monthly_price,
                                      'patient_quota', p.patient_quota)
               from public.subscription_plans p where p.id = v_sub.plan_id));
end $$;
revoke all on function public.my_subscription() from public, anon;
grant execute on function public.my_subscription() to authenticated;

-- Aceptar solicitud: sin suscripción usa el cupo gratis. Cuenta todas las aceptadas (de los dos orígenes).
create or replace function public.accept_care_request(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_quota int;
  v_used int;
begin
  if not public.is_staff() then raise exception 'SOLO_NUTRICIONISTA' using errcode = '42501'; end if;
  if not public.phase_on(2) then raise exception 'FASE_NO_ACTIVA' using errcode = 'P0001'; end if;
  if public.my_role() = 'nutricionista' then
    if public.subscription_active(auth.uid()) then
      -- Bloquea la suscripción vigente para que dos aceptaciones no superen el cupo.
      select p.patient_quota into v_quota
        from public.subscriptions s join public.subscription_plans p on p.id = s.plan_id
       where s.nutritionist_id = auth.uid() and s.status = 'activa' and s.current_period_end > now()
       order by s.created_at desc limit 1
         for update of s;
    else
      -- Sin suscripción: cupo gratis, con un bloqueo por nutricionista.
      perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
      v_quota := public.nutri_patient_quota(auth.uid());
    end if;
    select count(*)::int into v_used from public.care_requests c
     where c.nutritionist_id = auth.uid() and c.status = 'aceptada';
    if v_used >= v_quota then raise exception 'CUPO_PLAN_LLENO' using errcode = 'P0001'; end if;
  end if;

  update public.care_requests c
     set status = 'aceptada', nutritionist_id = auth.uid(), accepted_at = now()
   where c.id = p_id and c.status = 'abierta';
  if not found then raise exception 'YA_TOMADA' using errcode = 'P0001'; end if;
end $$;
revoke all on function public.accept_care_request(uuid) from public, anon;
grant execute on function public.accept_care_request(uuid) to authenticated;

-- Aprobar una factura de suscripción (renovación, mejora o primera vez). Una sola vez por factura.
-- Nueva fila activa: 30 días desde hoy, o desde el vencimiento si es renovación vigente del mismo plan.
-- La activa anterior pasa a cancelada. Paciente: saldo = saldo vigente anterior + recipe_quota.
create or replace function public.mark_invoice_paid(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_inv public.invoices;
  v_new_n public.subscriptions;
  v_old_n public.subscriptions;
  v_new_p public.patient_subscriptions;
  v_old_p public.patient_subscriptions;
  v_base timestamptz;
  v_saldo int;
  v_quota int;
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
    select * into v_new_n from public.subscriptions s where s.id = v_inv.subscription_id for update;
    v_base := now();
    select * into v_old_n from public.subscriptions s
     where s.nutritionist_id = v_new_n.nutritionist_id and s.status = 'activa' and s.id <> v_new_n.id
     for update;
    if found then
      if v_old_n.current_period_end > now() and v_old_n.plan_id = v_new_n.plan_id then
        v_base := v_old_n.current_period_end;   -- renovación: se suma al vencimiento actual
      end if;
      update public.subscriptions s set status = 'cancelada' where s.id = v_old_n.id;
    end if;
    update public.subscriptions s
       set status = 'activa', current_period_end = v_base + interval '30 days'
     where s.id = v_new_n.id;
  end if;

  if v_inv.kind = 'suscripcion_paciente' and v_inv.patient_subscription_id is not null then
    select * into v_new_p from public.patient_subscriptions s where s.id = v_inv.patient_subscription_id for update;
    v_base := now();
    v_saldo := 0;
    select * into v_old_p from public.patient_subscriptions s
     where s.patient_id = v_new_p.patient_id and s.status = 'activa' and s.id <> v_new_p.id
     for update;
    if found then
      if v_old_p.current_period_end > now() then
        v_saldo := v_old_p.recipes_left;        -- las recetas que quedan se conservan
        if v_old_p.plan_id = v_new_p.plan_id then
          v_base := v_old_p.current_period_end; -- renovación anticipada: se suma al vencimiento
        end if;
      end if;
      update public.patient_subscriptions s set status = 'cancelada' where s.id = v_old_p.id;
    end if;
    select coalesce(p.recipe_quota, 0) into v_quota from public.subscription_plans p where p.id = v_new_p.plan_id;
    update public.patient_subscriptions s
       set status = 'activa',
           current_period_end = v_base + interval '30 days',
           recipes_left = v_saldo + v_quota
     where s.id = v_new_p.id;
    -- Solicitud de atención para que una nutricionista la tome (si no hay una abierta o aceptada).
    if not exists (select 1 from public.care_requests c
                    where c.patient_id = v_inv.payer_id and c.status in ('abierta', 'aceptada')) then
      insert into public.care_requests (patient_id, status, message)
      values (v_inv.payer_id, 'abierta', 'Suscripción activa: continuar después de la semana gratis');
    end if;
  end if;
end $$;
revoke all on function public.mark_invoice_paid(uuid) from public, anon;
grant execute on function public.mark_invoice_paid(uuid) to authenticated;

-- ============ Admin → Suscripciones: pendientes y activas, con quién, plan, precio y vencimiento ============
create or replace function public.admin_subscriptions_overview() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'SOLO_ADMIN' using errcode = '42501'; end if;
  return (
    with todas as (
      select 'nutricionista'::text as audience, s.id, s.nutritionist_id as user_id, s.plan_id, s.status,
             s.current_period_end as period_end, s.created_at, null::int as recipes_left
        from public.subscriptions s
      union all
      select 'paciente'::text, s.id, s.patient_id, s.plan_id, s.status,
             s.current_period_end, s.created_at, s.recipes_left
        from public.patient_subscriptions s
    ), filas as (
      select t.*, pl.name as plan_name, pl.monthly_price,
             (select i.id from public.invoices i
               where i.subscription_id = t.id or i.patient_subscription_id = t.id
               order by (i.status in ('pendiente', 'reportada')) desc, i.created_at desc
               limit 1) as invoice_id,
             pr.full_name, u.email
        from todas t
        join public.subscription_plans pl on pl.id = t.plan_id
        left join public.profiles pr on pr.id = t.user_id
        left join auth.users u on u.id = t.user_id
    ), filas2 as (
      select f.*, coalesce(inv.amount, f.monthly_price) as amount
        from filas f left join public.invoices inv on inv.id = f.invoice_id
    )
    select json_build_object(
      'pending', coalesce((select json_agg(json_build_object(
                    'invoice_id', f.invoice_id, 'subscription_id', f.id, 'audience', f.audience,
                    'user_id', f.user_id, 'full_name', f.full_name, 'email', f.email,
                    'plan_name', f.plan_name, 'amount', f.amount, 'status', f.status,
                    'created_at', f.created_at, 'period_end', f.period_end, 'recipes_left', f.recipes_left)
                  order by f.created_at)
             from filas2 f
            where f.status = 'pendiente' and f.invoice_id is not null), '[]'::json),
      'active', coalesce((select json_agg(json_build_object(
                    'invoice_id', f.invoice_id, 'subscription_id', f.id, 'audience', f.audience,
                    'user_id', f.user_id, 'full_name', f.full_name, 'email', f.email,
                    'plan_name', f.plan_name, 'amount', f.amount, 'status', f.status,
                    'created_at', f.created_at, 'period_end', f.period_end, 'recipes_left', f.recipes_left)
                  order by f.period_end)
             from filas2 f
            where f.status = 'activa'), '[]'::json))
  );
end $$;
revoke all on function public.admin_subscriptions_overview() from public, anon;
grant execute on function public.admin_subscriptions_overview() to authenticated;

-- Precios iniciales de los planes ya están en la tabla; la administradora los edita con la política de subscription_plans.

-- Migración 4: planes y suscripción del nutricionista, facturas con pago manual, tablero y reseñas.
-- Fuente de nombres: docs/superpowers/plans/2026-11-21-db-contrato.md (Migración 4).

-- ============ Planes de suscripción ============
create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 60),
  monthly_price numeric(8, 2) not null check (monthly_price >= 0),
  patient_quota int not null check (patient_quota > 0),
  active bool not null default true,
  sort int not null default 0
);

insert into public.subscription_plans (name, monthly_price, patient_quota, sort) values
  ('Básico', 10.00, 10, 1),
  ('Pro', 25.00, 40, 2)
on conflict (name) do nothing;

alter table public.subscription_plans enable row level security;
create policy subscription_plans_read on public.subscription_plans for select to anon, authenticated
  using (active or public.is_admin());
create policy subscription_plans_admin on public.subscription_plans for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ============ Suscripciones del nutricionista ============
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  nutritionist_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  status text not null default 'pendiente' check (status in ('pendiente', 'activa', 'vencida', 'cancelada')),
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

-- Una suscripción abierta (pendiente o activa) por nutricionista.
create unique index subscriptions_one_open_idx on public.subscriptions(nutritionist_id)
  where status in ('pendiente', 'activa');

alter table public.subscriptions enable row level security;
-- Escritura solo por RPC (sin políticas de insert/update/delete).
create policy subscriptions_read on public.subscriptions for select to authenticated
  using (nutritionist_id = auth.uid() or public.is_admin());

-- ============ Facturas ============
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  payer_id uuid not null references public.profiles(id) on delete cascade,
  payee_id uuid references public.profiles(id) on delete set null,   -- null = plataforma
  kind text not null check (kind in ('suscripcion', 'consulta')),
  subscription_id uuid references public.subscriptions(id) on delete set null,
  concept text not null check (char_length(concept) between 2 and 200),
  amount numeric(10, 2) not null check (amount > 0),
  status text not null default 'pendiente' check (status in ('pendiente', 'reportada', 'pagada', 'anulada')),
  payment_reference text check (char_length(payment_reference) <= 100),
  reported_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index invoices_payer_idx on public.invoices(payer_id, created_at desc);
create index invoices_payee_idx on public.invoices(payee_id, created_at desc);

alter table public.invoices enable row level security;
-- Escritura solo por RPC.
create policy invoices_read on public.invoices for select to authenticated
  using (payer_id = auth.uid() or payee_id = auth.uid() or public.is_admin());

-- ============ Suscripción vigente ============
create or replace function public.subscription_active(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions s
     where s.nutritionist_id = p_user and s.status = 'activa' and s.current_period_end > now())
$$;

-- Nutricionista (o admin) elige plan: crea suscripción pendiente + factura de suscripción.
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
  if public.subscription_active(auth.uid()) then
    raise exception 'YA_TIENES_SUSCRIPCION' using errcode = 'P0001';
  end if;

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

-- Nutricionista cobra a su paciente (solo pacientes con solicitud aceptada por él).
create or replace function public.create_invoice(p_patient uuid, p_concept text, p_amount numeric)
returns public.invoices
language plpgsql security definer set search_path = public as $$
declare
  v_row public.invoices;
  v_concept text := trim(coalesce(p_concept, ''));
begin
  if auth.uid() is null then raise exception 'SIN_SESION' using errcode = '42501'; end if;
  if not public.phase_on(2) then raise exception 'FASE_NO_ACTIVA' using errcode = 'P0001'; end if;
  if not public.is_my_patient(p_patient) then raise exception 'NO_ES_TU_PACIENTE' using errcode = '42501'; end if;
  if char_length(v_concept) not between 2 and 200 or p_amount is null or p_amount <= 0 then
    raise exception 'DATOS_INVALIDOS' using errcode = 'P0001';
  end if;
  insert into public.invoices (payer_id, payee_id, kind, concept, amount)
  values (p_patient, auth.uid(), 'consulta', v_concept, round(p_amount, 2))
  returning * into v_row;
  return v_row;
end $$;

-- Quien paga reporta su transferencia con la referencia: pendiente → reportada.
create or replace function public.report_invoice_paid(p_id uuid, p_reference text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_ref text := trim(coalesce(p_reference, ''));
begin
  if auth.uid() is null then raise exception 'SIN_SESION' using errcode = '42501'; end if;
  if char_length(v_ref) not between 4 and 100 then
    raise exception 'DATOS_INVALIDOS' using errcode = 'P0001';
  end if;
  update public.invoices i
     set status = 'reportada', payment_reference = v_ref, reported_at = now()
   where i.id = p_id and i.payer_id = auth.uid() and i.status = 'pendiente';
  if not found then raise exception 'NO_EXISTE' using errcode = 'P0001'; end if;
end $$;

-- Quien cobra (o admin) confirma el pago: pendiente/reportada → pagada.
-- Si es factura de suscripción, la suscripción queda activa 30 días más.
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
end $$;

-- Quien cobra (o admin) anula una factura que no está pagada.
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
end $$;

-- Facturas donde pago o cobro; la más nueva primero.
create or replace function public.my_invoices()
returns table (id uuid, payer_id uuid, payee_id uuid, kind text, subscription_id uuid, concept text,
               amount numeric, status text, payment_reference text, reported_at timestamptz,
               paid_at timestamptz, created_at timestamptz, payer_name text, payee_name text)
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'SIN_SESION' using errcode = '42501'; end if;
  return query
    select i.id, i.payer_id, i.payee_id, i.kind, i.subscription_id, i.concept, i.amount, i.status,
           i.payment_reference, i.reported_at, i.paid_at, i.created_at,
           pa.full_name, pe.full_name
      from public.invoices i
      left join public.profiles pa on pa.id = i.payer_id
      left join public.profiles pe on pe.id = i.payee_id
     where i.payer_id = auth.uid() or i.payee_id = auth.uid()
     order by i.created_at desc;
end $$;

-- Todas las facturas; solo admin.
create or replace function public.admin_list_invoices()
returns table (id uuid, payer_id uuid, payee_id uuid, kind text, subscription_id uuid, concept text,
               amount numeric, status text, payment_reference text, reported_at timestamptz,
               paid_at timestamptz, created_at timestamptz, payer_name text, payee_name text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'SOLO_ADMIN' using errcode = '42501'; end if;
  return query
    select i.id, i.payer_id, i.payee_id, i.kind, i.subscription_id, i.concept, i.amount, i.status,
           i.payment_reference, i.reported_at, i.paid_at, i.created_at,
           pa.full_name, pe.full_name
      from public.invoices i
      left join public.profiles pa on pa.id = i.payer_id
      left join public.profiles pe on pe.id = i.payee_id
     order by i.created_at desc;
end $$;

-- Suscripción más reciente no cancelada, con su plan; null si no hay.
create or replace function public.my_subscription() returns json
language plpgsql stable security definer set search_path = public as $$
declare
  v_sub public.subscriptions;
begin
  if auth.uid() is null then return null; end if;
  select * into v_sub from public.subscriptions s
   where s.nutritionist_id = auth.uid() and s.status <> 'cancelada'
   order by s.created_at desc limit 1;
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

-- Todas las suscripciones con nombre del nutricionista y del plan; solo admin.
create or replace function public.admin_list_subscriptions()
returns table (id uuid, nutritionist_id uuid, plan_id uuid, status text, current_period_end timestamptz,
               created_at timestamptz, nutritionist_name text, plan_name text, monthly_price numeric,
               patient_quota int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'SOLO_ADMIN' using errcode = '42501'; end if;
  return query
    select s.id, s.nutritionist_id, s.plan_id, s.status, s.current_period_end, s.created_at,
           pr.full_name, p.name, p.monthly_price, p.patient_quota
      from public.subscriptions s
      join public.subscription_plans p on p.id = s.plan_id
      left join public.profiles pr on pr.id = s.nutritionist_id
     order by s.created_at desc;
end $$;

-- ============ Aceptar solicitud: ahora exige suscripción y cupo del plan (nutricionista, no admin) ============
create or replace function public.accept_care_request(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_quota int;
  v_used int;
begin
  if not public.is_staff() then raise exception 'SOLO_NUTRICIONISTA' using errcode = '42501'; end if;
  if not public.phase_on(2) then raise exception 'FASE_NO_ACTIVA' using errcode = 'P0001'; end if;
  if public.my_role() = 'nutricionista' then
    if not public.subscription_active(auth.uid()) then
      raise exception 'SIN_SUSCRIPCION' using errcode = 'P0001';
    end if;
    -- Bloquea la suscripción vigente para que dos aceptaciones no superen el cupo.
    select p.patient_quota into v_quota
      from public.subscriptions s join public.subscription_plans p on p.id = s.plan_id
     where s.nutritionist_id = auth.uid() and s.status = 'activa' and s.current_period_end > now()
     order by s.created_at desc limit 1
       for update of s;
    select count(*)::int into v_used from public.care_requests c
     where c.nutritionist_id = auth.uid() and c.status = 'aceptada';
    if v_used >= v_quota then raise exception 'CUPO_PLAN_LLENO' using errcode = 'P0001'; end if;
  end if;

  update public.care_requests c
     set status = 'aceptada', nutritionist_id = auth.uid(), accepted_at = now()
   where c.id = p_id and c.status = 'abierta';
  if not found then raise exception 'YA_TOMADA' using errcode = 'P0001'; end if;
end $$;

-- ============ Tablero del nutricionista ============
create or replace function public.nutri_dashboard() returns json
language plpgsql stable security definer set search_path = public as $$
declare
  v_monday date;
  v_total int;
  v_done int;
begin
  if not public.is_staff() then raise exception 'SOLO_NUTRICIONISTA' using errcode = '42501'; end if;
  -- Semana actual en Guayaquil: lunes a domingo.
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
    'subscription', public.my_subscription());
end $$;

-- ============ Reseñas ============
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('nutricionista', 'lugar')),
  target_id text not null,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  comment text check (char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (target_type, target_id, author_id)
);

create trigger reviews_touch before update on public.reviews
  for each row execute function public.touch_updated_at();

create or replace function public.reviews_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.phase_on(3) then raise exception 'FASE_NO_ACTIVA' using errcode = 'P0001'; end if;
  if tg_op = 'INSERT'
     or new.target_type is distinct from old.target_type
     or new.target_id is distinct from old.target_id then
    if new.target_type = 'nutricionista' then
      -- Solo quien fue atendido (solicitud aceptada o finalizada) por ese nutricionista.
      if not exists (
        select 1 from public.care_requests c
         where c.patient_id = new.author_id and c.nutritionist_id::text = new.target_id
           and c.status in ('aceptada', 'finalizada')) then
        raise exception 'NO_PERMITIDO' using errcode = '42501';
      end if;
    else
      if not exists (select 1 from public.places pl where pl.id::text = new.target_id) then
        raise exception 'NO_EXISTE' using errcode = 'P0001';
      end if;
    end if;
  end if;
  return new;
end $$;

create trigger reviews_guard before insert or update on public.reviews
  for each row execute function public.reviews_guard();

alter table public.reviews enable row level security;
create policy reviews_read on public.reviews for select to anon, authenticated using (true);
create policy reviews_insert on public.reviews for insert to authenticated
  with check (author_id = auth.uid());
create policy reviews_update on public.reviews for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy reviews_delete on public.reviews for delete to authenticated
  using (author_id = auth.uid());

-- Promedio (1 decimal, o null) y cantidad.
create or replace function public.rating_summary(p_target_type text, p_target_id text) returns json
language sql stable set search_path = public as $$
  select json_build_object(
    'average', (select round(avg(r.stars)::numeric, 1) from public.reviews r
                 where r.target_type = p_target_type and r.target_id = p_target_id),
    'count', (select count(*)::int from public.reviews r
               where r.target_type = p_target_type and r.target_id = p_target_id))
$$;

-- Reseñas del objetivo; solo el primer nombre del autor.
create or replace function public.list_reviews(p_target_type text, p_target_id text)
returns table (id uuid, target_type text, target_id text, author_id uuid, stars int, comment text,
               created_at timestamptz, author_name text)
language sql stable security definer set search_path = public as $$
  select r.id, r.target_type, r.target_id, r.author_id, r.stars, r.comment, r.created_at,
         nullif(split_part(trim(p.full_name), ' ', 1), '')
    from public.reviews r
    left join public.profiles p on p.id = r.author_id
   where r.target_type = p_target_type and r.target_id = p_target_id
   order by r.created_at desc
$$;

grant execute on function public.list_reviews(text, text) to anon, authenticated;
grant execute on function public.rating_summary(text, text) to anon, authenticated;

-- ============ Avisos de facturas ============
create or replace function public.notify_invoice_created() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.notify(new.payer_id, 'factura_nueva', 'Tienes una factura nueva',
                        new.concept || ' · $' || to_char(new.amount, 'FM999999990.00'),
                        case when new.kind = 'suscripcion' then '/nutri/suscripcion' else '/mi-panel?tab=pagos' end);
  return null;
end $$;

create trigger invoices_notify_created after insert on public.invoices
  for each row execute function public.notify_invoice_created();

-- Pago reportado: avisa a quien cobra; si no hay cobrador (suscripción), a todos los admin.
create or replace function public.notify_invoice_reported() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_link text := case when new.payee_id is null then '/admin/pagos'
                      else '/nutri/pacientes/' || new.payer_id::text end;
begin
  if new.status = 'reportada' and old.status is distinct from 'reportada' then
    if new.payee_id is not null then
      perform public.notify(new.payee_id, 'factura_reportada', 'Reportaron un pago',
                            'Referencia: ' || coalesce(new.payment_reference, '—'), v_link);
    else
      for r in select p.id from public.profiles p where p.role = 'admin' loop
        perform public.notify(r.id, 'factura_reportada', 'Reportaron un pago de suscripción',
                              'Referencia: ' || coalesce(new.payment_reference, '—'), v_link);
      end loop;
    end if;
  end if;
  return null;
end $$;

create trigger invoices_notify_reported after update on public.invoices
  for each row execute function public.notify_invoice_reported();

-- Pago confirmado: avisa a quien paga.
create or replace function public.notify_invoice_paid() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'pagada' and old.status is distinct from 'pagada' then
    perform public.notify(new.payer_id, 'factura_pagada', 'Tu pago fue confirmado', new.concept,
                          case when new.kind = 'suscripcion' then '/nutri/suscripcion' else '/mi-panel?tab=pagos' end);
  end if;
  return null;
end $$;

create trigger invoices_notify_paid after update on public.invoices
  for each row execute function public.notify_invoice_paid();

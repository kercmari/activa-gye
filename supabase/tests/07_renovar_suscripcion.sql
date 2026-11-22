-- Pruebas de la migración 8 (XT2): renovar una suscripción vencida (H1) y condiciones en texto libre (H6).
-- Usuarios: p1 = paciente con suscripción activa vencida; p2 = con «hipertensión» en texto libre;
-- p3 = texto libre en blanco; p4 = texto libre nulo; p5 = suscripción activa vigente.
begin;
select plan(11);

-- ============ Datos (como superusuario) ============
update public.app_settings set phase1 = true, phase2 = true, phase3 = false, patient_limit = 1000 where id = 1;

insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000007a1', 'authenticated', 'authenticated', 'pac7a@test.local', '{"full_name":"Paciente A","birth_date":"1995-01-01"}'),
  ('00000000-0000-0000-0000-0000000007a2', 'authenticated', 'authenticated', 'pac7b@test.local', '{"full_name":"Paciente B","birth_date":"1995-01-01"}'),
  ('00000000-0000-0000-0000-0000000007a3', 'authenticated', 'authenticated', 'pac7c@test.local', '{"full_name":"Paciente C","birth_date":"1995-01-01"}'),
  ('00000000-0000-0000-0000-0000000007a4', 'authenticated', 'authenticated', 'pac7d@test.local', '{"full_name":"Paciente D","birth_date":"1995-01-01"}'),
  ('00000000-0000-0000-0000-0000000007a5', 'authenticated', 'authenticated', 'pac7e@test.local', '{"full_name":"Paciente E","birth_date":"1995-01-01"}');

-- Ficha: sin condiciones marcadas; solo p2 tiene «hipertensión» escrita en texto libre.
insert into public.patient_intakes (user_id, weight_kg, height_cm, goal, activity_level, conditions, health_notes) values
  ('00000000-0000-0000-0000-0000000007a1', 80.0, 170.0, 'mantener', 'moderado', '{}', null),
  ('00000000-0000-0000-0000-0000000007a2', 80.0, 170.0, 'mantener', 'moderado', '{}', 'hipertensión'),
  ('00000000-0000-0000-0000-0000000007a3', 80.0, 170.0, 'mantener', 'moderado', '{}', '   '),
  ('00000000-0000-0000-0000-0000000007a4', 80.0, 170.0, 'mantener', 'moderado', '{}', null),
  ('00000000-0000-0000-0000-0000000007a5', 80.0, 170.0, 'mantener', 'moderado', '{}', null);

-- Aislar la prueba del contenido real (migración 7): se borran dentro de esta transacción (rollback al final).
delete from public.plan_templates;
insert into public.plan_templates (name, sex, age_min, age_max, bmi_min, bmi_max, goal, kcal_base, status) values
  ('Prueba general 7', 'cualquiera', 18, 120, 0, 99, null, 2000, 'borrador');
insert into public.plan_template_items (template_id, day_number, at_time, kind, title, detail, sort)
select t.id, d.n, time '07:30', 'comida', 'Comida de prueba', 'Porción de prueba', 1
  from public.plan_templates t
  cross join generate_series(1, 7) d(n);

-- p1 y p5 tienen suscripción: p1 activa cuyo período ya terminó; p5 activa vigente.
insert into public.patient_subscriptions (patient_id, plan_id, status, current_period_end)
select '00000000-0000-0000-0000-0000000007a1', p.id, 'activa', now() - interval '1 day'
  from public.subscription_plans p where p.name = 'Seguimiento mensual';
insert into public.patient_subscriptions (patient_id, plan_id, status, current_period_end)
select '00000000-0000-0000-0000-0000000007a5', p.id, 'activa', now() + interval '30 days'
  from public.subscription_plans p where p.name = 'Seguimiento mensual';

select set_config('test.plan', (select id::text from public.subscription_plans where name = 'Seguimiento mensual'), true);

-- ============ (a) Activa vencida se muestra como vencida ============
do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000007a1","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select is((select status from public.my_patient_subscription()), 'vencida',
  'H1 (a): una suscripción activa con período terminado devuelve vencida');

-- ============ (b) Renovar desde vencida ============
select lives_ok($$ select public.choose_patient_plan(current_setting('test.plan')::uuid) $$,
  'H1 (b): con suscripción vencida el paciente puede elegir plan sin error');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

select is((select count(*)::int from public.patient_subscriptions
           where patient_id = '00000000-0000-0000-0000-0000000007a1' and status = 'pendiente'), 1,
  'H1 (b): queda una suscripción pendiente nueva');
select is((select count(*)::int from public.patient_subscriptions
           where patient_id = '00000000-0000-0000-0000-0000000007a1' and status = 'vencida'), 1,
  'H1 (b): la suscripción vencida conserva su estado');
select is((select count(*)::int from public.invoices
           where kind = 'suscripcion_paciente' and payer_id = '00000000-0000-0000-0000-0000000007a1'
             and status = 'pendiente'), 1,
  'H1 (b): queda una factura suscripcion_paciente pendiente');

-- ============ (c) Activa vigente sigue activa ============
do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000007a5","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select is((select status from public.my_patient_subscription()), 'activa',
  'H1 (c): una suscripción activa vigente sigue devolviendo activa');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

-- ============ (d) Condición escrita solo en texto libre ============
do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000007a2","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select throws_ok($$ select public.assign_trial() $$, 'P0001', 'REQUIERE_NUTRICIONISTA',
  'H6 (d): health_notes con texto y conditions vacío responde REQUIERE_NUTRICIONISTA');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

-- ============ (e) Texto libre vacío o nulo y sin condiciones sigue asignando ============
do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000007a3","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select lives_ok($$ select public.assign_trial() $$,
  'H6 (e): health_notes en blanco y sin condiciones asigna la semana');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000007a4","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select lives_ok($$ select public.assign_trial() $$,
  'H6 (e): health_notes nulo y sin condiciones asigna la semana');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

select is((select count(*)::int from public.trials
           where user_id in ('00000000-0000-0000-0000-0000000007a3', '00000000-0000-0000-0000-0000000007a4')), 2,
  'H6 (e): cada uno de los dos tiene una semana creada');
select is((select count(*)::int from public.trials
           where user_id = '00000000-0000-0000-0000-0000000007a2'), 0,
  'H6 (d): el paciente con texto libre no recibe semana automática');

select * from finish();
rollback;

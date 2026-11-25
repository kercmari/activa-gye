-- Pruebas de la migración 15 (XW2): quién puede llamar los auxiliares de límites y el estado de receta.
-- Usuarios: a12 = admin; n12 = nutricionista (paciente p12 por plataforma, suscrito con 1 receta);
-- p12 = paciente con receta en borrador (R2) y entregada (R1); q12 = otro paciente con receta ajena (RQ).
begin;
select plan(25);

create or replace function pg_temp.as_user(uid uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
end $$;

create or replace function pg_temp.as_super() returns void
language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', '', true);
end $$;

-- ============ 1. Privilegios (como superusuario) ============
select ok(not has_function_privilege('authenticated', 'public.nutri_patient_quota(uuid)', 'execute'),
  'authenticated no ejecuta nutri_patient_quota directamente');
select ok(not has_function_privilege('authenticated', 'public.nutri_daily_limit(uuid)', 'execute'),
  'authenticated no ejecuta nutri_daily_limit directamente');
select ok(not has_function_privilege('authenticated', 'public.nutri_records_today(uuid)', 'execute'),
  'authenticated no ejecuta nutri_records_today directamente');
select ok(not has_function_privilege('anon', 'public.nutri_patient_quota(uuid)', 'execute'),
  'anon no ejecuta nutri_patient_quota');
select ok(has_function_privilege('authenticated', 'public.recipe_status(uuid)', 'execute'),
  'authenticated sí ejecuta recipe_status (la usan las políticas de plan_days)');

-- ============ 2. Datos (como superusuario) ============
update public.app_settings set phase1 = true, phase2 = true, phase3 = false, patient_limit = 1000 where id = 1;

insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000012a0', 'authenticated', 'authenticated', 'admin12@test.local', '{"full_name":"Admin Doce","birth_date":"1980-01-01"}'),
  ('00000000-0000-0000-0000-0000000012b0', 'authenticated', 'authenticated', 'nut12@test.local', '{"full_name":"Nutri Doce","birth_date":"1985-03-03"}'),
  ('00000000-0000-0000-0000-0000000012c0', 'authenticated', 'authenticated', 'pac12p@test.local', '{"full_name":"Paciente Doce P","birth_date":"1990-05-10"}'),
  ('00000000-0000-0000-0000-0000000012c1', 'authenticated', 'authenticated', 'pac12q@test.local', '{"full_name":"Paciente Doce Q","birth_date":"1991-06-11"}');

update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000012a0';
update public.profiles set role = 'nutricionista' where id = '00000000-0000-0000-0000-0000000012b0';

insert into public.care_requests (patient_id, nutritionist_id, status, origin, accepted_at) values
  ('00000000-0000-0000-0000-0000000012c0', '00000000-0000-0000-0000-0000000012b0', 'aceptada', 'plataforma', now());

insert into public.patient_subscriptions (patient_id, plan_id, status, current_period_end, recipes_left)
select '00000000-0000-0000-0000-0000000012c0', sp.id, 'activa', now() + interval '30 days', 1
  from public.subscription_plans sp where sp.name = 'Seguimiento mensual';

-- Fixtures del calendario: no cuentan para el límite diario (flag del sistema).
select set_config('activa.registro_automatico', 'on', false);

insert into public.prescriptions (id, patient_id, nutritionist_id, kind, title) values
  ('00000000-0000-4000-8000-000000001201', '00000000-0000-0000-0000-0000000012c0', '00000000-0000-0000-0000-0000000012b0', 'dieta', 'Receta uno'),
  ('00000000-0000-4000-8000-000000001202', '00000000-0000-0000-0000-0000000012c0', '00000000-0000-0000-0000-0000000012b0', 'dieta', 'Receta dos'),
  ('00000000-0000-4000-8000-000000001203', '00000000-0000-0000-0000-0000000012c1', '00000000-0000-0000-0000-0000000012b0', 'dieta', 'Receta ajena');

insert into public.plan_days (id, patient_id, nutritionist_id, day, title, meals, prescription_id) values
  ('00000000-0000-4000-8000-000000001301', '00000000-0000-0000-0000-0000000012c0', '00000000-0000-0000-0000-0000000012b0', '2026-12-01', 'Dia R1', 'Avena', '00000000-0000-4000-8000-000000001201'),
  ('00000000-0000-4000-8000-000000001302', '00000000-0000-0000-0000-0000000012c0', '00000000-0000-0000-0000-0000000012b0', '2026-12-02', 'Dia R2', 'Pollo', '00000000-0000-4000-8000-000000001202'),
  ('00000000-0000-4000-8000-000000001303', '00000000-0000-0000-0000-0000000012c1', '00000000-0000-0000-0000-0000000012b0', '2026-12-01', 'Dia ajeno', 'Sopa', '00000000-0000-4000-8000-000000001203');

select set_config('activa.registro_automatico', 'off', false);

-- ============ 3. Paciente p12 (antes de entregar) ============
select pg_temp.as_user('00000000-0000-0000-0000-0000000012c0');
select throws_ok($$ select public.nutri_patient_quota('00000000-0000-0000-0000-0000000012b0') $$,
  '42501', 'permission denied for function nutri_patient_quota',
  'el paciente no lee el cupo de su nutricionista');
select throws_ok($$ select public.nutri_daily_limit('00000000-0000-0000-0000-0000000012b0') $$,
  '42501', 'permission denied for function nutri_daily_limit',
  'el paciente no lee el límite diario de su nutricionista');
select throws_ok($$ select public.nutri_records_today('00000000-0000-0000-0000-0000000012b0') $$,
  '42501', 'permission denied for function nutri_records_today',
  'el paciente no lee los registros de hoy de su nutricionista');
select is((select (public.patient_recipe_balance()->>'left')::int), 1,
  'el paciente ve su propio saldo de recetas');
select is((select public.recipe_status('00000000-0000-4000-8000-000000001203')), null,
  'el paciente no ve el estado de una receta ajena');
select is((select count(*)::int from public.plan_days where id = '00000000-0000-4000-8000-000000001302'), 0,
  'el día de una receta en borrador no se ve');
select pg_temp.as_super();

-- ============ 4. Nutricionista n12 ============
select pg_temp.as_user('00000000-0000-0000-0000-0000000012b0');
select is((select (public.nutri_limits()->>'patient_quota')::int), 3,
  'la nutricionista lee su cupo con nutri_limits');
select is((select (public.nutri_limits()->>'daily_record_limit')::int), 10,
  'la nutricionista lee su límite diario con nutri_limits');
select lives_ok($$ select public.deliver_prescription('00000000-0000-4000-8000-000000001201') $$,
  'la nutricionista entrega la receta uno (usa la única receta del saldo)');
select is((select (public.patient_recipe_balance('00000000-0000-0000-0000-0000000012c0')->>'left')::int), 0,
  'entregar descuenta una receta del saldo');
select throws_ok($$ select public.deliver_prescription('00000000-0000-4000-8000-000000001202') $$,
  'P0001', 'SIN_RECETAS', 'sin saldo no entrega otra receta');
select lives_ok($$ update public.plan_days set title = 'Dia R2 editado'
                    where id = '00000000-0000-4000-8000-000000001302' $$,
  'la receta en borrador sí se edita');
select lives_ok($$ update public.plan_days set title = 'Intento'
                    where id = '00000000-0000-4000-8000-000000001301' $$,
  'intentar editar un día de receta entregada no da error (no cambia nada)');
select is((select title from public.plan_days where id = '00000000-0000-4000-8000-000000001301'), 'Dia R1',
  'el día de la receta entregada no cambia');
select is((select title from public.plan_days where id = '00000000-0000-4000-8000-000000001302'), 'Dia R2 editado',
  'el día del borrador quedó editado');
select pg_temp.as_super();

-- ============ 5. Paciente p12 (después de entregar) ============
select pg_temp.as_user('00000000-0000-0000-0000-0000000012c0');
select is((select public.recipe_status('00000000-0000-4000-8000-000000001201')), 'entregada',
  'el paciente ve el estado de su receta entregada');
select is((select count(*)::int from public.plan_days where id = '00000000-0000-4000-8000-000000001301'), 1,
  'el paciente ve el día de la receta entregada');
select is((select count(*)::int from public.plan_days where id = '00000000-0000-4000-8000-000000001302'), 0,
  'el paciente sigue sin ver el día del borrador');
select pg_temp.as_super();

-- ============ 6. Otro paciente y administradora ============
select pg_temp.as_user('00000000-0000-0000-0000-0000000012c1');
select is((select public.recipe_status('00000000-0000-4000-8000-000000001201')), null,
  'otro paciente no ve el estado de la receta de p12');
select pg_temp.as_super();

select pg_temp.as_user('00000000-0000-0000-0000-0000000012a0');
select is((select public.recipe_status('00000000-0000-4000-8000-000000001203')), 'borrador',
  'la administradora ve el estado de cualquier receta');
select pg_temp.as_super();

select * from finish();
rollback;

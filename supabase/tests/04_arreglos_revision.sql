-- Pruebas de regresión de la revisión RS/RN (hallazgos BLOCKING [sql] 1 y 2).
begin;
select plan(6);

-- ============ Datos (como superusuario) ============
update public.app_settings set phase1 = true, phase2 = true, phase3 = false, patient_limit = 1000 where id = 1;

insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000d1', 'authenticated', 'authenticated', 'nut4@test.local', '{"full_name":"Nutri Cuatro","birth_date":"1985-03-03"}'),
  ('00000000-0000-0000-0000-0000000000d2', 'authenticated', 'authenticated', 'pac4@test.local', '{"full_name":"Paciente Cuatro","birth_date":"1990-05-10"}');
update public.profiles set role = 'nutricionista' where id = '00000000-0000-0000-0000-0000000000d1';

insert into public.patient_intakes (user_id, weight_kg, height_cm) values
  ('00000000-0000-0000-0000-0000000000d2', 80.0, 172.0);

-- ============ BLOCKING 1 [sql]: aceptar exige suscripción activa y la prueba la prepara ============
do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select lives_ok($$ select public.request_care('Quiero bajar de peso') $$, 'BLOCKING 1: el paciente pide atención');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select throws_ok(
  $$ select public.accept_care_request((select id from public.care_requests
       where patient_id = '00000000-0000-0000-0000-0000000000d2' and status = 'abierta')) $$,
  'P0001', 'SIN_SUSCRIPCION', 'BLOCKING 1: nutricionista sin suscripción activa no acepta');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

insert into public.subscriptions (nutritionist_id, plan_id, status, current_period_end)
select '00000000-0000-0000-0000-0000000000d1', p.id, 'activa', now() + interval '30 days'
  from public.subscription_plans p where p.name = 'Básico';

do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select lives_ok(
  $$ select public.accept_care_request((select id from public.care_requests
       where patient_id = '00000000-0000-0000-0000-0000000000d2' and status = 'abierta')) $$,
  'BLOCKING 1: con suscripción activa el nutricionista acepta');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

-- ============ BLOCKING 2 [sql]: el cupo se mide contra los pacientes existentes, no contra 5 ============
select is((select column_default from information_schema.columns
            where table_schema = 'public' and table_name = 'app_settings' and column_name = 'patient_limit'),
  '5', 'BLOCKING 2: el cupo por defecto de la columna sigue siendo 5');

-- Simulamos una base con pacientes de corridas previas (e2e): 50 usuarios extra.
insert into auth.users (id, aud, role, email, raw_user_meta_data)
select gen_random_uuid(), 'authenticated', 'authenticated', 'previo' || g || '@test.local',
       '{"full_name":"Previo","birth_date":"1990-01-01"}'
  from generate_series(1, 50) as g;
select set_config('test.n', (select count(*)::text from public.profiles where role = 'usuario'), true);

update public.app_settings set patient_limit = current_setting('test.n')::int where id = 1;
select throws_ok(
  $$ insert into auth.users (id, aud, role, email, raw_user_meta_data) values
       ('00000000-0000-0000-0000-0000000000e1', 'authenticated', 'authenticated', 'lleno@test.local', '{"full_name":"Lleno","birth_date":"1992-08-08"}') $$,
  'P0001', 'CUPO_LLENO', 'BLOCKING 2: con el cupo igual a los pacientes existentes no hay registro');

update public.app_settings set patient_limit = current_setting('test.n')::int + 1 where id = 1;
select lives_ok(
  $$ insert into auth.users (id, aud, role, email, raw_user_meta_data) values
       ('00000000-0000-0000-0000-0000000000e1', 'authenticated', 'authenticated', 'cabe@test.local', '{"full_name":"Cabe","birth_date":"1992-08-08"}') $$,
  'BLOCKING 2: con un cupo libre por encima de los existentes sí hay registro');

select * from finish();
rollback;

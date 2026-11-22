-- Pruebas de la migración 2: fases, cupo, ficha y solicitudes de atención.
-- Usuarios: a1 = admin, b1/b2 = nutricionistas, c1/c2/c3 = pacientes (c3 es menor de 18).
begin;
select plan(30);

-- ============ Estado de partida (dentro de la transacción: el rollback lo deshace) ============
-- La base local puede traer pacientes de otras corridas (e2e). El cupo se mide contra ese número,
-- no contra valores absolutos, y la fase se fija aquí en vez de confiar en la fila viva.
select set_config('test.base', (select count(*)::text from public.profiles where role = 'usuario'), true);
update public.app_settings
   set phase1 = true, phase2 = false, phase3 = false,
       patient_limit = current_setting('test.base')::int + 5
 where id = 1;

-- ============ Datos de prueba (como superusuario; el trigger crea los perfiles) ============
insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'authenticated', 'authenticated', 'admin@test.local', '{"full_name":"Admin Prueba"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'authenticated', 'authenticated', 'nut1@test.local', '{"full_name":"Nutri Uno","birth_date":"1985-03-03"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'authenticated', 'authenticated', 'nut2@test.local', '{"full_name":"Nutri Dos","birth_date":"1985-03-03"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'authenticated', 'authenticated', 'pac1@test.local', '{"full_name":"Paciente Uno","birth_date":"1990-05-10"}');

update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000a1';
update public.profiles set role = 'nutricionista' where id in ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b2');

-- Desde la migración 4 aceptar una solicitud exige suscripción activa (SIN_SUSCRIPCION).
insert into public.subscriptions (nutritionist_id, plan_id, status, current_period_end)
select n.id, (select p.id from public.subscription_plans p where p.name = 'Básico'), 'activa', now() + interval '30 days'
  from (values ('00000000-0000-0000-0000-0000000000b1'::uuid), ('00000000-0000-0000-0000-0000000000b2'::uuid)) as n(id);

-- ============ 1-5. Configuración pública ============
select is(public.get_public_settings()->>'phase1', 'true', 'fase 1 activa al empezar la prueba');
select is(public.get_public_settings()->>'phase2', 'false', 'fase 2 apagada al empezar la prueba');
select is(public.get_public_settings()->>'phase3', 'false', 'fase 3 apagada al empezar la prueba');
select is((select column_default from information_schema.columns
            where table_schema = 'public' and table_name = 'app_settings' and column_name = 'patient_limit'),
  '5', 'la columna patient_limit tiene 5 pacientes por defecto');

do $$ begin set local role anon; end $$;
select lives_ok($$ select public.get_public_settings() $$, 'anon puede leer la configuración pública');
do $$ begin reset role; end $$;

-- ============ 6-7. Solo admin cambia la configuración ============
do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select throws_ok($$ select public.admin_set_settings(true, true, false, 5) $$, '42501', 'SOLO_ADMIN',
  'un paciente no puede cambiar la configuración');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select is((public.admin_set_settings(true, false, false, 1))->>'patient_limit', '1',
  'el admin cambia el cupo');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

-- ============ 8-10. Cupo lleno y fase 3 ============
-- Ya hay un paciente (c1) y el cupo es 1.
select throws_ok(
  $$ insert into auth.users (id, aud, role, email, raw_user_meta_data) values
       ('00000000-0000-0000-0000-0000000000c2', 'authenticated', 'authenticated', 'pac2@test.local', '{"full_name":"Paciente Dos","birth_date":"1992-08-08"}') $$,
  'P0001', 'CUPO_LLENO', 'con el cupo lleno no se registra otro paciente');

do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select is((public.admin_set_settings(true, false, true, 1))->>'phase3', 'true', 'el admin enciende la fase 3');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

select lives_ok(
  $$ insert into auth.users (id, aud, role, email, raw_user_meta_data) values
       ('00000000-0000-0000-0000-0000000000c2', 'authenticated', 'authenticated', 'pac2@test.local', '{"full_name":"Paciente Dos","birth_date":"1992-08-08"}') $$,
  'con la fase 3 encendida no hay cupo');

do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select is((public.admin_set_settings(true, false, false, current_setting('test.base')::int + 5))->>'patient_limit',
  (current_setting('test.base')::int + 5)::text, 'el admin restablece el cupo a 5 sobre los pacientes existentes');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

-- Menor de 18 (16-17 años: se registra, pero no puede subir foto).
select lives_ok(
  $$ insert into auth.users (id, aud, role, email, raw_user_meta_data) values
       ('00000000-0000-0000-0000-0000000000c3', 'authenticated', 'authenticated', 'pac3@test.local', '{"full_name":"Paciente Tres","birth_date":"2009-06-01"}') $$,
  'un menor de 18 (pero mayor de 16) se registra');

-- ============ 11-15. Ficha del paciente ============
do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select lives_ok(
  $$ insert into public.patient_intakes (user_id, weight_kg, height_cm, goal, activity_level, photo_path, consent_photo)
     values ('00000000-0000-0000-0000-0000000000c1', 80, 175, 'bajar_peso', 'ligero',
             '00000000-0000-0000-0000-0000000000c1/frente.jpg', true) $$,
  'el paciente guarda su ficha con foto y consentimiento');
select is((select consent_at is not null from public.patient_intakes where user_id = '00000000-0000-0000-0000-0000000000c1'),
  true, 'al consentir la foto se registra la fecha de consentimiento');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select is((select count(*)::int from public.patient_intakes where user_id = '00000000-0000-0000-0000-0000000000c1'),
  0, 'otro paciente no ve la ficha ajena');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select throws_ok(
  $$ insert into public.patient_intakes (user_id, weight_kg, height_cm, photo_path, consent_photo)
     values ('00000000-0000-0000-0000-0000000000c3', 60, 165,
             '00000000-0000-0000-0000-0000000000c3/frente.jpg', true) $$,
  'P0001', 'FOTO_MENOR_18', 'un menor de 18 no puede subir foto');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

-- ============ 16-20. Solicitudes del paciente ============
do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select throws_ok($$ select public.request_care('Quiero empezar') $$, 'P0001', 'FASE_NO_ACTIVA',
  'con la fase 2 apagada no se pide atención');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select is((public.admin_set_settings(true, true, false, 5))->>'phase2', 'true', 'el admin enciende la fase 2');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select throws_ok($$ select public.request_care('Hola') $$, 'P0001', 'FALTA_FICHA',
  'sin ficha no se pide atención');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select is((select (public.request_care('Quiero empezar')).status), 'abierta',
  'con ficha, la solicitud queda abierta');
select throws_ok($$ select public.request_care('Otra vez') $$, 'P0001', 'YA_TIENES_SOLICITUD',
  'una segunda solicitud activa no se permite');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

-- Guardamos el id de la solicitud para usarlo después (como superusuario).
do $$ begin
  perform set_config('test.req', (select id::text from public.care_requests
    where patient_id = '00000000-0000-0000-0000-0000000000c1' and status = 'abierta'), true);
end $$;

-- ============ 21-23. Nutricionistas ============
do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select is((select count(*)::int from public.list_open_care_requests()
            where patient_id = '00000000-0000-0000-0000-0000000000c1'),
  1, 'el nutricionista ve la solicitud abierta');
select lives_ok($$ select public.accept_care_request(current_setting('test.req')::uuid) $$,
  'el primer nutricionista acepta la solicitud');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select throws_ok($$ select public.accept_care_request(current_setting('test.req')::uuid) $$, 'P0001', 'YA_TOMADA',
  'un segundo nutricionista no puede tomar la misma solicitud');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

-- ============ 24-27. Quién ve a quién ============
do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select is(public.is_my_patient('00000000-0000-0000-0000-0000000000c1'), true,
  'el nutricionista asignado es el responsable del paciente');
select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-0000000000c1'),
  1, 'el nutricionista asignado ve el perfil del paciente');
select is((select count(*)::int from public.patient_intakes where user_id = '00000000-0000-0000-0000-0000000000c1'),
  1, 'el nutricionista asignado ve la ficha del paciente');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select is(public.is_my_patient('00000000-0000-0000-0000-0000000000c1'), false,
  'otro nutricionista no es responsable de ese paciente');
select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-0000000000c1'),
  0, 'otro nutricionista no ve el perfil del paciente');
select is((select count(*)::int from public.patient_intakes where user_id = '00000000-0000-0000-0000-0000000000c1'),
  0, 'otro nutricionista no ve la ficha del paciente');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

select * from finish();
rollback;

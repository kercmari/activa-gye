-- Pruebas de la migración 4: suscripción, facturas con pago manual, tablero y reseñas.
-- Usuarios: a4 = admin, b4 = nutricionista, c4/c5/c6 = pacientes.
-- c5 es un tercero para las facturas de b4; c6 nunca fue atendido por b4.
begin;
select plan(42);

-- Actuar como un usuario autenticado y volver a superusuario.
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

-- ============ Datos de prueba (como superusuario; el trigger crea los perfiles) ============
update public.app_settings set phase2 = true, phase3 = false, patient_limit = 1000 where id = 1;

insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a4', 'authenticated', 'authenticated', 'admin4@test.local', '{"full_name":"Admin Cuatro"}'),
  ('00000000-0000-0000-0000-0000000000b4', 'authenticated', 'authenticated', 'nut4@test.local', '{"full_name":"Nutri Cuatro","birth_date":"1985-03-03"}'),
  ('00000000-0000-0000-0000-0000000000c4', 'authenticated', 'authenticated', 'pac4a@test.local', '{"full_name":"Paciente Uno","birth_date":"1990-05-10"}'),
  ('00000000-0000-0000-0000-0000000000c5', 'authenticated', 'authenticated', 'pac4b@test.local', '{"full_name":"Paciente Dos","birth_date":"1992-08-08"}'),
  ('00000000-0000-0000-0000-0000000000c6', 'authenticated', 'authenticated', 'pac4c@test.local', '{"full_name":"Paciente Tres","birth_date":"1993-01-01"}');

update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000a4';
update public.profiles set role = 'nutricionista' where id = '00000000-0000-0000-0000-0000000000b4';

insert into public.patient_intakes (user_id, weight_kg, height_cm) values
  ('00000000-0000-0000-0000-0000000000c4', 82.0, 170.0),
  ('00000000-0000-0000-0000-0000000000c5', 70.0, 165.0),
  ('00000000-0000-0000-0000-0000000000c6', 75.0, 168.0);

-- Los tres pacientes piden atención (fase 2 encendida).
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c4');
select lives_ok($$ select public.request_care('Quiero bajar de peso') $$, 'c4 pide atención');
select pg_temp.as_super();
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c5');
select lives_ok($$ select public.request_care('Quiero ganar músculo') $$, 'c5 pide atención');
select pg_temp.as_super();
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c6');
select lives_ok($$ select public.request_care('Necesito orientación') $$, 'c6 pide atención');
select pg_temp.as_super();

select set_config('test.req4', (select id::text from public.care_requests where patient_id = '00000000-0000-0000-0000-0000000000c4'), true);
select set_config('test.req5', (select id::text from public.care_requests where patient_id = '00000000-0000-0000-0000-0000000000c5'), true);
select set_config('test.req6', (select id::text from public.care_requests where patient_id = '00000000-0000-0000-0000-0000000000c6'), true);

-- 1. Sin suscripción el nutricionista no puede aceptar; el admin sí.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b4');
select throws_ok($$ select public.accept_care_request(current_setting('test.req4')::uuid) $$,
  'P0001', 'SIN_SUSCRIPCION', 'nutricionista sin suscripción no acepta');
select pg_temp.as_super();
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a4');
select lives_ok($$ select public.accept_care_request(current_setting('test.req5')::uuid) $$,
  'el admin acepta sin suscripción');
select pg_temp.as_super();

-- 2. Elegir plan crea suscripción pendiente + factura; solo el admin la marca pagada.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b4');
select lives_ok($$ select public.choose_plan((select id from public.subscription_plans where name = 'Básico')) $$,
  'el nutricionista elige el plan Básico');
select pg_temp.as_super();
select set_config('test.inv_sub', (select id::text from public.invoices
  where kind = 'suscripcion' and payer_id = '00000000-0000-0000-0000-0000000000b4'), true);

select is((select status from public.subscriptions where nutritionist_id = '00000000-0000-0000-0000-0000000000b4'),
  'pendiente', 'la suscripción queda pendiente');
select is((select amount from public.invoices where id = current_setting('test.inv_sub')::uuid),
  10.00::numeric, 'la factura de suscripción cobra el precio del plan');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000b4');
select throws_ok($$ select public.mark_invoice_paid(current_setting('test.inv_sub')::uuid) $$,
  '42501', 'NO_PERMITIDO', 'el nutricionista no marca pagada su propia suscripción');
select pg_temp.as_super();
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a4');
select lives_ok($$ select public.mark_invoice_paid(current_setting('test.inv_sub')::uuid) $$,
  'el admin marca pagada la suscripción');
select pg_temp.as_super();

select is((select status from public.subscriptions where nutritionist_id = '00000000-0000-0000-0000-0000000000b4'),
  'activa', 'la suscripción queda activa al pagarse');
select ok((select current_period_end from public.subscriptions where nutritionist_id = '00000000-0000-0000-0000-0000000000b4')
  between now() + interval '29 days' and now() + interval '31 days', 'la suscripción dura ~30 días');

-- Con suscripción activa el nutricionista acepta y no puede elegir otro plan.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b4');
select lives_ok($$ select public.accept_care_request(current_setting('test.req4')::uuid) $$,
  'el nutricionista con suscripción acepta a c4');
select throws_ok($$ select public.choose_plan((select id from public.subscription_plans where name = 'Pro')) $$,
  'P0001', 'YA_TIENES_SUSCRIPCION', 'no puede elegir plan con una suscripción activa');
select pg_temp.as_super();

-- 3. Facturas de consulta: solo a mis pacientes; flujo de pago manual.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b4');
select throws_ok($$ select public.create_invoice('00000000-0000-0000-0000-0000000000c5', 'Consulta inicial', 20) $$,
  '42501', 'NO_ES_TU_PACIENTE', 'no cobra a un paciente que no es suyo');
select lives_ok($$ select public.create_invoice('00000000-0000-0000-0000-0000000000c4', 'Consulta inicial', 20) $$,
  'cobra una consulta a su paciente');
select pg_temp.as_super();
select set_config('test.inv_consulta', (select id::text from public.invoices
  where kind = 'consulta' and payer_id = '00000000-0000-0000-0000-0000000000c4'), true);

select pg_temp.as_user('00000000-0000-0000-0000-0000000000c4');
select lives_ok($$ select public.report_invoice_paid(current_setting('test.inv_consulta')::uuid, 'REF-12345') $$,
  'el paciente reporta la transferencia');
select throws_ok($$ select public.mark_invoice_paid(current_setting('test.inv_consulta')::uuid) $$,
  '42501', 'NO_PERMITIDO', 'el paciente no marca su factura como pagada');
select pg_temp.as_super();
select is((select status from public.invoices where id = current_setting('test.inv_consulta')::uuid),
  'reportada', 'la factura queda reportada');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000b4');
select lives_ok($$ select public.mark_invoice_paid(current_setting('test.inv_consulta')::uuid) $$,
  'el nutricionista confirma el pago');
select pg_temp.as_super();
select is((select status from public.invoices where id = current_setting('test.inv_consulta')::uuid),
  'pagada', 'la factura queda pagada');

-- Un tercero no ve esas facturas; el paciente sí ve la suya.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c5');
select is((select count(*)::int from public.invoices
            where id in (current_setting('test.inv_sub')::uuid, current_setting('test.inv_consulta')::uuid)), 0,
  'un tercero no ve las facturas');
select pg_temp.as_super();
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c4');
select is((select count(*)::int from public.my_invoices()), 1, 'el paciente ve su factura en mis facturas');
select pg_temp.as_super();

-- 4. Reseñas: fase 3 apagada, luego permisos por atención.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c4');
select throws_ok($$ insert into public.reviews (target_type, target_id, stars)
                    values ('nutricionista', '00000000-0000-0000-0000-0000000000b4', 5) $$,
  'P0001', 'FASE_NO_ACTIVA', 'con fase 3 apagada no hay reseñas');
select pg_temp.as_super();
update public.app_settings set phase3 = true where id = 1;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000c6');
select throws_ok($$ insert into public.reviews (target_type, target_id, stars)
                    values ('nutricionista', '00000000-0000-0000-0000-0000000000b4', 4) $$,
  '42501', 'NO_PERMITIDO', 'no reseña a un nutricionista que no lo atendió');
select pg_temp.as_super();
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c4');
select lives_ok($$ insert into public.reviews (target_type, target_id, stars, comment)
                   values ('nutricionista', '00000000-0000-0000-0000-0000000000b4', 5, 'Muy buena atención') $$,
  'el paciente atendido sí reseña');
select pg_temp.as_super();

select is((public.rating_summary('nutricionista', '00000000-0000-0000-0000-0000000000b4')->>'count')::int, 1,
  'rating_summary cuenta la reseña');
select is((public.rating_summary('nutricionista', '00000000-0000-0000-0000-0000000000b4')->>'average')::numeric,
  5.0::numeric, 'rating_summary calcula el promedio');

-- Anónimo: lee reseñas con solo el primer nombre del autor.
set local role anon;
select is((select count(*)::int from public.list_reviews('nutricionista', '00000000-0000-0000-0000-0000000000b4')), 1,
  'anónimo lee las reseñas');
select is((select author_name from public.list_reviews('nutricionista', '00000000-0000-0000-0000-0000000000b4') limit 1),
  'Paciente', 'la reseña muestra solo el primer nombre');
reset role;

-- 5. Cupo del plan: con cupo 1 y un paciente aceptado, el siguiente no entra; el admin sí.
update public.subscription_plans set patient_quota = 1 where name = 'Básico';
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b4');
select throws_ok($$ select public.accept_care_request(current_setting('test.req6')::uuid) $$,
  'P0001', 'CUPO_PLAN_LLENO', 'con el cupo lleno no acepta otro paciente');
select pg_temp.as_super();
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a4');
select lives_ok($$ select public.accept_care_request(current_setting('test.req6')::uuid) $$,
  'el admin acepta aunque el cupo esté lleno');
select pg_temp.as_super();

-- Tablero, suscripción y administración.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b4');
select is((public.my_subscription()->'plan'->>'name'), 'Básico', 'mi suscripción muestra el plan');
select is((public.nutri_dashboard()->>'my_patients')::int, 1, 'el tablero cuenta mis pacientes');
select pg_temp.as_super();

select pg_temp.as_user('00000000-0000-0000-0000-0000000000c4');
select throws_ok($$ select * from public.admin_list_invoices() $$,
  '42501', 'SOLO_ADMIN', 'el paciente no lista todas las facturas');
select pg_temp.as_super();
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a4');
select ok((select count(*) from public.admin_list_invoices()) >= 2, 'el admin lista todas las facturas');
select pg_temp.as_super();

select ok(exists (select 1 from public.notifications where user_id = '00000000-0000-0000-0000-0000000000c4'
                    and kind = 'factura_nueva'), 'el paciente recibe aviso de factura nueva');
select ok(exists (select 1 from public.notifications where user_id = '00000000-0000-0000-0000-0000000000c4'
                    and kind = 'factura_pagada'), 'el paciente recibe aviso de factura pagada');

-- Anular: no se puede una factura pagada; sí una pendiente.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b4');
select lives_ok($$ select public.create_invoice('00000000-0000-0000-0000-0000000000c4', 'Plan de comidas', 15) $$,
  'cobra otra factura para anularla');
select pg_temp.as_super();
select set_config('test.inv_anular', (select id::text from public.invoices
  where kind = 'consulta' and concept = 'Plan de comidas'), true);
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b4');
select lives_ok($$ select public.cancel_invoice(current_setting('test.inv_anular')::uuid) $$,
  'el nutricionista anula una factura pendiente');
select throws_ok($$ select public.cancel_invoice(current_setting('test.inv_consulta')::uuid) $$,
  'P0001', 'ESTADO_INVALIDO', 'no anula una factura pagada');
select pg_temp.as_super();

-- Vencimiento: la suscripción pasa a vencida por fecha.
update public.subscriptions set current_period_end = now() - interval '1 day'
 where nutritionist_id = '00000000-0000-0000-0000-0000000000b4' and status = 'activa';
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b4');
select is((public.my_subscription()->>'status'), 'vencida', 'una suscripción vencida se muestra como vencida');
select pg_temp.as_super();

select * from finish();
rollback;

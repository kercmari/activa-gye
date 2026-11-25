-- Pruebas de la migración 12 (S12): planes con límites, cupo gratis, correo de la administradora,
-- mejora y renovación de suscripciones, saldo de recetas y admin_subscriptions_overview.
-- Usuarios: a9 = admin; n9 = nutricionista; n9b = nutricionista sin nada (no se usa en el cupo);
-- p9a y p9b = pacientes; c9a..c9d = pacientes con solicitud de atención.
begin;
select plan(46);

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

-- ============ Datos (como superusuario; el trigger crea los perfiles) ============
update public.app_settings set phase1 = true, phase2 = true, phase3 = false, patient_limit = 1000 where id = 1;

insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000009a0', 'authenticated', 'authenticated', 'admin9@test.local', '{"full_name":"Admin Nueve"}'),
  ('00000000-0000-0000-0000-0000000009b0', 'authenticated', 'authenticated', 'nut9@test.local', '{"full_name":"Nutri Nueve","birth_date":"1985-03-03"}'),
  ('00000000-0000-0000-0000-0000000009b1', 'authenticated', 'authenticated', 'nut9b@test.local', '{"full_name":"Nutri Sin Nada","birth_date":"1986-04-04"}'),
  ('00000000-0000-0000-0000-0000000009c1', 'authenticated', 'authenticated', 'pac9a@test.local', '{"full_name":"Paciente Nueve A","birth_date":"1990-05-10"}'),
  ('00000000-0000-0000-0000-0000000009c2', 'authenticated', 'authenticated', 'pac9b@test.local', '{"full_name":"Paciente Nueve B","birth_date":"1991-06-11"}'),
  ('00000000-0000-0000-0000-0000000009c3', 'authenticated', 'authenticated', 'pac9c@test.local', '{"full_name":"Paciente Nueve C","birth_date":"1992-07-12"}'),
  ('00000000-0000-0000-0000-0000000009c4', 'authenticated', 'authenticated', 'pac9d@test.local', '{"full_name":"Paciente Nueve D","birth_date":"1993-08-13"}');

update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000009a0';
update public.profiles set role = 'nutricionista' where id in ('00000000-0000-0000-0000-0000000009b0', '00000000-0000-0000-0000-0000000009b1');

insert into public.patient_intakes (user_id, weight_kg, height_cm) values
  ('00000000-0000-0000-0000-0000000009c1', 82.0, 170.0),
  ('00000000-0000-0000-0000-0000000009c2', 70.0, 165.0),
  ('00000000-0000-0000-0000-0000000009c3', 75.0, 168.0),
  ('00000000-0000-0000-0000-0000000009c4', 77.0, 169.0);

-- ============ 1. Planes y ajustes públicos ============
select is((select monthly_price from public.subscription_plans where name = 'Starter'), 9.00::numeric, 'Starter cuesta $9');
select is((select patient_quota from public.subscription_plans where name = 'Starter'), 15, 'Starter tiene 15 pacientes');
select is((select daily_record_limit from public.subscription_plans where name = 'Starter'), 60, 'Starter tiene 60 registros por día');
select is((select monthly_price from public.subscription_plans where name = 'Profesional'), 19.00::numeric, 'Profesional cuesta $19');
select is((select patient_quota from public.subscription_plans where name = 'Profesional'), 50, 'Profesional tiene 50 pacientes');
select is((select daily_record_limit from public.subscription_plans where name = 'Profesional'), null::int, 'Profesional no tiene límite diario');
select is((select monthly_price from public.subscription_plans where name = 'Seguimiento mensual'), 40.00::numeric, 'Seguimiento mensual cuesta $40');
select is((select recipe_quota from public.subscription_plans where name = 'Seguimiento mensual'), 10, 'Seguimiento mensual trae 10 recetas');
select is((public.get_public_settings()->>'admin_email'), 'kerlyeliz19@gmail.com', 'el correo de la administradora es el inicial');
select is((public.get_public_settings()->>'free_patient_limit')::int, 3, 'el gratis permite 3 pacientes');
select is((public.get_public_settings()->>'free_daily_record_limit')::int, 10, 'el gratis permite 10 registros por día');

-- ============ 2. Ajustes de contacto: solo la administradora ============
select pg_temp.as_user('00000000-0000-0000-0000-0000000009b0');
select throws_ok($$ select public.admin_set_contact_settings('otro@test.local', 4, 12) $$,
  '42501', 'SOLO_ADMIN', 'una nutricionista no cambia el correo ni los límites');
select pg_temp.as_super();
select pg_temp.as_user('00000000-0000-0000-0000-0000000009a0');
select throws_ok($$ select public.admin_set_contact_settings('no-es-correo', 4, 12) $$,
  'P0001', 'DATOS_INVALIDOS', 'un correo inválido se rechaza');
select lives_ok($$ select public.admin_set_contact_settings('nueva@test.local', 4, 12) $$,
  'la administradora cambia el correo y los límites');
select pg_temp.as_super();
select is((select admin_email from public.app_settings where id = 1), 'nueva@test.local', 'el correo nuevo queda guardado');
select is((select free_patient_limit from public.app_settings where id = 1), 4, 'el cupo gratis nuevo queda guardado');
select is((select free_daily_record_limit from public.app_settings where id = 1), 12, 'el límite diario gratis nuevo queda guardado');

-- ============ 3. Nutricionista sin suscripción: cupo gratis de 3 pacientes ============
-- Cuatro solicitudes abiertas (insertadas como superusuario); acepta tres y la cuarta se rechaza.
-- Cambia el cupo gratis de vuelta a 3 para esta sección.
update public.app_settings set free_patient_limit = 3 where id = 1;
insert into public.care_requests (patient_id, message) values
  ('00000000-0000-0000-0000-0000000009c1', 'Quiero bajar de peso'),
  ('00000000-0000-0000-0000-0000000009c2', 'Quiero ganar músculo'),
  ('00000000-0000-0000-0000-0000000009c3', 'Necesito orientación'),
  ('00000000-0000-0000-0000-0000000009c4', 'Quiero comer mejor');

select pg_temp.as_user('00000000-0000-0000-0000-0000000009b0');
select lives_ok($$ select public.accept_care_request((select id from public.care_requests where patient_id = '00000000-0000-0000-0000-0000000009c1')) $$,
  'sin suscripción acepta el primer paciente con el cupo gratis');
select lives_ok($$ select public.accept_care_request((select id from public.care_requests where patient_id = '00000000-0000-0000-0000-0000000009c2')) $$,
  'acepta el segundo paciente');
select lives_ok($$ select public.accept_care_request((select id from public.care_requests where patient_id = '00000000-0000-0000-0000-0000000009c3')) $$,
  'acepta el tercer paciente');
select throws_ok($$ select public.accept_care_request((select id from public.care_requests where patient_id = '00000000-0000-0000-0000-0000000009c4')) $$,
  'P0001', 'CUPO_PLAN_LLENO', 'la cuarta solicitud se rechaza: cupo gratis lleno');
select is((public.nutri_limits()->>'patient_quota')::int, 3, 'nutri_limits: cupo gratis de 3 pacientes');
select is((public.nutri_limits()->>'daily_record_limit')::int, 12, 'nutri_limits: el límite diario gratis (12, el valor cambiado en la sección 2)');
select pg_temp.as_super();

-- ============ 4. Mejora de plan: Starter y luego Profesional ============
select pg_temp.as_user('00000000-0000-0000-0000-0000000009b0');
select lives_ok($$ select public.choose_plan((select id from public.subscription_plans where name = 'Starter')) $$,
  'la nutricionista pide Starter');
select pg_temp.as_super();
select set_config('t.inv_starter', (select id::text from public.invoices
  where payer_id = '00000000-0000-0000-0000-0000000009b0' and kind = 'suscripcion' and status = 'pendiente'
  order by created_at desc limit 1), true);

select pg_temp.as_user('00000000-0000-0000-0000-0000000009a0');
select lives_ok($$ select public.mark_invoice_paid(current_setting('t.inv_starter')::uuid) $$,
  'la administradora aprueba Starter');
select pg_temp.as_super();

select pg_temp.as_user('00000000-0000-0000-0000-0000000009b0');
select lives_ok($$ select public.choose_plan((select id from public.subscription_plans where name = 'Profesional')) $$,
  'con Starter activa puede pedir Profesional (queda pendiente)');
select pg_temp.as_super();
select set_config('t.inv_prof', (select id::text from public.invoices
  where payer_id = '00000000-0000-0000-0000-0000000009b0' and kind = 'suscripcion' and status = 'pendiente'
  order by created_at desc limit 1), true);

select pg_temp.as_user('00000000-0000-0000-0000-0000000009a0');
select lives_ok($$ select public.mark_invoice_paid(current_setting('t.inv_prof')::uuid) $$,
  'la administradora aprueba Profesional');
select pg_temp.as_super();
select is((select status from public.subscriptions s join public.subscription_plans p on p.id = s.plan_id
           where s.nutritionist_id = '00000000-0000-0000-0000-0000000009b0' and p.name = 'Starter'),
  'cancelada', 'al aprobar el cambio, Starter queda cancelada');
select is((select status from public.subscriptions s join public.subscription_plans p on p.id = s.plan_id
           where s.nutritionist_id = '00000000-0000-0000-0000-0000000009b0' and p.name = 'Profesional'),
  'activa', 'Profesional queda activa');
select is(public.nutri_patient_quota('00000000-0000-0000-0000-0000000009b0'), 50, 'con Profesional el cupo es de 50');

-- ============ 5. Pacientes: 10 recetas, saldo y renovación ============
select pg_temp.as_user('00000000-0000-0000-0000-0000000009c1');
select lives_ok($$ select public.choose_patient_plan((select id from public.subscription_plans where name = 'Seguimiento mensual')) $$,
  'el paciente pide Seguimiento mensual');
select pg_temp.as_super();
select set_config('t.inv_pac1', (select id::text from public.invoices
  where payer_id = '00000000-0000-0000-0000-0000000009c1' and kind = 'suscripcion_paciente' and status = 'pendiente'
  order by created_at desc limit 1), true);

select pg_temp.as_user('00000000-0000-0000-0000-0000000009a0');
select lives_ok($$ select public.mark_invoice_paid(current_setting('t.inv_pac1')::uuid) $$,
  'la administradora aprueba la factura del paciente');
select pg_temp.as_super();
select is((select recipes_left from public.patient_subscriptions
           where patient_id = '00000000-0000-0000-0000-0000000009c1' and status = 'activa'),
  10, 'al aprobar, el paciente tiene 10 recetas');

-- Renovación anticipada con 4 recetas que quedan: 14 y el vencimiento sube 30 días.
update public.patient_subscriptions set recipes_left = 4
 where patient_id = '00000000-0000-0000-0000-0000000009c1' and status = 'activa';
select pg_temp.as_user('00000000-0000-0000-0000-0000000009c1');
select lives_ok($$ select public.choose_patient_plan((select id from public.subscription_plans where name = 'Seguimiento mensual')) $$,
  'el paciente pide renovar estando vigente');
select pg_temp.as_super();
select set_config('t.inv_pac1b', (select id::text from public.invoices
  where payer_id = '00000000-0000-0000-0000-0000000009c1' and kind = 'suscripcion_paciente' and status = 'pendiente'
  order by created_at desc limit 1), true);
select set_config('t.end_pac1', (select current_period_end::text from public.patient_subscriptions
  where patient_id = '00000000-0000-0000-0000-0000000009c1' and status = 'activa'), true);

select pg_temp.as_user('00000000-0000-0000-0000-0000000009a0');
select lives_ok($$ select public.mark_invoice_paid(current_setting('t.inv_pac1b')::uuid) $$,
  'la administradora aprueba la renovación');
select throws_ok($$ select public.mark_invoice_paid(current_setting('t.inv_pac1')::uuid) $$,
  'P0001', 'ESTADO_INVALIDO', 'aprobar la misma factura dos veces no suma recetas otra vez');
select pg_temp.as_super();
select is((select recipes_left from public.patient_subscriptions
           where patient_id = '00000000-0000-0000-0000-0000000009c1' and status = 'activa'),
  14, 'renovar con 4 que quedan da 14 recetas');
select ok((select current_period_end from public.patient_subscriptions
           where patient_id = '00000000-0000-0000-0000-0000000009c1' and status = 'activa')
  between (current_setting('t.end_pac1')::timestamptz + interval '29 days')
      and (current_setting('t.end_pac1')::timestamptz + interval '31 days'),
  'la renovación suma 30 días al vencimiento anterior');

-- ============ 6. Admin → Suscripciones: pendientes y activas ============
select pg_temp.as_user('00000000-0000-0000-0000-0000000009b0');
select lives_ok($$ select public.choose_plan((select id from public.subscription_plans where name = 'Starter')) $$,
  'la nutricionista pide otra vez Starter (queda pendiente)');
select pg_temp.as_super();

select pg_temp.as_user('00000000-0000-0000-0000-0000000009c2');
select lives_ok($$ select public.choose_patient_plan((select id from public.subscription_plans where name = 'Seguimiento mensual')) $$,
  'el paciente B pide Seguimiento mensual (queda pendiente)');
select pg_temp.as_super();

select pg_temp.as_user('00000000-0000-0000-0000-0000000009a0');
select ok(exists (select 1 from json_array_elements(public.admin_subscriptions_overview()->'pending') e
                   where e->>'user_id' = '00000000-0000-0000-0000-0000000009c2' and e->>'audience' = 'paciente'),
  'la pendiente del paciente B aparece en Suscripciones');
select ok(exists (select 1 from json_array_elements(public.admin_subscriptions_overview()->'pending') e
                   where e->>'user_id' = '00000000-0000-0000-0000-0000000009b0' and e->>'audience' = 'nutricionista'),
  'la pendiente de la nutricionista aparece en Suscripciones');
select ok(exists (select 1 from json_array_elements(public.admin_subscriptions_overview()->'active') e
                   where e->>'user_id' = '00000000-0000-0000-0000-0000000009c1' and e->>'audience' = 'paciente'
                     and (e->>'recipes_left')::int = 14),
  'la activa del paciente A muestra 14 recetas');
select ok(exists (select 1 from json_array_elements(public.admin_subscriptions_overview()->'active') e
                   where e->>'user_id' = '00000000-0000-0000-0000-0000000009b0' and e->>'audience' = 'nutricionista'
                     and e->>'plan_name' = 'Profesional'),
  'la activa de la nutricionista es Profesional');
select is((select (e->>'amount')::numeric from json_array_elements(public.admin_subscriptions_overview()->'pending') e
            where e->>'user_id' = '00000000-0000-0000-0000-0000000009c2'), 40.00::numeric,
  'la pendiente del paciente B cobra $40');
select pg_temp.as_super();

select pg_temp.as_user('00000000-0000-0000-0000-0000000009b0');
select throws_ok($$ select public.admin_subscriptions_overview() $$, '42501', 'SOLO_ADMIN',
  'la nutricionista no ve Suscripciones');
select pg_temp.as_super();

select * from finish();
rollback;

-- Pruebas de la migración 13 (S13): recetas que llenan el calendario, entrega con descuento,
-- lectura del paciente, límite diario, copiar semana, agregar paciente y list/dashboard.
-- Usuarios: a10 = admin; n10 = nutricionista con 3 pacientes (cupo gratis lleno); n10b = otra nutricionista;
-- n10d = nutricionista sin pacientes; n10e = nutricionista en el límite diario.
-- Pacientes: p10a = plataforma con suscripción (10 recetas); p10b = plataforma sin suscripción;
-- p10p = propio; p10c3 = propio de n10b; p10busy = ajena (atención aceptada con n10b);
-- p10new y p10n2 = registradas sin atención; p10e = propio de n10e.
-- Recetas: rA1..rA12 (p10a), rB1 (p10b), rP1 (p10p), rO1 (p10c3), rSrc y rCopy (p10e).
begin;
select plan(47);

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

-- ============ Datos (como superusuario) ============
update public.app_settings set phase1 = true, phase2 = true, phase3 = false, patient_limit = 1000 where id = 1;

insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000010a0', 'authenticated', 'authenticated', 'admin10@test.local', '{"full_name":"Admin Diez"}'),
  ('00000000-0000-0000-0000-0000000010b0', 'authenticated', 'authenticated', 'nut10@test.local', '{"full_name":"Nutri Diez","birth_date":"1985-03-03"}'),
  ('00000000-0000-0000-0000-0000000010b1', 'authenticated', 'authenticated', 'nut10b@test.local', '{"full_name":"Nutri Diez B","birth_date":"1986-04-04"}'),
  ('00000000-0000-0000-0000-0000000010b3', 'authenticated', 'authenticated', 'nut10d@test.local', '{"full_name":"Nutri Diez D","birth_date":"1987-05-05"}'),
  ('00000000-0000-0000-0000-0000000010b4', 'authenticated', 'authenticated', 'nut10e@test.local', '{"full_name":"Nutri Diez E","birth_date":"1988-06-06"}'),
  ('00000000-0000-0000-0000-0000000010c0', 'authenticated', 'authenticated', 'pac10a@test.local', '{"full_name":"Paciente Diez A","birth_date":"1990-05-10"}'),
  ('00000000-0000-0000-0000-0000000010c1', 'authenticated', 'authenticated', 'pac10b@test.local', '{"full_name":"Paciente Diez B","birth_date":"1991-06-11"}'),
  ('00000000-0000-0000-0000-0000000010c2', 'authenticated', 'authenticated', 'pac10p@test.local', '{"full_name":"Paciente Diez P","birth_date":"1992-07-12"}'),
  ('00000000-0000-0000-0000-0000000010c3', 'authenticated', 'authenticated', 'pac10c3@test.local', '{"full_name":"Paciente Diez C3","birth_date":"1993-08-13"}'),
  ('00000000-0000-0000-0000-0000000010c4', 'authenticated', 'authenticated', 'busy10@test.local', '{"full_name":"Paciente Ocupada","birth_date":"1994-09-14"}'),
  ('00000000-0000-0000-0000-0000000010c5', 'authenticated', 'authenticated', 'new10@test.local', '{"full_name":"Paciente Nueva","birth_date":"1995-10-15"}'),
  ('00000000-0000-0000-0000-0000000010c6', 'authenticated', 'authenticated', 'pac10e@test.local', '{"full_name":"Paciente Diez E","birth_date":"1996-11-16"}'),
  ('00000000-0000-0000-0000-0000000010c7', 'authenticated', 'authenticated', 'n2_10@test.local', '{"full_name":"Paciente Dos","birth_date":"1997-12-17"}');

update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000010a0';
update public.profiles set role = 'nutricionista' where id in (
  '00000000-0000-0000-0000-0000000010b0', '00000000-0000-0000-0000-0000000010b1',
  '00000000-0000-0000-0000-0000000010b3', '00000000-0000-0000-0000-0000000010b4');

-- Atenciones: n10 con 3 pacientes (cupo gratis lleno), n10b con 2, n10e con 1, n10d con ninguno.
insert into public.care_requests (patient_id, nutritionist_id, status, origin, accepted_at) values
  ('00000000-0000-0000-0000-0000000010c0', '00000000-0000-0000-0000-0000000010b0', 'aceptada', 'plataforma', now()),
  ('00000000-0000-0000-0000-0000000010c1', '00000000-0000-0000-0000-0000000010b0', 'aceptada', 'plataforma', now()),
  ('00000000-0000-0000-0000-0000000010c2', '00000000-0000-0000-0000-0000000010b0', 'aceptada', 'propio', now()),
  ('00000000-0000-0000-0000-0000000010c3', '00000000-0000-0000-0000-0000000010b1', 'aceptada', 'propio', now()),
  ('00000000-0000-0000-0000-0000000010c4', '00000000-0000-0000-0000-0000000010b1', 'aceptada', 'plataforma', now()),
  ('00000000-0000-0000-0000-0000000010c6', '00000000-0000-0000-0000-0000000010b4', 'aceptada', 'propio', now());

-- Suscripción de p10a: 10 recetas al mes.
insert into public.patient_subscriptions (patient_id, plan_id, status, current_period_end, recipes_left)
select '00000000-0000-0000-0000-0000000010c0', sp.id, 'activa', now() + interval '30 days', 10
  from public.subscription_plans sp where sp.name = 'Seguimiento mensual';

-- Fijtures del calendario: no cuentan para el límite diario (flag del sistema).
select set_config('activa.registro_automatico', 'on', false);

insert into public.prescriptions (id, patient_id, nutritionist_id, kind, title) values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-0000-0000-0000000010c0', '00000000-0000-0000-0000-0000000010b0', 'dieta', 'Receta A1'),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-0000-0000-0000000010c0', '00000000-0000-0000-0000-0000000010b0', 'dieta', 'Receta A2'),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-0000-0000-0000000010c0', '00000000-0000-0000-0000-0000000010b0', 'dieta', 'Receta A3'),
  ('00000000-0000-4000-8000-000000000104', '00000000-0000-0000-0000-0000000010c0', '00000000-0000-0000-0000-0000000010b0', 'dieta', 'Receta A4'),
  ('00000000-0000-4000-8000-000000000105', '00000000-0000-0000-0000-0000000010c0', '00000000-0000-0000-0000-0000000010b0', 'dieta', 'Receta A5'),
  ('00000000-0000-4000-8000-000000000106', '00000000-0000-0000-0000-0000000010c0', '00000000-0000-0000-0000-0000000010b0', 'dieta', 'Receta A6'),
  ('00000000-0000-4000-8000-000000000107', '00000000-0000-0000-0000-0000000010c0', '00000000-0000-0000-0000-0000000010b0', 'dieta', 'Receta A7'),
  ('00000000-0000-4000-8000-000000000108', '00000000-0000-0000-0000-0000000010c0', '00000000-0000-0000-0000-0000000010b0', 'dieta', 'Receta A8'),
  ('00000000-0000-4000-8000-000000000109', '00000000-0000-0000-0000-0000000010c0', '00000000-0000-0000-0000-0000000010b0', 'dieta', 'Receta A9'),
  ('00000000-0000-4000-8000-000000000110', '00000000-0000-0000-0000-0000000010c0', '00000000-0000-0000-0000-0000000010b0', 'dieta', 'Receta A10'),
  ('00000000-0000-4000-8000-000000000111', '00000000-0000-0000-0000-0000000010c0', '00000000-0000-0000-0000-0000000010b0', 'dieta', 'Receta A11'),
  ('00000000-0000-4000-8000-000000000112', '00000000-0000-0000-0000-0000000010c0', '00000000-0000-0000-0000-0000000010b0', 'dieta', 'Receta A12'),
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-0000-0000-0000000010c1', '00000000-0000-0000-0000-0000000010b0', 'dieta', 'Receta B1'),
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-0000-0000-0000000010c2', '00000000-0000-0000-0000-0000000010b0', 'dieta', 'Receta P1'),
  ('00000000-0000-4000-8000-000000000401', '00000000-0000-0000-0000-0000000010c3', '00000000-0000-0000-0000-0000000010b1', 'dieta', 'Receta O1'),
  ('00000000-0000-4000-8000-000000000501', '00000000-0000-0000-0000-0000000010c6', '00000000-0000-0000-0000-0000000010b4', 'dieta', 'Receta fuente'),
  ('00000000-0000-4000-8000-000000000502', '00000000-0000-0000-0000-0000000010c6', '00000000-0000-0000-0000-0000000010b4', 'dieta', 'Receta destino');

insert into public.plan_days (patient_id, nutritionist_id, day, title, meals, prescription_id) values
  ('00000000-0000-0000-0000-0000000010c0', '00000000-0000-0000-0000-0000000010b0', '2026-12-01', 'Dia A1', 'Avena', '00000000-0000-4000-8000-000000000101'),
  ('00000000-0000-0000-0000-0000000010c0', '00000000-0000-0000-0000-0000000010b0', '2026-12-03', 'Dia A2', 'Pollo', '00000000-0000-4000-8000-000000000112'),
  ('00000000-0000-0000-0000-0000000010c2', '00000000-0000-0000-0000-0000000010b0', '2026-12-01', 'Dia P1', 'Ensalada', '00000000-0000-4000-8000-000000000301'),
  ('00000000-0000-0000-0000-0000000010c3', '00000000-0000-0000-0000-0000000010b1', '2026-12-01', 'Dia O1', 'Sopa', '00000000-0000-4000-8000-000000000401');

insert into public.plan_days (patient_id, nutritionist_id, day, title, meals, prescription_id)
select '00000000-0000-0000-0000-0000000010c6', '00000000-0000-0000-0000-0000000010b4', d::date, 'Fuente ' || d::text, 'Comida',
       '00000000-0000-4000-8000-000000000501'
  from generate_series('2026-12-07'::date, '2026-12-13'::date, interval '1 day') as d;

select set_config('activa.registro_automatico', 'off', false);

-- Entregar descuenta una sola vez; una segunda entrega de la misma receta falla sin tocar el saldo.
-- ============ 1. Reglas del calendario (nutricionista) ============
select pg_temp.as_user('00000000-0000-0000-0000-0000000010b0');
select throws_ok(
  $$ insert into public.plan_days (patient_id, day, title)
       values ('00000000-0000-0000-0000-0000000010c0', '2026-12-10', 'Sin receta') $$,
  'P0001', 'RECETA_REQUERIDA', 'un día nuevo sin receta se rechaza');
select throws_ok(
  $$ insert into public.plan_days (patient_id, day, title, prescription_id)
       values ('00000000-0000-0000-0000-0000000010c0', '2026-12-01', 'Ocupado', '00000000-0000-4000-8000-000000000112') $$,
  'P0001', 'DIA_OCUPADO', 'un día ya ocupado no se vuelve a llenar');
select lives_ok(
  $$ insert into public.plan_days (patient_id, day, title, prescription_id)
       values ('00000000-0000-0000-0000-0000000010c0', '2026-12-05', 'Dia A3', '00000000-0000-4000-8000-000000000112') $$,
  'un día libre dentro de una receta borrador se agrega');
select lives_ok($$ select public.deliver_prescription('00000000-0000-4000-8000-000000000101') $$,
  'la nutricionista entrega la receta A1 de p10a');
select is((select status from public.prescriptions where id = '00000000-0000-4000-8000-000000000101'), 'entregada',
  'la receta A1 queda entregada');
select throws_ok($$ select public.deliver_prescription('00000000-0000-4000-8000-000000000101') $$,
  'P0001', 'RECETA_CERRADA', 'entregar dos veces la misma receta da error');
select throws_ok(
  $$ insert into public.plan_days (patient_id, day, title, prescription_id)
       values ('00000000-0000-0000-0000-0000000010c0', '2026-12-08', 'A receta entregada', '00000000-0000-4000-8000-000000000101') $$,
  'P0001', 'RECETA_CERRADA', 'no se agregan días a una receta entregada');

-- ============ 2. Saldo de recetas de p10a: 10 al mes ============
select is((select (public.patient_recipe_balance('00000000-0000-0000-0000-0000000010c0')->>'left')::int), 9,
  'la entrega de A1 deja 9 recetas de saldo');
select is((select (public.patient_recipe_balance('00000000-0000-0000-0000-0000000010c0')->>'quota')::int), 10,
  'el plan trae 10 recetas');
do $$
declare i int;
begin
  for i in 2..10 loop
    perform public.deliver_prescription(('00000000-0000-4000-8000-0000000001' || lpad(i::text, 2, '0'))::uuid);
  end loop;
end $$;
select is((select (public.patient_recipe_balance('00000000-0000-0000-0000-0000000010c0')->>'left')::int), 0,
  'diez entregas dejan el saldo en 0');
select throws_ok($$ select public.deliver_prescription('00000000-0000-4000-8000-000000000111') $$,
  'P0001', 'SIN_RECETAS', 'la receta 11 no se entrega sin saldo');
select is((select status from public.prescriptions where id = '00000000-0000-4000-8000-000000000111'), 'borrador',
  'la receta sin saldo sigue en borrador');
select throws_ok($$ select public.deliver_prescription('00000000-0000-4000-8000-000000000201') $$,
  'P0001', 'SIN_SUSCRIPCION_PACIENTE', 'un paciente de plataforma sin suscripción no recibe recetas');
select lives_ok($$ select public.deliver_prescription('00000000-0000-4000-8000-000000000301') $$,
  'una receta de paciente propio se entrega sin suscripción');
select is((select counts_against_patient from public.prescriptions where id = '00000000-0000-4000-8000-000000000301'), false,
  'la receta de paciente propio no descuenta');
select throws_ok($$ select public.deliver_prescription('00000000-0000-4000-8000-000000000401') $$,
  '42501', null, 'otra nutricionista no entrega recetas de una paciente ajena');

-- ============ 3. Lectura del paciente ============
select pg_temp.as_user('00000000-0000-0000-0000-0000000010c0');
select is((select count(*)::int from public.plan_days), 1,
  'p10a ve solo el día de la receta entregada (el borrador y el día ajeno no)');
select is((select count(*)::int from public.plan_days where patient_id = '00000000-0000-0000-0000-0000000010c3'), 0,
  'p10a no ve los días de otra paciente');
select pg_temp.as_super();
update public.patient_subscriptions set current_period_end = now() - interval '1 day'
 where patient_id = '00000000-0000-0000-0000-0000000010c0';
select pg_temp.as_user('00000000-0000-0000-0000-0000000010c0');
select is((select count(*)::int from public.plan_days), 1,
  'la receta entregada sigue visible aunque la suscripción venza');
select lives_ok($$ select public.set_plan_day_done((select id from public.plan_days
       where patient_id = '00000000-0000-0000-0000-0000000010c0' and day = '2026-12-01'), true, 'Hecho') $$,
  'p10a marca cumplido un día de receta entregada');
select throws_ok($$ select public.set_plan_day_done((select id from public.plan_days
       where patient_id = '00000000-0000-0000-0000-0000000010c0' and day = '2026-12-03'), true, null) $$,
  'P0001', 'NO_EXISTE', 'p10a no puede marcar un día de receta en borrador');
update public.plan_days set title = 'Hackeado' where day = '2026-12-01';
select is((select title from public.plan_days where day = '2026-12-01'), 'Dia A1',
  'p10a no puede cambiar el título con un update directo');
select pg_temp.as_super();

-- Entrega a p10p (propio, sin suscripción): sus días se ven aunque no tenga suscripción.
select pg_temp.as_user('00000000-0000-0000-0000-0000000010c2');
select is((select count(*)::int from public.plan_days), 1,
  'el paciente propio ve los días de su receta entregada sin suscripción');
select pg_temp.as_super();
select pg_temp.as_user('00000000-0000-0000-0000-0000000010c3');
select is((select count(*)::int from public.plan_days where patient_id = '00000000-0000-0000-0000-0000000010c3'), 0,
  'la paciente no ve el día de una receta sin entregar');
select pg_temp.as_super();

-- ============ 4. Límite diario (nutricionista n10e, límite gratis 10) ============
select set_config('activa.registro_automatico', 'off', false);
insert into public.prescriptions (patient_id, nutritionist_id, kind, title) values
  ('00000000-0000-0000-0000-0000000010c6', '00000000-0000-0000-0000-0000000010b4', 'dieta', 'Registro 1'),
  ('00000000-0000-0000-0000-0000000010c6', '00000000-0000-0000-0000-0000000010b4', 'dieta', 'Registro 2'),
  ('00000000-0000-0000-0000-0000000010c6', '00000000-0000-0000-0000-0000000010b4', 'dieta', 'Registro 3'),
  ('00000000-0000-0000-0000-0000000010c6', '00000000-0000-0000-0000-0000000010b4', 'dieta', 'Registro 4'),
  ('00000000-0000-0000-0000-0000000010c6', '00000000-0000-0000-0000-0000000010b4', 'dieta', 'Registro 5'),
  ('00000000-0000-0000-0000-0000000010c6', '00000000-0000-0000-0000-0000000010b4', 'dieta', 'Registro 6'),
  ('00000000-0000-0000-0000-0000000010c6', '00000000-0000-0000-0000-0000000010b4', 'dieta', 'Registro 7'),
  ('00000000-0000-0000-0000-0000000010c6', '00000000-0000-0000-0000-0000000010b4', 'dieta', 'Registro 8'),
  ('00000000-0000-0000-0000-0000000010c6', '00000000-0000-0000-0000-0000000010b4', 'dieta', 'Registro 9');
select set_config('activa.registro_automatico', 'off', false);

select pg_temp.as_user('00000000-0000-0000-0000-0000000010b4');
select lives_ok($$ select public.save_prescription(null, '00000000-0000-0000-0000-0000000010c6', 'dieta', 'Registro 10', 'Texto') $$,
  'el décimo registro de hoy se guarda');
select throws_ok($$ select public.save_prescription(null, '00000000-0000-0000-0000-0000000010c6', 'dieta', 'Registro 11', 'Texto') $$,
  'P0001', 'LIMITE_DIARIO', 'el registro 11 de hoy se rechaza');
select throws_ok($$ select public.copy_plan_week('00000000-0000-0000-0000-0000000010c6', '2026-12-07', '2026-12-14',
       '00000000-0000-4000-8000-000000000502') $$,
  'P0001', 'LIMITE_DIARIO', 'copiar una semana que no cabe en el límite diario da error');
select is((select count(*)::int from public.plan_days
            where patient_id = '00000000-0000-0000-0000-0000000010c6' and day between '2026-12-14' and '2026-12-20'), 0,
  'una copia que no cabe no deja días nuevos');
select lives_ok($$ select public.nutri_add_patient('n2_10@test.local') $$,
  'agregar paciente no cuenta para el límite diario (la Semana 1 es automática)');
select is((select (public.nutri_dashboard()->'limits'->>'records_today')::int), 10,
  'el tablero muestra los 10 registros de hoy (sin la Semana 1)');
select pg_temp.as_super();

-- ============ 5. Agregar paciente (nutricionista n10: cupo gratis lleno) ============
select pg_temp.as_user('00000000-0000-0000-0000-0000000010b0');
select throws_ok($$ select public.nutri_add_patient('nadie@test.local') $$,
  'P0001', 'PACIENTE_NO_REGISTRADO', 'un correo sin cuenta no se agrega');
select throws_ok($$ select public.nutri_add_patient('busy10@test.local') $$,
  'P0001', 'PACIENTE_OCUPADO', 'una paciente con atención aceptada no se agrega');
select throws_ok($$ select public.nutri_add_patient('new10@test.local') $$,
  'P0001', 'CUPO_PLAN_LLENO', 'con el cupo gratis lleno no se agrega otra paciente');
select is((select (public.nutri_limits()->>'patient_quota')::int), 3,
  'el cupo gratis es de 3 pacientes');
select is((select (public.nutri_limits()->>'patients_used')::int), 3,
  'se cuentan las 3 pacientes aceptadas (de los dos orígenes)');
select pg_temp.as_super();

-- Caso feliz: n10d no tiene pacientes.
select pg_temp.as_user('00000000-0000-0000-0000-0000000010b3');
select is((select (public.nutri_limits()->>'records_today')::int), 0,
  'la nutricionista sin registros hoy empieza en 0');
select lives_ok($$ select public.nutri_add_patient('new10@test.local') $$,
  'la nutricionista agrega a una paciente registrada');
select is((select (public.nutri_limits()->>'records_today')::int), 0,
  'agregar a la paciente no cuenta para el límite diario');
select pg_temp.as_super();
select is((select origin from public.care_requests
            where patient_id = '00000000-0000-0000-0000-0000000010c5' and status = 'aceptada'), 'propio',
  'la atención queda aceptada con origen propio');
select is((select status from public.prescriptions
            where patient_id = '00000000-0000-0000-0000-0000000010c5' and title = 'Semana 1'), 'borrador',
  'la Semana 1 queda en borrador');
select is((select count(*)::int from public.plan_days
            where patient_id = '00000000-0000-0000-0000-0000000010c5'
              and prescription_id = (select id from public.prescriptions
                                      where patient_id = '00000000-0000-0000-0000-0000000010c5' and title = 'Semana 1')), 7,
  'la Semana 1 trae 7 días dentro de la receta');
select is((select count(*)::int from public.plan_days
            where patient_id = '00000000-0000-0000-0000-0000000010c5' and day > public.gye_today()), 7,
  'los 7 días empiezan a partir de mañana');

-- ============ 6. Lista de pacientes, tablero y errores de entrada ============
select pg_temp.as_user('00000000-0000-0000-0000-0000000010b0');
select is((select recipes_left from public.list_my_patients() where patient_id = '00000000-0000-0000-0000-0000000010c0'), 0,
  'la lista muestra el saldo de recetas del paciente de plataforma');
select ok((select origin = 'propio' and recipes_left is null from public.list_my_patients()
            where patient_id = '00000000-0000-0000-0000-0000000010c2'),
  'la lista marca el origen propio y no muestra saldo');
select throws_ok($$ select public.save_prescription(null, '00000000-0000-0000-0000-0000000010c0', 'tarea', 'Mal', 'x') $$,
  'P0001', 'DATOS_INVALIDOS', 'un tipo de receta desconocido se rechaza');
select pg_temp.as_super();

-- Fase 2 apagada: no se agrega paciente.
update public.app_settings set phase2 = false where id = 1;
select pg_temp.as_user('00000000-0000-0000-0000-0000000010b3');
select throws_ok($$ select public.nutri_add_patient('new10@test.local') $$,
  'P0001', 'FASE_NO_ACTIVA', 'con la fase 2 apagada no se agregan pacientes');
select pg_temp.as_super();
update public.app_settings set phase2 = true where id = 1;

-- ============ 7. La admin no tiene límite ============
select pg_temp.as_user('00000000-0000-0000-0000-0000000010a0');
select lives_ok($$ select public.save_prescription(null, '00000000-0000-0000-0000-0000000010c6', 'rutina', 'Admin rutina', 'Texto') $$,
  'la administradora guarda recetas sin límite diario');
select pg_temp.as_super();

select * from finish();
rollback;

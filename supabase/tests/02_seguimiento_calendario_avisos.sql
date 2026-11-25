-- Pruebas de la migración 3: seguimiento, calendario del plan y avisos.
-- Usuarios: a1 = admin, b1/b2 = nutricionistas, c1/c2 = pacientes (ambos con ficha y solicitud aceptada por b1 en c1).
begin;
select plan(30);

-- ============ Datos de prueba (como superusuario; el trigger crea los perfiles) ============
-- Cupo alto para que el registro de pacientes de prueba no choque con el cupo.
update public.app_settings set phase2 = true, patient_limit = 1000 where id = 1;

insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'authenticated', 'authenticated', 'admin3@test.local', '{"full_name":"Admin Prueba"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'authenticated', 'authenticated', 'nut3a@test.local', '{"full_name":"Nutri Uno","birth_date":"1985-03-03"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'authenticated', 'authenticated', 'nut3b@test.local', '{"full_name":"Nutri Dos","birth_date":"1985-03-03"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'authenticated', 'authenticated', 'pac3a@test.local', '{"full_name":"Paciente Uno","birth_date":"1990-05-10"}'),
  ('00000000-0000-0000-0000-0000000000c2', 'authenticated', 'authenticated', 'pac3b@test.local', '{"full_name":"Paciente Dos","birth_date":"1992-08-08"}');

update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000a1';
update public.profiles set role = 'nutricionista' where id in ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b2');

-- Desde la migración 4 aceptar una solicitud exige suscripción activa (SIN_SUSCRIPCION).
insert into public.subscriptions (nutritionist_id, plan_id, status, current_period_end)
select n.id, (select p.id from public.subscription_plans p where p.name = 'Starter'), 'activa', now() + interval '30 days'
  from (values ('00000000-0000-0000-0000-0000000000b1'::uuid), ('00000000-0000-0000-0000-0000000000b2'::uuid)) as n(id);

-- Fichas (el paciente la llenaría en la app; aquí como superusuario).
insert into public.patient_intakes (user_id, weight_kg, height_cm) values
  ('00000000-0000-0000-0000-0000000000c1', 82.0, 170.0),
  ('00000000-0000-0000-0000-0000000000c2', 70.0, 165.0);

-- Desde la migración 6 la agenda pagada exige suscripción activa del paciente (§6.8).
insert into public.patient_subscriptions (patient_id, plan_id, status, current_period_end)
select p.id, (select sp.id from public.subscription_plans sp where sp.name = 'Seguimiento mensual'), 'activa', now() + interval '30 days'
  from (values ('00000000-0000-0000-0000-0000000000c1'::uuid), ('00000000-0000-0000-0000-0000000000c2'::uuid)) as p(id);

-- ============ Solicitud y aceptación (fase 2 encendida) ============
do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select lives_ok($$ select public.request_care('Quiero bajar de peso') $$, 'el paciente pide atención');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select lives_ok($$ select public.accept_care_request((select id from public.care_requests
                     where patient_id = '00000000-0000-0000-0000-0000000000c1' and status = 'abierta')) $$,
  'el nutricionista b1 acepta la solicitud');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

-- ============ 1-2. El nutricionista crea días; otro nutricionista no puede ============
do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select lives_ok(
  $$ insert into public.plan_days (patient_id, day, title, meals)
       select '00000000-0000-0000-0000-0000000000c1', d::date, 'Dia ' || to_char(d, 'DD/MM'), 'Desayuno: avena'
         from generate_series('2026-11-23'::date, '2026-11-29'::date, interval '1 day') as d $$,
  'el nutricionista de la paciente crea 7 días del plan');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select throws_ok(
  $$ insert into public.plan_days (patient_id, day, title)
       values ('00000000-0000-0000-0000-0000000000c1', '2026-12-01', 'Dia ajeno') $$,
  '42501', null, 'otro nutricionista no puede crear días de una paciente que no es suya');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

-- ============ 3-5. La paciente ve sus días; otra paciente no; marca cumplido ============
do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select is((select count(*)::int from public.plan_days), 7, 'la paciente ve sus 7 días');

select lives_ok(
  $$ select public.set_plan_day_done((select id from public.plan_days
       where patient_id = '00000000-0000-0000-0000-0000000000c1' and day = '2026-11-23'), true, 'Hoy cumpli') $$,
  'la paciente marca el día como cumplido con una nota');
select ok((select done_at is not null from public.plan_days
            where patient_id = '00000000-0000-0000-0000-0000000000c1' and day = '2026-11-23'),
  'el día queda marcado como cumplido');

update public.plan_days set title = 'Hackeado'
 where patient_id = '00000000-0000-0000-0000-0000000000c1' and day = '2026-11-23';
select is((select title from public.plan_days
            where patient_id = '00000000-0000-0000-0000-0000000000c1' and day = '2026-11-23'),
  'Dia 23/11', 'la paciente no puede cambiar el título con un update directo');

do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select is((select count(*)::int from public.plan_days
            where patient_id = '00000000-0000-0000-0000-0000000000c1'), 0,
  'otra paciente no ve los días de la paciente uno');
select throws_ok(
  $$ select public.set_plan_day_done((select id from public.plan_days
       where patient_id = '00000000-0000-0000-0000-0000000000c1' and day = '2026-11-24'), true, null) $$,
  'P0001', 'NO_EXISTE', 'otra paciente no puede marcar días ajenos');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

-- ============ 6-8. Copiar una semana y resumen de la lista de pacientes ============
do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select is(public.copy_plan_week('00000000-0000-0000-0000-0000000000c1', '2026-11-23', '2026-11-30'), 7,
  'copy_plan_week copia 7 días y devuelve 7');
select is((select count(*)::int from public.plan_days
            where patient_id = '00000000-0000-0000-0000-0000000000c1'
              and day between '2026-11-30' and '2026-12-06'), 7,
  'la semana copiada cae en las fechas nuevas');
select ok((select done_at is null and patient_note is null from public.plan_days
            where patient_id = '00000000-0000-0000-0000-0000000000c1' and day = '2026-11-30'),
  'la copia no trae done_at ni patient_note');
select is((select days_total from public.list_my_patients()
            where patient_id = '00000000-0000-0000-0000-0000000000c1'), 14,
  'la lista de pacientes cuenta 14 días del plan');
select is((select days_done from public.list_my_patients()
            where patient_id = '00000000-0000-0000-0000-0000000000c1'), 1,
  'la lista de pacientes cuenta 1 día cumplido');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select throws_ok(
  $$ select public.copy_plan_week('00000000-0000-0000-0000-0000000000c1', '2026-11-23', '2026-12-07') $$,
  '42501', null, 'otro nutricionista no puede copiar la semana de una paciente ajena');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

-- ============ 9-12. Seguimientos: solo el nutricionista de la paciente lo escribe ============
do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select lives_ok(
  $$ insert into public.followups (patient_id, weight_kg, observations, recommendations)
       values ('00000000-0000-0000-0000-0000000000c1', 81.5, 'Buen avance esta semana', 'Mas agua y caminar') $$,
  'el nutricionista registra un seguimiento');
select is((select last_followup_date from public.list_my_patients()
            where patient_id = '00000000-0000-0000-0000-0000000000c1'), current_date,
  'la lista de pacientes muestra el último seguimiento');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select is((select count(*)::int from public.followups), 1, 'la paciente ve su seguimiento');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select throws_ok(
  $$ insert into public.followups (patient_id, observations, recommendations)
       values ('00000000-0000-0000-0000-0000000000c1', 'Intento ajeno', 'Intento ajeno') $$,
  '42501', null, 'otro nutricionista no puede registrar seguimientos de la paciente');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

-- ============ 13-19. Avisos (los crean los triggers; se leen como superusuario) ============
select is((select count(*)::int from public.notifications
            where user_id = '00000000-0000-0000-0000-0000000000b1' and kind = 'solicitud_nueva'), 1,
  'crear la solicitud avisa al nutricionista (solicitud_nueva)');
select is((select count(*)::int from public.notifications
            where user_id = '00000000-0000-0000-0000-0000000000c1' and kind = 'solicitud_aceptada'), 1,
  'aceptar la solicitud avisa a la paciente (solicitud_aceptada)');
select is((select count(*)::int from public.notifications
            where user_id = '00000000-0000-0000-0000-0000000000b1' and kind = 'dia_cumplido'), 1,
  'marcar un día cumplido avisa al nutricionista (dia_cumplido)');
select is((select count(*)::int from public.notifications
            where user_id = '00000000-0000-0000-0000-0000000000c1' and kind = 'dia_nuevo'), 1,
  'los días nuevos avisan una vez, sin repetir en la hora (dia_nuevo)');
select is((select count(*)::int from public.notifications
            where user_id = '00000000-0000-0000-0000-0000000000c1' and kind = 'seguimiento_nuevo'), 1,
  'un seguimiento nuevo avisa a la paciente (seguimiento_nuevo)');

do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select is((select count(*)::int from public.notifications
            where user_id = '00000000-0000-0000-0000-0000000000c1'), 0,
  'otra paciente no ve los avisos de la paciente uno');

do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select lives_ok($$ select public.mark_all_notifications_read() $$, 'la paciente marca todos sus avisos como leídos');
select is((select count(*)::int from public.notifications where read_at is null), 0,
  'después de marcar, la paciente no tiene avisos sin leer');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

-- ============ 20-21. Con la fase 2 apagada no se escribe nada nuevo ============
update public.app_settings set phase2 = false where id = 1;

do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select throws_ok(
  $$ insert into public.followups (patient_id, observations, recommendations)
       values ('00000000-0000-0000-0000-0000000000c1', 'Con fase apagada', 'Con fase apagada') $$,
  'P0001', 'FASE_NO_ACTIVA', 'con la fase 2 apagada no se registra un seguimiento');
select throws_ok(
  $$ insert into public.plan_days (patient_id, day, title)
       values ('00000000-0000-0000-0000-0000000000c1', '2026-12-07', 'Dia sin fase') $$,
  'P0001', 'FASE_NO_ACTIVA', 'con la fase 2 apagada no se agregan días al plan');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

select * from finish();
rollback;

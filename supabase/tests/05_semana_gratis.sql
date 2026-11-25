-- Pruebas de la migración 6: semana gratis, chequeo diario, suscripción del paciente y guía (§6.10).
-- Usuarios: n1/n2 = nutricionistas, f = paciente mujer de 25 años, m = paciente hombre,
-- c = paciente con condiciones de salud, s = paciente sin ficha, a = admin.
begin;
select plan(42);

-- ============ Datos (como superusuario) ============
update public.app_settings set phase1 = true, phase2 = true, phase3 = false, patient_limit = 1000 where id = 1;

insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'authenticated', 'authenticated', 'nut5a@test.local', '{"full_name":"Nutri A","birth_date":"1985-03-03"}'),
  ('00000000-0000-0000-0000-0000000000e2', 'authenticated', 'authenticated', 'nut5b@test.local', '{"full_name":"Nutri B","birth_date":"1985-03-03"}'),
  ('00000000-0000-0000-0000-0000000000e3', 'authenticated', 'authenticated', 'pac5f@test.local', '{"full_name":"Paciente F","birth_date":"2001-06-15"}'),
  ('00000000-0000-0000-0000-0000000000e4', 'authenticated', 'authenticated', 'pac5m@test.local', '{"full_name":"Paciente M","birth_date":"1990-01-10"}'),
  ('00000000-0000-0000-0000-0000000000e5', 'authenticated', 'authenticated', 'pac5c@test.local', '{"full_name":"Paciente C","birth_date":"1995-01-01"}'),
  ('00000000-0000-0000-0000-0000000000e6', 'authenticated', 'authenticated', 'pac5s@test.local', '{"full_name":"Paciente S","birth_date":"1995-01-01"}'),
  ('00000000-0000-0000-0000-0000000000e7', 'authenticated', 'authenticated', 'adm5@test.local', '{"full_name":"Admin Cinco","birth_date":"1980-01-01"}');
update public.profiles set role = 'nutricionista' where id in ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e2');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000e7';
update public.profiles set sex = 'femenino' where id in ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000e6');
update public.profiles set sex = 'masculino' where id = '00000000-0000-0000-0000-0000000000e4';

-- Ficha: f = IMC 25,9 (bajar de peso); m = IMC 29,4 (mantener); c = con condición de salud.
insert into public.patient_intakes (user_id, weight_kg, height_cm, goal, activity_level, conditions) values
  ('00000000-0000-0000-0000-0000000000e3', 75.0, 170.0, 'bajar_peso', 'ligero', '{}'),
  ('00000000-0000-0000-0000-0000000000e4', 90.0, 175.0, 'mantener', 'moderado', '{}'),
  ('00000000-0000-0000-0000-0000000000e5', 80.0, 170.0, null, 'sedentario', '{diabetes}');

-- Aislar la prueba del contenido real (migración 7): se borran dentro de esta transacción (rollback al final).
delete from public.plan_templates;

-- Plantillas de prueba: una general y una específica (femenino 18–29, IMC 25–30, bajar de peso).
insert into public.plan_templates (name, sex, age_min, age_max, bmi_min, bmi_max, goal, kcal_base, status) values
  ('Prueba general', 'cualquiera', 18, 120, 0, 99, null, 2000, 'borrador'),
  ('Prueba femenino 18-29 bajar peso', 'femenino', 18, 29, 25, 30, 'bajar_peso', 1800, 'borrador');
-- Cuatro comidas por día y los 7 días, en ambas plantillas (28 ítems cada una).
insert into public.plan_template_items (template_id, day_number, at_time, kind, title, detail, sort)
select t.id, d.n, m.at, 'comida', 'Comida de prueba', 'Porción de prueba', m.s
  from public.plan_templates t
  cross join generate_series(1, 7) d(n)
  cross join (values (time '07:30', 1), (time '10:30', 2), (time '13:00', 3), (time '19:30', 4)) m(at, s)
 where t.name like 'Prueba%';

-- f tiene nutricionista asignada (n1).
insert into public.care_requests (patient_id, nutritionist_id, status, accepted_at) values
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000e1', 'aceptada', now());

-- m tiene agenda de su nutricionista (para probar la lectura con y sin suscripción).
-- Días sin receta: filas anteriores a la migración 13. El trigger que exige receta se apaga solo para cargarlas.
alter table public.plan_days disable trigger plan_days_receta_guard;
insert into public.plan_days (patient_id, nutritionist_id, day, title, meals) values
  ('00000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-0000000000e1', current_date, 'Día 1 de prueba', 'Almuerzo'),
  ('00000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-0000000000e1', current_date + 1, 'Día 2 de prueba', 'Cena');
alter table public.plan_days enable trigger plan_days_receta_guard;

-- Guía: una publicada y una oculta.
insert into public.guide_entries (slug, category, title, published) values
  ('guia-prueba-pub', 'compras', 'Guía publicada de prueba', true),
  ('guia-prueba-oculta', 'compras', 'Guía oculta de prueba', false);

select set_config('test.plan', (select id::text from public.subscription_plans where name = 'Seguimiento mensual'), true);

-- ============ 1. Sin ficha y con condiciones de salud ============
do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e6","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select throws_ok($$ select public.assign_trial() $$, 'P0001', 'FALTA_FICHA', '§6.10.1: sin ficha responde FALTA_FICHA');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select throws_ok($$ select public.assign_trial() $$, 'P0001', 'REQUIERE_NUTRICIONISTA',
  '§6.10.1: con condiciones de salud responde REQUIERE_NUTRICIONISTA');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

-- ============ 2. Elección de plantilla ============
do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select is((select template_name from public.assign_trial()), 'Prueba femenino 18-29 bajar peso',
  '§6.10.2: mujer de 25 años con IMC 27 que quiere bajar recibe la específica');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e4","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select is((select template_name from public.assign_trial()), 'Prueba general',
  '§6.10.2: hombre recibe la general');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

-- ============ 3. Idempotencia ============
do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select lives_ok($$ select public.assign_trial() $$, '§6.10.3: segunda llamada a assign_trial no falla');
select is((select count(*)::int from public.trials), 1, '§6.10.3: sigue existiendo una sola semana');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;
select is((select count(*)::int from public.trial_items where user_id = '00000000-0000-0000-0000-0000000000e3'), 28,
  '§6.10.3: los ítems se copiaron una sola vez (7 días × 4)');

-- Guardar ítems de referencia (como superusuario) antes de cambiar de rol.
select set_config('test.f1item', (select id::text from public.trial_items
  where user_id = '00000000-0000-0000-0000-0000000000e3' and day_number = 1 order by sort limit 1), true);
select set_config('test.d2item', (select id::text from public.trial_items
  where user_id = '00000000-0000-0000-0000-0000000000e3' and day_number = 2 order by sort limit 1), true);

-- ============ 4. Solo el día abierto se ve ============
do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select is((select count(*)::int from public.trial_items where day_number = 1), 4,
  '§6.10.4: el paciente lee los 4 ítems del día 1');
select is((select count(*)::int from public.trial_items where day_number = 2), 0,
  '§6.10.4: el paciente no lee ítems del día 2 (cerrado)');
select is(public.my_trial()->'days'->1->>'unlocked', 'false',
  '§6.10.4: my_trial marca el día 2 como cerrado');
select is(json_array_length(public.my_trial()->'days'->1->'items'), 0,
  '§6.10.4: my_trial no expone los ítems del día 2');

-- ============ 5. La mitad de ítems no basta sin chequeo ============
select lives_ok($$ select public.set_trial_item_done(current_setting('test.f1item')::uuid, true) $$,
  '§6.10.5: marca el primer ítem del día 1');
select lives_ok($$ select public.set_trial_item_done((select id from public.trial_items
  where day_number = 1 order by sort offset 1 limit 1), true) $$,
  '§6.10.5: marca el segundo ítem del día 1 (la mitad)');
select ok((public.my_trial()->'days'->0->>'completed_at') is null,
  '§6.10.5: la mitad marcada sin chequeo no completa el día 1');
select lives_ok($$ select public.save_checkin(4, 74.5, 8, 'Me sentí bien') $$,
  '§6.10.5: el chequeo del día se guarda');
select ok((public.my_trial()->'days'->0->>'completed_at') is not null,
  '§6.10.5: con chequeo el día 1 queda completado');
select is((public.my_trial()->'days'->1->>'unlocked_on')::date, public.gye_today() + 1,
  '§6.10.5: el día 2 se abre mañana');
select is(public.my_trial()->'days'->1->>'unlocked', 'false',
  '§6.10.5: el día 2 sigue cerrado hoy');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

-- ============ 6. Ítem de día cerrado y otros pacientes ============
do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select throws_ok($$ select public.set_trial_item_done(current_setting('test.d2item')::uuid, true) $$,
  'P0001', 'NO_EXISTE', '§6.10.6: marcar un ítem del día 2 cerrado responde NO_EXISTE');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e4","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select is((select count(*)::int from public.trials where user_id = '00000000-0000-0000-0000-0000000000e3'), 0,
  '§6.10.6: otro paciente no ve la semana de f');
select is((select count(*)::int from public.trial_items where user_id = '00000000-0000-0000-0000-0000000000e3'), 0,
  '§6.10.6: otro paciente no ve los ítems de f');
select throws_ok($$ select public.set_trial_item_done(current_setting('test.f1item')::uuid, false) $$,
  'P0001', 'NO_EXISTE', '§6.10.6: otro paciente no puede marcar ítems de f');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

-- ============ 7. Nutricionista asignada ============
do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select is((select count(*)::int from public.trial_items where user_id = '00000000-0000-0000-0000-0000000000e3'), 28,
  '§6.10.7: la nutricionista asignada ve los 28 ítems');
select is((select count(*)::int from public.daily_checkins where user_id = '00000000-0000-0000-0000-0000000000e3'), 1,
  '§6.10.7: la nutricionista asignada ve el chequeo');
select is(json_array_length(public.my_trial('00000000-0000-0000-0000-0000000000e3')->'days'->1->'items'), 4,
  '§6.10.7: my_trial de la paciente muestra los ítems del día 2 a la nutricionista');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select is((select count(*)::int from public.trial_items where user_id = '00000000-0000-0000-0000-0000000000e3'), 0,
  '§6.10.7: otra nutricionista no ve los ítems');
select is((select count(*)::int from public.daily_checkins where user_id = '00000000-0000-0000-0000-0000000000e3'), 0,
  '§6.10.7: otra nutricionista no ve los chequeos');
select throws_ok($$ select public.my_trial('00000000-0000-0000-0000-0000000000e3') $$,
  '42501', 'NO_ES_TU_PACIENTE', '§6.10.7: otra nutricionista no puede pedir la semana');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

-- ============ 8 y 9. Suscripción del paciente y agenda pagada ============
update public.app_settings set phase2 = false where id = 1;
do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e4","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select throws_ok($$ select public.choose_patient_plan(current_setting('test.plan')::uuid) $$,
  'P0001', 'FASE_NO_ACTIVA', '§6.10.8: con fase 2 apagada responde FASE_NO_ACTIVA');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

update public.app_settings set phase2 = true where id = 1;
do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e4","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select lives_ok($$ select public.choose_patient_plan(current_setting('test.plan')::uuid) $$,
  '§6.10.8: con fase 2 encendida el paciente elige el plan');
select is((select status from public.my_patient_subscription()), 'pendiente',
  '§6.10.8: la suscripción queda pendiente hasta el pago');
select is((select count(*)::int from public.invoices where kind = 'suscripcion_paciente'
           and payer_id = '00000000-0000-0000-0000-0000000000e4'), 1,
  '§6.10.8: se crea una factura suscripcion_paciente');
select is((select count(*)::int from public.plan_days), 0,
  '§6.10.9: sin suscripción el paciente lee 0 días de la agenda');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e7","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select lives_ok($$ select public.mark_invoice_paid((select id from public.invoices
  where kind = 'suscripcion_paciente' and payer_id = '00000000-0000-0000-0000-0000000000e4')) $$,
  '§6.10.8: el admin marca pagada la factura del paciente');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

select is((select status from public.patient_subscriptions
           where patient_id = '00000000-0000-0000-0000-0000000000e4'), 'activa',
  '§6.10.8: al pagar, la suscripción queda activa');
select ok(exists (select 1 from public.care_requests
  where patient_id = '00000000-0000-0000-0000-0000000000e4' and status = 'abierta'),
  '§6.10.8: al pagar hay una solicitud de atención abierta');

do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e4","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select is((select count(*)::int from public.plan_days), 2,
  '§6.10.9: con suscripción activa el paciente lee su agenda');
select is((select status from public.my_patient_subscription()), 'activa',
  '§6.10.8: el paciente ve su suscripción activa');
select lives_ok($$ select public.choose_patient_plan(current_setting('test.plan')::uuid) $$,
  '§6.10.8: con suscripción activa puede pedir otro plan (queda pendiente)');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

-- ============ 10. Guía ============
do $$ begin set local role anon; end $$;
select is((select count(*)::int from public.guide_entries where slug like 'guia-prueba-%'), 1,
  '§6.10.10: anon lee solo las guías publicadas');
select throws_ok($$ insert into public.guide_entries (slug, category, title) values ('guia-prueba-anon', 'compras', 'Anon') $$,
  '42501', 'new row violates row-level security policy for table "guide_entries"',
  '§6.10.10: anon no puede insertar guías');
do $$ begin reset role; end $$;

do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select lives_ok($$ insert into public.guide_entries (slug, category, title) values ('guia-prueba-nutri', 'compras', 'Guía de la nutricionista') $$,
  '§6.10.10: una nutricionista sí puede insertar guías');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

select * from finish();
rollback;

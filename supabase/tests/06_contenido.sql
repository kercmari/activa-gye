-- Pruebas de la migración 7: contenido de plantillas, guía y elección de plantilla (§Migración 7).
-- Usuarios: n1/n2 = nutricionistas, a3 = mujer 25 años IMC 27 (bajar peso), a4 = hombre 40 años IMC 27,
-- a5 = sin ficha, a6 = con diabetes, a7 = 55 años (bienestar), a8 = 25 años con objetivo sin plantilla, adm = admin.
begin;
select plan(36);

-- ============ Datos (como superusuario) ============
update public.app_settings set phase1 = true, phase2 = true, phase3 = false, patient_limit = 1000 where id = 1;

insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000006a1', 'authenticated', 'authenticated', 'n6a1@test.local', '{"full_name":"Nutri 6 A","birth_date":"1985-03-03"}'),
  ('00000000-0000-0000-0000-0000000006a2', 'authenticated', 'authenticated', 'n6a2@test.local', '{"full_name":"Nutri 6 B","birth_date":"1985-03-03"}'),
  ('00000000-0000-0000-0000-0000000006a3', 'authenticated', 'authenticated', 'p6a3@test.local',
     jsonb_build_object('full_name', 'Paciente 6 F', 'birth_date', to_char(public.gye_today() - interval '25 years', 'YYYY-MM-DD'))),
  ('00000000-0000-0000-0000-0000000006a4', 'authenticated', 'authenticated', 'p6a4@test.local', '{"full_name":"Paciente 6 M","birth_date":"1986-04-10"}'),
  ('00000000-0000-0000-0000-0000000006a5', 'authenticated', 'authenticated', 'p6a5@test.local', '{"full_name":"Paciente 6 S","birth_date":"1995-01-01"}'),
  ('00000000-0000-0000-0000-0000000006a6', 'authenticated', 'authenticated', 'p6a6@test.local', '{"full_name":"Paciente 6 C","birth_date":"1995-01-01"}'),
  ('00000000-0000-0000-0000-0000000006a7', 'authenticated', 'authenticated', 'p6a7@test.local', '{"full_name":"Paciente 6 B","birth_date":"1971-03-01"}'),
  ('00000000-0000-0000-0000-0000000006a8', 'authenticated', 'authenticated', 'p6a8@test.local',
     jsonb_build_object('full_name', 'Paciente 6 R', 'birth_date', to_char(public.gye_today() - interval '25 years', 'YYYY-MM-DD'))),
  ('00000000-0000-0000-0000-0000000006a9', 'authenticated', 'authenticated', 'adm6@test.local', '{"full_name":"Admin Seis","birth_date":"1980-01-01"}');
update public.profiles set role = 'nutricionista' where id in ('00000000-0000-0000-0000-0000000006a1', '00000000-0000-0000-0000-0000000006a2');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000006a9';
update public.profiles set sex = 'femenino' where id in ('00000000-0000-0000-0000-0000000006a3', '00000000-0000-0000-0000-0000000006a6', '00000000-0000-0000-0000-0000000006a7', '00000000-0000-0000-0000-0000000006a8');
update public.profiles set sex = 'masculino' where id = '00000000-0000-0000-0000-0000000006a4';

-- Fichas: IMC a3 26,9 (bajar), a4 26,9 (bajar), a6 con diabetes, a7 22,0 (bienestar), a8 27 (resistencia).
insert into public.patient_intakes (user_id, weight_kg, height_cm, goal, activity_level, conditions) values
  ('00000000-0000-0000-0000-0000000006a3', 75.0, 167.0, 'bajar_peso', 'ligero', '{}'),
  ('00000000-0000-0000-0000-0000000006a4', 85.0, 177.8, 'bajar_peso', 'moderado', '{}'),
  ('00000000-0000-0000-0000-0000000006a6', 80.0, 170.0, 'mantener', 'sedentario', '{diabetes}'),
  ('00000000-0000-0000-0000-0000000006a7', 60.0, 165.0, 'bienestar', 'ligero', '{}'),
  ('00000000-0000-0000-0000-0000000006a8', 75.0, 167.0, 'resistencia', 'moderado', '{}');

-- a3 tiene nutricionista asignada (n1).
insert into public.care_requests (patient_id, nutritionist_id, status, accepted_at) values
  ('00000000-0000-0000-0000-0000000006a3', '00000000-0000-0000-0000-0000000006a1', 'aceptada', now());

-- Funciones auxiliares: ejecutan una consulta como el usuario dado y devuelven el texto del resultado o 'ERR:<mensaje>'.
create or replace function pg_temp.as_user(p_uid uuid, p_sql text) returns text language plpgsql as $$
declare m text;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    execute p_sql into m;
  exception when others then
    m := 'ERR:' || sqlerrm;
  end;
  reset role;
  return m;
end $$;

-- ============ 1–11. Contenido de las plantillas y la guía ============
select is((select count(*)::int from public.plan_templates), 10, '10 plantillas (9 + respaldo)');
select is((select count(*)::int from public.plan_templates where is_fallback), 1, 'exactamente 1 plantilla de respaldo');
select is((select count(*)::int from public.plan_templates where status <> 'borrador' or author_name <> 'Pendiente de revisión'), 0, 'todas en borrador con autor pendiente de revisión');
select is((select count(*)::int from public.plan_templates t where not exists (select 1 from public.plan_template_items i where i.template_id = t.id)), 0, 'ninguna plantilla sin ítems');
select is((select count(*)::int from (select t.id from public.plan_templates t join public.plan_template_items i on i.template_id = t.id group by t.id having count(distinct i.day_number) = 7) x), 10, 'las 10 plantillas tienen los 7 días');
select is((select count(*)::int from (select template_id, day_number from public.plan_template_items where kind = 'comida' group by template_id, day_number having count(*) >= 5) x), 70, 'cada día (70) tiene al menos 5 comidas');
select is((select count(*)::int from (select template_id, day_number from public.plan_template_items group by template_id, day_number having count(*) filter (where kind = 'rutina') = 1 and count(*) filter (where kind = 'habito') = 1) x), 70, 'cada día tiene 1 rutina y 1 hábito');
select is((select count(*)::int from public.plan_template_items a join public.plan_template_items b on b.template_id = a.template_id and b.day_number = a.day_number + 1 and b.at_time = a.at_time and b.kind = 'comida' and a.kind = 'comida' and b.at_time = time '13:00' and b.title = a.title), 0, 'ningún almuerzo se repite en días seguidos');
select ok((select count(*) from public.guide_entries) >= 12, 'la guía tiene al menos 12 entradas');
select is((select count(distinct category)::int from public.guide_entries), 7, 'la guía cubre las 7 categorías');
select ok(not exists (select 1 from public.guide_entries where cardinality(steps) not between 3 and 5 or cardinality(do_items) = 0 or cardinality(avoid_items) = 0 or source is null), 'cada entrada tiene 3–5 pasos, qué hacer, qué evitar y fuente');

-- ============ 12–21. Elección de plantilla y reglas de assign_trial ============
select ok(pg_temp.as_user('00000000-0000-0000-0000-0000000006a5', 'select (public.assign_trial()).template_name') like '%FALTA_FICHA%', 'sin ficha: FALTA_FICHA');
select ok(pg_temp.as_user('00000000-0000-0000-0000-0000000006a6', 'select (public.assign_trial()).template_name') not like '%REQUIERE_NUTRICIONISTA%', 'con condiciones de salud: también recibe plantilla');
select is(pg_temp.as_user('00000000-0000-0000-0000-0000000006a3', 'select (public.assign_trial()).template_name'), 'Bajar de peso · mujeres 18–29 · IMC 25–30', 'mujer de 25 años, IMC 27, bajar peso: plantilla específica');
select is(pg_temp.as_user('00000000-0000-0000-0000-0000000006a4', 'select (public.assign_trial()).template_name'), 'Bajar de peso · hombres 18–59 · IMC 25–30', 'hombre de 40 años, IMC 27, bajar peso: plantilla de su sexo');
select is(pg_temp.as_user('00000000-0000-0000-0000-0000000006a7', 'select (public.assign_trial()).template_name'), 'Bienestar · adultos de 50 años o más', '55 años, bienestar: plantilla de 50+');
select is(pg_temp.as_user('00000000-0000-0000-0000-0000000006a8', 'select (public.assign_trial()).template_name'), 'Plan general de respaldo', 'objetivo sin plantilla candidata: plantilla de respaldo');
select is(pg_temp.as_user('00000000-0000-0000-0000-0000000006a3', 'select (public.assign_trial()).template_name'), 'Bajar de peso · mujeres 18–29 · IMC 25–30', 'assign_trial es idempotente');
select is((select count(*)::int from public.trial_items where user_id = '00000000-0000-0000-0000-0000000006a3'), 49, 'la semana tiene 49 ítems (7 días × 7), sin duplicar');
select ok(exists (select 1 from public.trials t join public.plan_templates p on p.id = t.template_id where t.user_id = '00000000-0000-0000-0000-0000000006a3' and not p.is_fallback), 'la semana de a3 usa una plantilla no de respaldo');
select is((select count(*)::int from public.trial_days where user_id = '00000000-0000-0000-0000-0000000006a3' and unlocked_on is null), 6, 'solo el día 1 abre hoy; los días 2–7 quedan cerrados');

-- ============ 22–24. Lo que ve la paciente ============
select is(pg_temp.as_user('00000000-0000-0000-0000-0000000006a3', 'select count(*)::text from public.trial_items where day_number = 1'), '7', 'la paciente lee los 7 ítems del día 1');
select is(pg_temp.as_user('00000000-0000-0000-0000-0000000006a3', 'select count(*)::text from public.trial_items where day_number = 2'), '0', 'la paciente no lee ítems de un día cerrado');
select is(pg_temp.as_user('00000000-0000-0000-0000-0000000006a3', 'select (public.my_trial()->''days''->1->>''unlocked'') || '':'' || json_array_length(public.my_trial()->''days''->1->''items'')::text'), 'false:0', 'my_trial: día 2 cerrado y sin ítems');

-- ============ 25–31. Progreso diario ============
-- Marca 4 de 7 ítems del día 1 (la mitad o más) sin chequeo: el día no se completa.
do $$ declare r record; begin
  for r in select id from public.trial_items where user_id = '00000000-0000-0000-0000-0000000006a3' and day_number = 1 order by at_time limit 4 loop
    perform pg_temp.as_user('00000000-0000-0000-0000-0000000006a3', format('select public.set_trial_item_done(%L::uuid, true)::text', r.id));
  end loop;
end $$;
select is((select completed_at is null from public.trial_days where user_id = '00000000-0000-0000-0000-0000000006a3' and day_number = 1), true, 'mitad de ítems sin chequeo: el día 1 no se completa');
select is((select count(*)::int from public.trial_items where user_id = '00000000-0000-0000-0000-0000000006a3' and day_number = 1 and done_at is not null), 4, 'los 4 ítems quedan marcados');
select is(pg_temp.as_user('00000000-0000-0000-0000-0000000006a3', 'select (public.save_checkin(4, 74.5, 6, null)).mood::text'), '4', 'la paciente guarda su chequeo diario');
select ok((select completed_at is not null from public.trial_days where user_id = '00000000-0000-0000-0000-0000000006a3' and day_number = 1), 'con chequeo y la mitad de ítems, el día 1 se completa');
select is((select unlocked_on from public.trial_days where user_id = '00000000-0000-0000-0000-0000000006a3' and day_number = 2), public.gye_today() + 1, 'el día 2 se abre mañana');
select is(public.trial_day_open('00000000-0000-0000-0000-0000000006a3', 2), false, 'el día 2 sigue cerrado hoy');
select ok(pg_temp.as_user('00000000-0000-0000-0000-0000000006a3', format('select public.set_trial_item_done(%L::uuid, true)::text', (select id from public.trial_items where user_id = '00000000-0000-0000-0000-0000000006a3' and day_number = 2 limit 1))) like '%NO_EXISTE%', 'no se puede marcar un ítem de un día cerrado');

-- ============ 32–36. Privacidad entre pacientes y nutricionistas, guía pública ============
select is(pg_temp.as_user('00000000-0000-0000-0000-0000000006a4', 'select count(*)::text from public.trial_items where user_id = ''00000000-0000-0000-0000-0000000006a3'''), '0', 'otro paciente no ve la semana de a3');
select is(pg_temp.as_user('00000000-0000-0000-0000-0000000006a1', 'select count(*)::text from public.trial_items where user_id = ''00000000-0000-0000-0000-0000000006a3'''), '49', 'su nutricionista ve los 49 ítems');
select is(pg_temp.as_user('00000000-0000-0000-0000-0000000006a2', 'select count(*)::text from public.trial_items where user_id = ''00000000-0000-0000-0000-0000000006a3'''), '0', 'otra nutricionista no ve la semana de a3');
select is(pg_temp.as_user('00000000-0000-0000-0000-0000000006a1', 'select count(*)::text from public.daily_checkins where user_id = ''00000000-0000-0000-0000-0000000006a3'''), '1', 'su nutricionista ve el chequeo');
do $$ declare c int; begin
  set local role anon;
  select count(*) into c from public.guide_entries;
  reset role;
  perform set_config('test.anon_guides', c::text, true);
end $$;
select is(current_setting('test.anon_guides'), '12', 'anon lee las 12 entradas publicadas');

select * from finish();
rollback;

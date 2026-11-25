-- Pruebas de la migración 14 (arreglos RV1): el guard de límite diario toma un candado por nutricionista
-- antes de contar, para que dos altas concurrentes no salten el límite.
-- Usuarios: a11 = nutricionista propia de p11 (límite gratis, sin registros hoy).
begin;
select plan(3);

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

update public.app_settings set phase1 = true, phase2 = true, phase3 = false, patient_limit = 1000 where id = 1;

insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000011b0', 'authenticated', 'authenticated', 'nut11@test.local', '{"full_name":"Nutri Once","birth_date":"1985-03-03"}'),
  ('00000000-0000-0000-0000-0000000011c0', 'authenticated', 'authenticated', 'pac11@test.local', '{"full_name":"Paciente Once","birth_date":"1990-05-10"}');
update public.profiles set role = 'nutricionista' where id = '00000000-0000-0000-0000-0000000011b0';
insert into public.care_requests (patient_id, nutritionist_id, status, origin, accepted_at) values
  ('00000000-0000-0000-0000-0000000011c0', '00000000-0000-0000-0000-0000000011b0', 'aceptada', 'propio', now());

-- Antes de la alta no hay candados de registro en esta sesión.
select pg_temp.as_super();
select is((select count(*)::int from pg_locks where locktype = 'advisory' and pid = pg_backend_pid()), 0,
  'sin candados de asesor antes de registrar');

-- Una alta como nutricionista: el guard toma el candado del nutricionista antes de contar.
select pg_temp.as_user('00000000-0000-0000-0000-0000000011b0');
select lives_ok($$ select public.save_prescription(null, '00000000-0000-0000-0000-0000000011c0', 'dieta', 'Registro 1', 'Texto') $$,
  'la primera alta del día se guarda');

select pg_temp.as_super();
select ok((select count(*) from pg_locks where locktype = 'advisory' and pid = pg_backend_pid() and granted) > 0,
  'el guard toma un candado transaccional por nutricionista antes de contar');

select * from finish();
rollback;

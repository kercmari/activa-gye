-- Solo los correos de admin_allowlist pueden pasar a administrador (25/11/2026).
begin;
select plan(8);

update public.app_settings set phase1 = true, phase3 = true where id = 1;
insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000013a1', 'authenticated', 'authenticated', 'Permitida@Test.local',
   '{"full_name":"Permitida","birth_date":"1990-01-01","account_type":"paciente"}'),
  ('00000000-0000-0000-0000-0000000013b1', 'authenticated', 'authenticated', 'otra@test.local',
   '{"full_name":"Otra","birth_date":"1990-01-01","account_type":"paciente"}');
insert into public.admin_allowlist (email) values ('permitida@test.local');

-- 1. Nadie del cliente lee ni escribe la lista.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000013b1","role":"authenticated"}', true);
select throws_ok($$ select * from public.admin_allowlist $$, '42501', null, 'un usuario no puede leer la lista');
select throws_ok($$ insert into public.admin_allowlist (email) values ('otra@test.local') $$, '42501', null, 'un usuario no puede agregarse a la lista');
select throws_ok($$ select public.can_be_admin('00000000-0000-0000-0000-0000000013b1') $$, '42501', null, 'can_be_admin no se llama desde el cliente');

-- 2. El admin (seed) cambia roles.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select throws_ok($$ select public.admin_set_role('00000000-0000-0000-0000-0000000013b1', 'admin') $$,
  '42501', 'ADMIN_NO_PERMITIDO', 'un correo fuera de la lista no pasa a administrador');
select lives_ok($$ select public.admin_set_role('00000000-0000-0000-0000-0000000013b1', 'nutricionista') $$,
  'los demás roles se siguen cambiando');
select lives_ok($$ select public.admin_set_role('00000000-0000-0000-0000-0000000013a1', 'admin') $$,
  'un correo de la lista (sin importar mayúsculas) pasa a administrador');
select is((select bool_and(can_be_admin) filter (where email ilike 'permitida@%')
             and not bool_or(can_be_admin) filter (where email = 'otra@test.local')
           from public.admin_list_users(null)), true, 'admin_list_users marca can_be_admin');

reset role;
select is((select role::text from public.profiles where id = '00000000-0000-0000-0000-0000000013b1'),
  'nutricionista', 'la cuenta fuera de la lista quedó como nutricionista, no admin');

select * from finish();
rollback;

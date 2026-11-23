-- Pruebas de registro con tipo de cuenta, solicitud de nutricionista, admin_list_users y foto de perfil (22/11/2026).
begin;
select plan(28);

-- ============ Datos (como superusuario) ============
update public.app_settings set phase1 = true, phase2 = true, phase3 = false, patient_limit = 1000 where id = 1;

-- 1-3. Alta como nutricionista: entra como usuario, solicitud pendiente, sin cupo.
insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000008e1', 'authenticated', 'authenticated', 'nut8a@test.local',
   '{"full_name":"Nutri Ocho A","birth_date":"1985-03-03","account_type":"nutricionista"}');

select is((select role::text from public.profiles where id = '00000000-0000-0000-0000-0000000008e1'),
  'usuario', 'alta nutricionista: el rol sigue en usuario');
select is((select requested_role from public.profiles where id = '00000000-0000-0000-0000-0000000008e1'),
  'nutricionista', 'alta nutricionista: requested_role = nutricionista');
select is((select nutri_status from public.profiles where id = '00000000-0000-0000-0000-0000000008e1'),
  'pendiente', 'alta nutricionista: nutri_status = pendiente');

-- 4-5. Cupo lleno: el paciente nuevo falla y el nutricionista nuevo entra.
update public.app_settings set patient_limit = (
  select count(*) from public.profiles where role = 'usuario' and requested_role is null) where id = 1;

select throws_ok($$
  insert into auth.users (id, aud, role, email, raw_user_meta_data) values
    ('00000000-0000-0000-0000-0000000008f9', 'authenticated', 'authenticated', 'pac8x@test.local',
     '{"full_name":"Paciente Nuevo","birth_date":"1990-05-10","account_type":"paciente"}')
$$, 'P0001', 'CUPO_LLENO', 'cupo lleno: un paciente nuevo falla con CUPO_LLENO');

select lives_ok($$
  insert into auth.users (id, aud, role, email, raw_user_meta_data) values
    ('00000000-0000-0000-0000-0000000008e2', 'authenticated', 'authenticated', 'nut8b@test.local',
     '{"full_name":"Nutri Ocho B","birth_date":"1984-04-04","account_type":"nutricionista"}')
$$, 'cupo lleno: un nutricionista nuevo sí entra');

-- 6. El conteo público no cuenta a los nutricionistas pendientes.
select ok(exists(select 1 from public.profiles where nutri_status = 'pendiente'),
  'hay al menos un nutricionista pendiente en el conteo');
select is((public.get_public_settings() ->> 'patients_count')::int,
  (select count(*)::int from public.profiles where role = 'usuario' and requested_role is null),
  'patients_count no cuenta al nutricionista pendiente');

-- 7. Tipo de cuenta desconocido.
select throws_ok($$
  insert into auth.users (id, aud, role, email, raw_user_meta_data) values
    ('00000000-0000-0000-0000-0000000008c0', 'authenticated', 'authenticated', 'otro8@test.local',
     '{"full_name":"Otro","birth_date":"1990-05-10","account_type":"otro"}')
$$, 'P0001', 'DATOS_INVALIDOS', 'account_type = otro falla con DATOS_INVALIDOS');

-- Ahora el cupo ya no importa para pruebas de rol: dejamos el límite alto otra vez.
update public.app_settings set patient_limit = 1000 where id = 1;

-- 8-11. El propio nutricionista no cambia su solicitud ni su estado, pero sí su foto.
do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000008e1","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select throws_ok($$ update public.profiles set requested_role = null
  where id = '00000000-0000-0000-0000-0000000008e1' $$, 'P0001', 'ROL_PROTEGIDO',
  'no puede borrar su propio requested_role');
select throws_ok($$ update public.profiles set nutri_status = 'aprobado'
  where id = '00000000-0000-0000-0000-0000000008e1' $$, 'P0001', 'ROL_PROTEGIDO',
  'no puede aprobarse a sí mismo');
select lives_ok($$ update public.profiles set avatar_path = '00000000-0000-0000-0000-0000000008e1/avatar.jpg'
  where id = '00000000-0000-0000-0000-0000000008e1' $$, 'sí puede cambiar su avatar_path');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;
select is((select avatar_path from public.profiles where id = '00000000-0000-0000-0000-0000000008e1'),
  '00000000-0000-0000-0000-0000000008e1/avatar.jpg', 'avatar_path quedó guardado');

-- Admin: cuenta de prueba con rol admin.
insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000008a1', 'authenticated', 'authenticated', 'admin8@test.local',
   '{"full_name":"Admin Ocho","birth_date":"1980-01-01"}');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000008a1';

-- 12. Un no admin no revisa solicitudes.
do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000008e1","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select throws_ok($$ select public.admin_review_nutri('00000000-0000-0000-0000-0000000008e1', true) $$,
  '42501', 'SOLO_ADMIN', 'no admin: admin_review_nutri da SOLO_ADMIN');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

-- 13-15. Admin aprueba a la primera nutricionista.
do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000008a1","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select lives_ok($$ select public.admin_review_nutri('00000000-0000-0000-0000-0000000008e1', true) $$,
  'admin aprueba la solicitud');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;
select is((select role::text from public.profiles where id = '00000000-0000-0000-0000-0000000008e1'),
  'nutricionista', 'aprobada: rol nutricionista');
select is((select nutri_status from public.profiles where id = '00000000-0000-0000-0000-0000000008e1'),
  'aprobado', 'aprobada: nutri_status aprobado');

-- 16-18. Admin rechaza a la segunda: sigue como usuario.
do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000008a1","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select lives_ok($$ select public.admin_review_nutri('00000000-0000-0000-0000-0000000008e2', false) $$,
  'admin rechaza la solicitud');
-- 19. Repetir sobre una solicitud que ya no está pendiente.
select throws_ok($$ select public.admin_review_nutri('00000000-0000-0000-0000-0000000008e2', true) $$,
  'P0001', 'SIN_SOLICITUD', 'repetir sobre no pendiente: SIN_SOLICITUD');
-- 20. Lista de administrador: columnas nuevas.
select is((select requested_role from public.admin_list_users() where id = '00000000-0000-0000-0000-0000000008e2'),
  'nutricionista', 'admin_list_users trae requested_role');
select is((select nutri_status from public.admin_list_users() where id = '00000000-0000-0000-0000-0000000008e2'),
  'rechazado', 'admin_list_users trae nutri_status');
select is((select avatar_path from public.admin_list_users() where id = '00000000-0000-0000-0000-0000000008e1'),
  '00000000-0000-0000-0000-0000000008e1/avatar.jpg', 'admin_list_users trae avatar_path');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

select is((select role::text from public.profiles where id = '00000000-0000-0000-0000-0000000008e2'),
  'usuario', 'rechazada: sigue como usuario');
select is((select nutri_status from public.profiles where id = '00000000-0000-0000-0000-0000000008e2'),
  'rechazado', 'rechazada: nutri_status rechazado');
select is((select count(*)::int from public.notifications
  where user_id = '00000000-0000-0000-0000-0000000008e1' and kind = 'nutri_solicitud'),
  1, 'la aprobación deja un aviso a la persona');

-- 21-24. Storage: fotos de perfil solo en la carpeta propia; staff las ve.
-- Actor: paciente sin rol de staff (la nutricionista aprobada ya sí es staff).
insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000008c1', 'authenticated', 'authenticated', 'pac8c@test.local',
   '{"full_name":"Paciente Ocho C","birth_date":"1990-05-10"}');
insert into storage.objects (bucket_id, name)
  values ('avatars', '00000000-0000-0000-0000-0000000008e2/avatar.jpg');

do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000008c1","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select throws_ok($$ insert into storage.objects (bucket_id, name)
  values ('avatars', '00000000-0000-0000-0000-0000000008e2/otra.jpg') $$,
  '42501', 'new row violates row-level security policy for table "objects"',
  'un usuario no sube a la carpeta de otro');
select is((select count(*)::int from storage.objects
  where bucket_id = 'avatars' and name = '00000000-0000-0000-0000-0000000008e2/avatar.jpg'),
  0, 'un usuario no ve la foto de otro');
select lives_ok($$ insert into storage.objects (bucket_id, name)
  values ('avatars', '00000000-0000-0000-0000-0000000008c1/avatar.jpg') $$,
  'un usuario sube a su propia carpeta');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

do $$ begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000008a1","role":"authenticated"}', true);
  set local role authenticated;
end $$;
select is((select count(*)::int from storage.objects
  where bucket_id = 'avatars' and name = '00000000-0000-0000-0000-0000000008e2/avatar.jpg'),
  1, 'staff (admin) ve la foto de la solicitud');
do $$ begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

select * from finish();
rollback;

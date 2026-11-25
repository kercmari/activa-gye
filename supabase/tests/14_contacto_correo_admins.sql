-- El formulario de contacto avisa a cada administradora (campana + correo) (25/11/2026).
begin;
select plan(6);

update public.app_settings set phase1 = true, phase3 = false where id = 1;
insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000014a1', 'authenticated', 'authenticated', 'segunda@test.local',
   '{"full_name":"Segunda","birth_date":"1990-01-01","account_type":"paciente"}');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000014a1';

-- 1. Alguien sin cuenta escribe por el formulario.
set local role anon;
select lives_ok($$ insert into public.contact_messages (name, email, subject, message)
  values ('Visitante', 'visita@test.local', 'Consulta de planes', 'Hola, quiero saber los precios.') $$,
  'el formulario se sigue enviando sin cuenta');
reset role;

select is((select count(*)::int from public.notifications
            where kind = 'contacto' and title = 'Nuevo mensaje de contacto: Consulta de planes'),
          (select count(*)::int from public.profiles where role = 'admin'),
          'cada administradora recibe un aviso de contacto');
select ok((select count(*) from public.profiles where role = 'admin') >= 2, 'hay dos administradoras en la prueba');
select ok(exists (select 1 from public.notifications where kind = 'contacto'
                   and user_id = '00000000-0000-0000-0000-0000000014a1'
                   and body like 'De Visitante (visita@test.local):%Hola, quiero saber los precios.'
                   and link = '/admin/mensajes'),
          'el aviso trae quién escribe, su correo, el mensaje y el enlace a Mensajes');
select ok(not exists (select 1 from public.notifications n join public.profiles p on p.id = n.user_id
                       where n.kind = 'contacto' and p.role <> 'admin'),
          'ninguna cuenta que no es admin recibe el aviso');

-- 2. El trigger no se llama desde el cliente.
set local role authenticated;
select throws_ok($$ select public.contact_notify_admins() $$, '42501', null, 'contact_notify_admins no se llama desde el cliente');
reset role;

select * from finish();
rollback;

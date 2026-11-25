-- El formulario de contacto avisa a cada administradora (campana + correo) (25/11/2026).
begin;
select plan(15);

update public.app_settings set phase1 = true, phase3 = false where id = 1;
-- El tope por hora cuenta todos los mensajes: se borran los del seed para que el conteo sea exacto
-- (todo se deshace con el rollback del final).
delete from public.contact_messages;
insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000014a1', 'authenticated', 'authenticated', 'segunda@test.local',
   '{"full_name":"Segunda","birth_date":"1990-01-01","account_type":"paciente"}'),
  ('00000000-0000-0000-0000-0000000014b1', 'authenticated', 'authenticated', 'nutri14@test.local',
   '{"full_name":"Nutri","birth_date":"1990-01-01","account_type":"paciente"}');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000014a1';
update public.profiles set role = 'nutricionista' where id = '00000000-0000-0000-0000-0000000014b1';
-- El trigger de correos solo llama a la función si conoce su dirección y la clave.
select set_config('app.functions_url', 'http://127.0.0.1:9/functions/v1', true);
select set_config('app.service_role_key', 'clave-de-prueba', true);
create temp table cola0 as select count(*)::int n from net.http_request_queue;
grant select on cola0 to anon, authenticated;

select ok((select count(*) from public.profiles where role = 'admin') >= 2, 'hay dos administradoras en la prueba');

-- 1. Alguien sin cuenta escribe por el formulario (fase 3 apagada).
set local role anon;
select lives_ok($$ insert into public.contact_messages (name, email, subject, message)
  values ('Visitante', 'visita@test.local', 'Consulta de planes', 'Hola, quiero saber los precios.') $$,
  'el formulario se sigue enviando sin cuenta');
reset role;

select is((select count(*)::int from public.notifications
            where kind = 'contacto' and title = 'Nuevo mensaje de contacto: Consulta de planes'),
          (select count(*)::int from public.profiles where role = 'admin'),
          'cada administradora recibe un aviso de contacto');
select ok(exists (select 1 from public.notifications where kind = 'contacto'
                   and user_id = '00000000-0000-0000-0000-0000000014a1'
                   and body like 'Mensaje escrito por un visitante del sitio. De Visitante (visita@test.local):%Hola, quiero saber los precios.'
                   and link = '/admin/mensajes'),
          'el aviso trae quién escribe, su correo, el mensaje y el enlace a Mensajes');
select ok(not exists (select 1 from public.notifications where kind = 'contacto'
                       and user_id = '00000000-0000-0000-0000-0000000014b1'),
          'la nutricionista no recibe el aviso');
select is((select count(*)::int from net.http_request_queue) - (select n from cola0),
          (select count(*)::int from public.profiles where role = 'admin'),
          'con la fase 3 apagada, el contacto pide un correo por administradora');

-- 2. Los demás avisos siguen dependiendo de la fase 3.
delete from cola0; insert into cola0 select count(*)::int from net.http_request_queue;
select public.notify('00000000-0000-0000-0000-0000000014b1', 'otro', 'Aviso', null, null);
select is((select count(*)::int from net.http_request_queue), (select n from cola0),
          'otro aviso con la fase 3 apagada no pide correo');
update public.app_settings set phase3 = true where id = 1;
select public.notify('00000000-0000-0000-0000-0000000014b1', 'otro', 'Aviso', null, null);
select is((select count(*)::int from net.http_request_queue), (select n from cola0) + 1,
          'otro aviso con la fase 3 encendida pide correo');
update public.app_settings set phase3 = false where id = 1;

-- 3. Textos largos se recortan y el asunto no trae saltos de línea.
insert into public.contact_messages (name, email, subject, message)
  values ('Larga', 'larga@test.local', 'Asunto' || chr(10) || repeat('x', 150), repeat('m', 3000));
select ok((select bool_and(title = 'Nuevo mensaje de contacto: ' || left('Asunto ' || repeat('x', 150), 120)
                       and body like '%:' || chr(10) || repeat('m', 1500))
             from public.notifications where kind = 'contacto' and title like '%Asunto x%'),
          'asunto sin saltos y recortado a 120; mensaje recortado a 1500');

-- 4. La hora la pone la base: ni atrasada ni adelantada.
set local role anon;
select lives_ok($$ insert into public.contact_messages (name, email, subject, message, created_at)
  values ('Futuro', 'fecha1@test.local', 'Fecha futura', 'Mensaje con fecha.', '2100-01-01'),
         ('Viejo', 'fecha2@test.local', 'Fecha vieja', 'Mensaje con fecha.', now() - interval '2 hours') $$,
  'el formulario acepta el envío aunque traiga fecha');
reset role;
select ok((select bool_and(created_at = now()) from public.contact_messages
            where email in ('fecha1@test.local', 'fecha2@test.local')),
          'la fecha guardada es la de la base, no la que manda el cliente');
delete from public.contact_messages where email in ('fecha1@test.local', 'fecha2@test.local');
delete from public.notifications where kind = 'contacto' and title like '%Fecha %';

-- 5. El límite de 5 por hora por correo sigue funcionando.
set local role anon;
select throws_ok($$ insert into public.contact_messages (name, email, subject, message)
  select 'Visitante', 'visita@test.local', 'Otra vez', 'Mensaje repetido.' from generate_series(1, 5) $$,
  'P0001', 'DEMASIADOS_MENSAJES', 'el mismo correo no pasa de 5 mensajes por hora');

-- 6. Tope global: con correos distintos, solo 20 avisos por hora más uno de «muchos mensajes».
-- (un envío por instrucción, como llega desde el formulario; ya hay 2 mensajes en la hora)
do $$ begin
  for g in 1..25 loop
    insert into public.contact_messages (name, email, subject, message)
      values ('Bot', 'bot' || g || '@test.local', 'Spam ' || g, 'Mensaje de prueba.');
  end loop;
end $$;
reset role;
select is((select count(*)::int from public.notifications
            where kind = 'contacto' and user_id = '00000000-0000-0000-0000-0000000014a1'
              and title like 'Nuevo mensaje de contacto:%'), 20,
          'como mucho 20 avisos de mensaje por hora');
select is((select count(*)::int from public.notifications
            where kind = 'contacto' and user_id = '00000000-0000-0000-0000-0000000014a1'
              and title = 'Llegaron muchos mensajes de contacto'), 1,
          'pasado el tope llega un solo aviso de «muchos mensajes»');

-- 7. El trigger no se llama desde el cliente.
set local role authenticated;
select throws_ok($$ select public.contact_notify_admins() $$, '42501', null, 'contact_notify_admins no se llama desde el cliente');
reset role;

select * from finish();
rollback;

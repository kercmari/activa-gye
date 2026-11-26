-- La dirección y la clave de los correos se leen de Supabase Vault (26/11/2026).
begin;
select plan(5);

update public.app_settings set phase1 = true, phase3 = false where id = 1;
create temp table cola0 as select count(*)::int n from net.http_request_queue;

-- 1. Sin parámetros ni Vault no se pide ningún correo.
select is(public.email_setting('functions_url'), null, 'sin configurar no hay dirección');
select public.notify('00000000-0000-4000-8000-000000000001', 'contacto', 'Prueba sin Vault', null, null);
select is((select count(*)::int from net.http_request_queue), (select n from cola0),
          'sin configurar no se pide correo');

-- 2. Con los dos valores en Vault, el aviso de contacto pide el correo.
select vault.create_secret('http://127.0.0.1:9/functions/v1', 'vitgo_functions_url');
select vault.create_secret('clave-de-prueba', 'vitgo_service_role_key');
select public.notify('00000000-0000-4000-8000-000000000001', 'contacto', 'Prueba con Vault', null, null);
select is((select count(*)::int from net.http_request_queue), (select n from cola0) + 1,
          'con Vault configurado se pide el correo');
select ok((select bool_or(url = 'http://127.0.0.1:9/functions/v1/enviar-correo'
                          and headers->>'Authorization' = 'Bearer clave-de-prueba')
             from net.http_request_queue), 'usa la dirección y la clave guardadas en Vault');

-- 3. Los clientes no pueden leer la configuración.
set local role authenticated;
select throws_ok($$ select public.email_setting('service_role_key') $$, '42501', null,
  'email_setting no se llama desde el cliente');
reset role;

select * from finish();
rollback;

-- Migración 5: correos de aviso (fase 3). Cada aviso nuevo en `notifications` llama a la
-- Edge Function `enviar-correo` con pg_net. Si falta pg_net, o no hay URL/clave configuradas,
-- no pasa nada: el aviso igual queda en la campana.
-- Configuración en la base (una vez, la pone la dueña; ver docs/entrega/CORREOS.md):
--   alter database postgres set app.functions_url = 'https://<ref>.supabase.co/functions/v1';
--   alter database postgres set app.service_role_key = '<service_role>';

do $$
begin
  create extension if not exists pg_net with schema extensions;
exception when others then
  null; -- sin pg_net (p. ej. en local): los avisos se guardan y no se envía correo
end $$;

create or replace function public.notify_email_after_insert() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_base text := nullif(current_setting('app.functions_url', true), '');
  v_key  text := nullif(current_setting('app.service_role_key', true), '');
begin
  if v_base is null or v_key is null or not public.phase_on(3) then
    return null;
  end if;
  perform net.http_post(
    url := rtrim(v_base, '/') || '/enviar-correo',
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'Authorization', 'Bearer ' || v_key),
    body := jsonb_build_object('user_id', new.user_id, 'title', new.title,
                               'body', new.body, 'link', new.link)
  );
  return null;
exception when others then
  return null; -- nunca bloquea la inserción del aviso
end $$;

revoke execute on function public.notify_email_after_insert() from public, anon, authenticated;

create trigger notifications_send_email after insert on public.notifications
  for each row execute function public.notify_email_after_insert();

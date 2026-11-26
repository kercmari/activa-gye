-- Migración 18: la dirección de las funciones y la clave de servicio se guardan en Supabase Vault.
-- En la nube `alter database postgres set app.*` da «permission denied to set parameter». La dueña
-- guarda los dos valores una sola vez en el SQL Editor (ver docs/entrega/CORREOS.md, paso 3):
--   select vault.create_secret('https://<ref>.supabase.co/functions/v1', 'vitgo_functions_url');
--   select vault.create_secret('<service_role legacy, empieza con eyJ>', 'vitgo_service_role_key');
-- Se lee primero Vault; si no tiene el valor, los parámetros app.functions_url / app.service_role_key (local).

create or replace function public.email_setting(p_name text) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  v text;
begin
  begin
    select nullif(decrypted_secret, '') into v
      from vault.decrypted_secrets where name = 'vitgo_' || p_name;
  exception when others then
    raise warning 'email_setting: no se pudo leer Vault: %', sqlerrm;
    v := null;
  end;
  -- Vault primero; el parámetro app.* solo sirve donde Vault no tiene el valor (local).
  return coalesce(v, nullif(current_setting('app.' || p_name, true), ''));
end $$;
revoke execute on function public.email_setting(text) from public, anon, authenticated;

create or replace function public.notify_email_after_insert() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_base text := public.email_setting('functions_url');
  v_key  text := public.email_setting('service_role_key');
begin
  if v_base is null or v_key is null or (new.kind <> 'contacto' and not public.phase_on(3)) then
    return null;
  end if;
  perform net.http_post(
    url := rtrim(v_base, '/') || '/enviar-correo',
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'Authorization', 'Bearer ' || v_key),
    body := jsonb_build_object('user_id', new.user_id, 'kind', new.kind, 'title', new.title,
                               'body', new.body, 'link', new.link)
  );
  return null;
exception when others then
  raise warning 'notify_email_after_insert: %', sqlerrm;
  return null; -- nunca bloquea la inserción del aviso
end $$;
revoke execute on function public.notify_email_after_insert() from public, anon, authenticated;

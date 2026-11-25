-- Migración 17: cada mensaje del formulario de contacto llega por correo a las administradoras.
-- Usa lo que ya existe: se crea un aviso (`notifications`, kind 'contacto') para cada cuenta con rol
-- admin, y el trigger de la migración 5 lo manda por correo con la Edge Function `enviar-correo` (Brevo).
-- Los avisos de contacto se envían aunque la fase 3 esté apagada: el contacto no es parte de las fases.

-- Tope global: como mucho 20 avisos de contacto por hora (entre todos los remitentes). El límite de
-- 5 por hora por correo se esquiva cambiando de correo; sin este tope, un script podría gastar la
-- cuota diaria de Brevo. Pasado el tope los mensajes se siguen guardando (Admin → Mensajes) y solo
-- se manda un aviso más: «Llegaron muchos mensajes».
create or replace function public.contact_notify_admins() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_admin uuid;
  v_hora int;
  v_title text;
  v_body text;
begin
  select count(*) into v_hora from public.contact_messages
   where created_at > now() - interval '1 hour';
  if v_hora > 21 then
    return null;
  elsif v_hora = 21 then
    v_title := 'Llegaron muchos mensajes de contacto';
    v_body := 'Llegaron más de 20 mensajes en la última hora. No se envían más correos de contacto '
              || 'durante esta hora; revisa todos los mensajes en Admin → Mensajes.';
  else
    v_title := 'Nuevo mensaje de contacto: ' || left(regexp_replace(new.subject, '[[:cntrl:]]+', ' ', 'g'), 120);
    v_body := 'Mensaje escrito por un visitante del sitio. De ' || new.name || ' (' || new.email || '):'
              || chr(10) || left(new.message, 1500);
  end if;
  for v_admin in select id from public.profiles where role = 'admin' loop
    perform public.notify(v_admin, 'contacto', v_title, v_body, '/admin/mensajes');
  end loop;
  return null;
exception when others then
  raise warning 'contact_notify_admins: %', sqlerrm;
  return null; -- nunca bloquea el envío del formulario
end $$;
revoke execute on function public.contact_notify_admins() from public, anon, authenticated;

create trigger contact_notify_admins after insert on public.contact_messages
  for each row execute function public.contact_notify_admins();

-- El trigger de correos deja pasar los avisos de contacto con la fase 3 apagada.
create or replace function public.notify_email_after_insert() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_base text := nullif(current_setting('app.functions_url', true), '');
  v_key  text := nullif(current_setting('app.service_role_key', true), '');
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

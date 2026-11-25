-- Arreglos de la revisión RV1 (migración 14). No edita migraciones anteriores.
-- BLOCKING 1: el límite diario se podía saltar con dos altas concurrentes: cada transacción contaba
-- las filas de la otra sin confirmar. Ahora el guard toma un candado transaccional por nutricionista
-- antes de contar; las altas del mismo nutricionista se serializan.

create or replace function public.registro_diario_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_limit int;
begin
  if coalesce(current_setting('activa.registro_automatico', true), '') = 'on' then
    new.auto_creado := true;
    return new;
  end if;
  if v_uid is null or public.is_admin() or not public.is_staff() then return new; end if;
  v_limit := public.nutri_daily_limit(v_uid);
  if v_limit is null then return new; end if;
  -- Candado por nutricionista: sin él, dos transacciones paralelas no ven las filas sin confirmar de la otra.
  perform pg_advisory_xact_lock(hashtext('registro:' || v_uid::text));
  if public.nutri_records_today(v_uid) >= v_limit then
    raise exception 'LIMITE_DIARIO' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function public.registro_diario_guard() from public, anon;
grant execute on function public.registro_diario_guard() to authenticated;

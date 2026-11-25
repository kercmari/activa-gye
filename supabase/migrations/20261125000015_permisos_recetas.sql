-- Permisos de los auxiliares de límites y de estado de receta (XW2, revisión RV1/RV3).
-- Idempotente: se puede aplicar dos veces. No cambia tablas ni datos.

begin;

-- 1) Límites de la nutricionista: solo los usan funciones security definer (nutri_limits,
--    nutri_add_patient, accept_care_request, registro_diario_guard). El cliente usa nutri_limits(),
--    que lee solo el uid propio. Por eso se quita el acceso directo de cualquier usuario.
revoke all on function public.nutri_patient_quota(uuid) from public, anon, authenticated;
revoke all on function public.nutri_daily_limit(uuid) from public, anon, authenticated;
revoke all on function public.nutri_records_today(uuid) from public, anon, authenticated;

-- 2) Estado de una receta: lo llaman las políticas de plan_days (como el usuario que consulta),
--    así que sigue con EXECUTE para authenticated. Solo devuelve el estado a quien tiene relación
--    con la receta: su paciente, su nutricionista (o la del paciente) y la administradora.
--    Sin sesión (auth.uid() nulo: servidor, SQL directo) devuelve el estado, como antes, para que
--    el guardia de plan_days siga funcionando. Un tercero recibe null.
create or replace function public.recipe_status(p_id uuid) returns text
language sql stable security definer set search_path = public as $$
  select r.status from public.prescriptions r
   where r.id = p_id
     and (auth.uid() is null
          or r.patient_id = auth.uid()
          or r.nutritionist_id = auth.uid()
          or public.is_my_patient(r.patient_id)
          or public.is_admin())
$$;
revoke all on function public.recipe_status(uuid) from public, anon;
grant execute on function public.recipe_status(uuid) to authenticated;

commit;

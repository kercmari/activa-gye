-- Permisos para los roles de la página en la nube (22/11/2026).
-- Los proyectos nuevos de Supabase ya no dan permisos automáticos sobre las tablas a anon/authenticated;
-- la base local (supabase start) sí. Esta migración deja la nube igual a la base local con la que se probó todo.
-- Es seguro: todas las tablas de public tienen RLS activo, y las reglas deciden qué fila ve cada persona.
-- En local no cambia nada (ya existen estos permisos).

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- Funciones: los mismos permisos de ejecución que tiene la base local.
grant execute on function public.admin_list_invoices() to anon;
grant execute on function public.admin_list_subscriptions() to anon;
grant execute on function public.cancel_invoice(p_id uuid) to anon;
grant execute on function public.choose_plan(p_plan uuid) to anon;
grant execute on function public.contact_rate_limit() to anon;
grant execute on function public.copy_plan_week(p_patient uuid, p_from date, p_to date) to anon;
grant execute on function public.create_invoice(p_patient uuid, p_concept text, p_amount numeric) to anon;
grant execute on function public.followups_guard() to anon;
grant execute on function public.handle_new_user() to anon;
grant execute on function public.is_admin() to anon;
grant execute on function public.is_staff() to anon;
grant execute on function public.mark_all_notifications_read() to anon;
grant execute on function public.mark_invoice_paid(p_id uuid) to anon;
grant execute on function public.my_invoices() to anon;
grant execute on function public.my_role() to anon;
grant execute on function public.my_subscription() to anon;
grant execute on function public.notify_care_request_accepted() to anon;
grant execute on function public.notify_care_request_created() to anon;
grant execute on function public.notify_followup_created() to anon;
grant execute on function public.notify_invoice_created() to anon;
grant execute on function public.notify_invoice_paid() to anon;
grant execute on function public.notify_invoice_reported() to anon;
grant execute on function public.notify_plan_day_created() to anon;
grant execute on function public.notify_plan_day_done() to anon;
grant execute on function public.nutri_dashboard() to anon;
grant execute on function public.plan_days_guard() to anon;
grant execute on function public.protect_role() to anon;
grant execute on function public.report_invoice_paid(p_id uuid, p_reference text) to anon;
grant execute on function public.reviews_guard() to anon;
grant execute on function public.set_plan_day_done(p_id uuid, p_done boolean, p_note text) to anon;
grant execute on function public.subscription_active(p_user uuid) to anon;
grant execute on function public.touch_updated_at() to anon;
grant execute on function public.admin_list_invoices() to authenticated;
grant execute on function public.admin_list_subscriptions() to authenticated;
grant execute on function public.cancel_invoice(p_id uuid) to authenticated;
grant execute on function public.choose_plan(p_plan uuid) to authenticated;
grant execute on function public.contact_rate_limit() to authenticated;
grant execute on function public.copy_plan_week(p_patient uuid, p_from date, p_to date) to authenticated;
grant execute on function public.create_invoice(p_patient uuid, p_concept text, p_amount numeric) to authenticated;
grant execute on function public.followups_guard() to authenticated;
grant execute on function public.handle_new_user() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
grant execute on function public.mark_invoice_paid(p_id uuid) to authenticated;
grant execute on function public.my_invoices() to authenticated;
grant execute on function public.my_role() to authenticated;
grant execute on function public.my_subscription() to authenticated;
grant execute on function public.notify_care_request_accepted() to authenticated;
grant execute on function public.notify_care_request_created() to authenticated;
grant execute on function public.notify_followup_created() to authenticated;
grant execute on function public.notify_invoice_created() to authenticated;
grant execute on function public.notify_invoice_paid() to authenticated;
grant execute on function public.notify_invoice_reported() to authenticated;
grant execute on function public.notify_plan_day_created() to authenticated;
grant execute on function public.notify_plan_day_done() to authenticated;
grant execute on function public.nutri_dashboard() to authenticated;
grant execute on function public.plan_days_guard() to authenticated;
grant execute on function public.protect_role() to authenticated;
grant execute on function public.report_invoice_paid(p_id uuid, p_reference text) to authenticated;
grant execute on function public.reviews_guard() to authenticated;
grant execute on function public.set_plan_day_done(p_id uuid, p_done boolean, p_note text) to authenticated;
grant execute on function public.subscription_active(p_user uuid) to authenticated;
grant execute on function public.touch_updated_at() to authenticated;

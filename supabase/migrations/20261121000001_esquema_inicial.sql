-- Activa GYE: esquema inicial (tablas, roles, reglas de acceso RLS, fotos).
-- Lenguaje sencillo: cada bloque dice qué guarda y quién puede verlo.

-- ============ Roles ============
create type public.app_role as enum ('usuario', 'nutricionista', 'admin');

-- ============ Catálogos ============
-- Zonas de Guayaquil para filtrar.
create table public.sectors (
  id text primary key,                 -- slug: 'norte', 'samborondon'
  name text not null,
  sort int not null default 0
);

-- Las 8 categorías de deporte del diseño.
create table public.sports (
  id text primary key,                 -- slug: 'gimnasios', 'natacion'
  name text not null,
  icon text not null,                  -- nombre del ícono de lucide-react
  image_url text,
  sort int not null default 0
);

-- ============ Perfiles ============
-- Una fila por cuenta. Se crea sola al registrarse (trigger más abajo).
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  birth_date date,
  sex text check (sex in ('femenino', 'masculino', 'otro', 'prefiero_no_decir')),
  phone text check (char_length(phone) <= 30),
  sector_id text references public.sectors(id),
  goal text check (goal in ('bajar_peso', 'ganar_musculo', 'mantener', 'resistencia', 'bienestar')),
  activity_level text check (activity_level in ('sedentario', 'ligero', 'moderado', 'intenso')),
  role public.app_role not null default 'usuario',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ Lugares ============
create table public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  description text check (char_length(description) <= 2000),
  address text,
  sector_id text references public.sectors(id),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  phone text,
  whatsapp text,
  website text,
  instagram text,
  photo_url text,
  gallery text[] not null default '{}',
  price_from numeric(8, 2) check (price_from >= 0),   -- USD; null = "Consultar precio"; 0 = gratis
  price_note text,                                     -- "Plan mensual $25, clase suelta $6"
  promotions text,
  services text[] not null default '{}',               -- 'duchas','parqueo','entrenador','casilleros','clases_grupales','piscina','wifi','cafeteria'
  -- Horario por día: {"mon":[["06:00","22:00"]], "tue":[...], ..., "sun":[]}. null = "Horario por confirmar".
  hours jsonb,
  source text not null default 'admin' check (source in ('osm', 'admin')),
  osm_id text unique,                                  -- 'node/123' o 'way/456'
  published boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index places_sector_idx on public.places(sector_id);
create index places_published_idx on public.places(published);

create table public.place_sports (
  place_id uuid not null references public.places(id) on delete cascade,
  sport_id text not null references public.sports(id) on delete cascade,
  primary key (place_id, sport_id)
);
create index place_sports_sport_idx on public.place_sports(sport_id);

-- ============ Datos de cada persona ============
create table public.favorites (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, place_id)
);

create table public.progress_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entry_date date not null default current_date,
  weight_kg numeric(5, 2) check (weight_kg between 20 and 400),
  active_minutes int check (active_minutes between 0 and 1440),
  activity text check (char_length(activity) <= 80),
  note text check (char_length(note) <= 280),
  created_at timestamptz not null default now(),
  check (weight_kg is not null or active_minutes is not null)
);
create index progress_user_date_idx on public.progress_entries(user_id, entry_date);

-- ============ Nutrición ============
create table public.nutrition_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  age int not null check (age between 16 and 100),
  sex text not null check (sex in ('femenino', 'masculino', 'otro', 'prefiero_no_decir')),
  height_cm numeric(5, 1) not null check (height_cm between 100 and 250),
  weight_kg numeric(5, 2) not null check (weight_kg between 25 and 400),
  waist_cm numeric(5, 1) check (waist_cm between 40 and 250),
  activity_level text not null check (activity_level in ('sedentario', 'ligero', 'moderado', 'intenso')),
  goal text not null check (goal in ('bajar_peso', 'ganar_musculo', 'mantener', 'resistencia', 'bienestar')),
  restrictions text check (char_length(restrictions) <= 500),
  health_conditions text check (char_length(health_conditions) <= 500),
  photo_path text,                                     -- ruta en el bucket privado body-photos: '<user_id>/<archivo>'
  consent_photo boolean not null default false,
  consent_at timestamptz,
  ai_guide jsonb,                                      -- guía estructurada (ver docs/superpowers/plans/…: forma de ai_guide)
  ai_kind text check (ai_kind in ('ia', 'basica')),
  ai_status text not null default 'pendiente' check (ai_status in ('pendiente', 'lista', 'fallo')),
  status text not null default 'enviada' check (status in ('enviada', 'guia_lista', 'respondida')),
  nutritionist_id uuid references auth.users(id) on delete set null,
  nutritionist_plan text check (char_length(nutritionist_plan) <= 8000),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Foto solo con consentimiento y solo mayores de 18.
  check (photo_path is null or (consent_photo and consent_at is not null and age >= 18))
);
create index nutrition_user_idx on public.nutrition_requests(user_id, created_at desc);
create index nutrition_status_idx on public.nutrition_requests(status, created_at);

-- ============ Contacto ============
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 200),
  subject text not null check (char_length(subject) between 2 and 160),
  message text not null check (char_length(message) between 5 and 4000),
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index contact_email_time_idx on public.contact_messages(lower(email), created_at);

-- ============ Funciones de ayuda (quién soy) ============
create or replace function public.my_role() returns public.app_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('nutricionista', 'admin') from public.profiles where id = auth.uid()), false)
$$;

-- updated_at automático
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger places_touch before update on public.places for each row execute function public.touch_updated_at();
create trigger nutrition_touch before update on public.nutrition_requests for each row execute function public.touch_updated_at();

-- ============ Perfil automático al registrarse ============
-- Lee full_name y birth_date de los datos del registro (options.data en supabase.auth.signUp).
-- Menores de 16: se rechaza el registro.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  bd date := nullif(new.raw_user_meta_data ->> 'birth_date', '')::date;
begin
  if bd is not null and bd > (current_date - interval '16 years') then
    raise exception 'MENOR_DE_16' using errcode = 'P0001';
  end if;
  insert into public.profiles (id, full_name, birth_date)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), bd);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Nadie cambia su propio rol ni el de otros desde la página: solo con admin_set_role (abajo).
create or replace function public.protect_role() returns trigger
language plpgsql as $$
begin
  if new.role is distinct from old.role and current_setting('activa.allow_role_change', true) is distinct from 'on'
     and auth.uid() is not null then
    raise exception 'ROL_PROTEGIDO' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.protect_role();

-- Contacto: máximo 5 mensajes por hora por correo.
create or replace function public.contact_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.contact_messages
      where lower(email) = lower(new.email) and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'DEMASIADOS_MENSAJES' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger contact_rate before insert on public.contact_messages
  for each row execute function public.contact_rate_limit();

-- ============ Acciones con reglas propias (RPC) ============
-- Admin cambia el rol de otra cuenta (nunca la suya, para no quedarse sin admin).
create or replace function public.admin_set_role(target uuid, new_role public.app_role) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'SOLO_ADMIN' using errcode = '42501'; end if;
  if target = auth.uid() then raise exception 'NO_PUEDES_CAMBIAR_TU_ROL' using errcode = 'P0001'; end if;
  perform set_config('activa.allow_role_change', 'on', true);
  update public.profiles set role = new_role where id = target;
  if not found then raise exception 'CUENTA_NO_EXISTE' using errcode = 'P0002'; end if;
end $$;

-- Lista de cuentas para el admin (incluye el correo, que vive en auth.users).
create or replace function public.admin_list_users(search text default null)
returns table (id uuid, email text, full_name text, role public.app_role, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'SOLO_ADMIN' using errcode = '42501'; end if;
  return query
    select p.id, u.email::text, p.full_name, p.role, p.created_at
    from public.profiles p join auth.users u on u.id = p.id
    where search is null or u.email ilike '%' || search || '%' or p.full_name ilike '%' || search || '%'
    order by p.created_at desc
    limit 200;
end $$;

-- Nutricionista toma una solicitud libre.
create or replace function public.take_nutrition_request(request_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'SOLO_NUTRICIONISTA' using errcode = '42501'; end if;
  update public.nutrition_requests set nutritionist_id = auth.uid()
   where id = request_id and nutritionist_id is null;
  if not found then raise exception 'YA_TOMADA_O_NO_EXISTE' using errcode = 'P0001'; end if;
end $$;

-- Nutricionista asignado (o admin) responde con su plan.
create or replace function public.answer_nutrition_request(request_id uuid, plan text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'SOLO_NUTRICIONISTA' using errcode = '42501'; end if;
  if plan is null or char_length(trim(plan)) < 20 then raise exception 'PLAN_MUY_CORTO' using errcode = 'P0001'; end if;
  update public.nutrition_requests
     set nutritionist_plan = trim(plan), status = 'respondida', responded_at = now(),
         nutritionist_id = coalesce(nutritionist_id, auth.uid())
   where id = request_id
     and (nutritionist_id = auth.uid() or public.is_admin() or nutritionist_id is null);
  if not found then raise exception 'NO_ASIGNADA_A_TI' using errcode = '42501'; end if;
end $$;

-- La persona borra su cuenta (las fotos se borran antes desde la página con la API de Storage).
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'SIN_SESION' using errcode = '42501'; end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function public.admin_set_role(uuid, public.app_role) from public, anon;
revoke all on function public.admin_list_users(text) from public, anon;
revoke all on function public.take_nutrition_request(uuid) from public, anon;
revoke all on function public.answer_nutrition_request(uuid, text) from public, anon;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.admin_set_role(uuid, public.app_role) to authenticated;
grant execute on function public.admin_list_users(text) to authenticated;
grant execute on function public.take_nutrition_request(uuid) to authenticated;
grant execute on function public.answer_nutrition_request(uuid, text) to authenticated;
grant execute on function public.delete_my_account() to authenticated;

-- ============ Reglas de acceso (RLS) ============
alter table public.sectors enable row level security;
alter table public.sports enable row level security;
alter table public.profiles enable row level security;
alter table public.places enable row level security;
alter table public.place_sports enable row level security;
alter table public.favorites enable row level security;
alter table public.progress_entries enable row level security;
alter table public.nutrition_requests enable row level security;
alter table public.contact_messages enable row level security;

-- Catálogos: todos leen; solo admin escribe.
create policy sectors_read on public.sectors for select using (true);
create policy sectors_admin on public.sectors for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy sports_read on public.sports for select using (true);
create policy sports_admin on public.sports for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Perfiles: cada uno ve y edita el suyo; staff ve (para atender solicitudes); admin ve y edita todos.
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- Lugares: todos ven los publicados; admin ve y gestiona todo.
create policy places_read on public.places for select using (published or public.is_admin());
create policy places_admin on public.places for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy place_sports_read on public.place_sports for select using (true);
create policy place_sports_admin on public.place_sports for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Favoritos y progreso: solo el dueño.
create policy favorites_own on public.favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy progress_own on public.progress_entries for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Nutrición: el dueño crea, ve y borra las suyas; staff ve todas. Respuestas solo por RPC.
create policy nutrition_read on public.nutrition_requests for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
create policy nutrition_insert on public.nutrition_requests for insert to authenticated
  with check (user_id = auth.uid() and status = 'enviada' and ai_status = 'pendiente'
              and ai_guide is null and nutritionist_id is null and nutritionist_plan is null);
create policy nutrition_delete on public.nutrition_requests for delete to authenticated
  using (user_id = auth.uid());

-- Contacto: cualquiera envía; solo admin lee y marca leído.
create policy contact_insert on public.contact_messages for insert to anon, authenticated
  with check (read = false);
create policy contact_admin_read on public.contact_messages for select to authenticated using (public.is_admin());
create policy contact_admin_update on public.contact_messages for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ============ Fotos (Storage) ============
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('body-photos', 'body-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('place-photos', 'place-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- body-photos: carpeta = id de la persona. Dueño sube/ve/borra; staff ve.
create policy body_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'body-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy body_photos_read on storage.objects for select to authenticated
  using (bucket_id = 'body-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()));
create policy body_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'body-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- place-photos: público para ver; admin sube/cambia/borra.
create policy place_photos_read on storage.objects for select using (bucket_id = 'place-photos');
create policy place_photos_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'place-photos' and public.is_admin());
create policy place_photos_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'place-photos' and public.is_admin());
create policy place_photos_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'place-photos' and public.is_admin());

-- ============ Datos fijos ============
insert into public.sectors (id, name, sort) values
  ('norte', 'Norte', 1), ('centro', 'Centro', 2), ('sur', 'Sur', 3), ('urdesa', 'Urdesa', 4),
  ('kennedy', 'Kennedy', 5), ('alborada', 'Alborada', 6), ('sauces', 'Sauces', 7), ('ceibos', 'Los Ceibos', 8),
  ('via-costa', 'Vía a la Costa', 9), ('via-daule', 'Vía a Daule', 10), ('samborondon', 'Samborondón', 11),
  ('duran', 'Durán', 12);

insert into public.sports (id, name, icon, sort) values
  ('gimnasios', 'Gimnasios', 'Dumbbell', 1), ('funcional', 'Funcional', 'Zap', 2), ('yoga', 'Yoga', 'Sparkles', 3),
  ('baile', 'Baile', 'HeartPulse', 4), ('natacion', 'Natación', 'Waves', 5), ('boxeo', 'Boxeo', 'Swords', 6),
  ('colectivos', 'Deportes colectivos', 'Users', 7), ('otras', 'Otras actividades', 'Bike', 8);

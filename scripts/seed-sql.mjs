/**
 * Genera supabase/seed.sql (solo local) a partir de src/data/mock/places.osm.json.
 * Uso: node scripts/seed-sql.mjs
 *
 * - Lugares: `insert ... on conflict (id) do nothing`. El id OSM (p. ej. 'osm-way-123')
 *   se convierte en un uuid determinístico (md5 del id, mismo valor que md5(id)::uuid en SQL);
 *   el id original queda en `osm_id` ('way/123').
 * - Cuentas de prueba: bloque `-- CUENTAS LOCALES`, NO se carga en la nube.
 * - Sin dependencias nuevas: solo node:fs, node:path, node:crypto.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PLACES_JSON = resolve(ROOT, 'src/data/mock/places.osm.json');
const MIGRATION = resolve(ROOT, 'supabase/migrations/20261121000001_esquema_inicial.sql');
const OUTPUT = resolve(ROOT, 'supabase/seed.sql');

// ---------- Catálogos (leídos de la migración 1) ----------
const migration = readFileSync(MIGRATION, 'utf8');
const sectorsBlock = migration.slice(
  migration.indexOf('insert into public.sectors'),
  migration.indexOf('insert into public.sports'),
);
const sportsBlock = migration.slice(migration.indexOf('insert into public.sports'));
const SECTOR_IDS = new Set([...sectorsBlock.matchAll(/\('([a-z-]+)',\s*'[^']*',\s*\d+\)/g)].map((m) => m[1]));
const SPORT_IDS = new Set([...sportsBlock.matchAll(/\('([a-z-]+)',\s*'[^']*',\s*'[^']*',\s*\d+\)/g)].map((m) => m[1]));
if (SECTOR_IDS.size === 0 || SPORT_IDS.size === 0) {
  throw new Error('No pude leer sectores/deportes de la migración 1');
}

// ---------- Helpers SQL ----------
/** Literal SQL: null, número, booleano, texto (comillas simples escapadas) o jsonb. */
function lit(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new Error(`Número no finito: ${v}`);
    return String(v);
  }
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return `'${String(v).replace(/'/g, "''")}'`;
}
function textArray(arr) {
  if (!arr || arr.length === 0) return "'{}'::text[]";
  return `array[${arr.map(lit).join(', ')}]::text[]`;
}
function jsonb(v) {
  if (v === null || v === undefined) return 'null';
  return `${lit(JSON.stringify(v))}::jsonb`;
}
/** uuid determinístico: md5(texto) con formato 8-4-4-4-12. Igual que md5(texto)::uuid. */
function uuidFrom(text) {
  const h = createHash('md5').update(text, 'utf8').digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------- Lugares ----------
const places = JSON.parse(readFileSync(PLACES_JSON, 'utf8'));
const placeRows = [];
const sportRows = [];
const seenIds = new Set();

for (const p of places) {
  const id = UUID_RE.test(p.id) ? p.id : uuidFrom(p.id);
  if (seenIds.has(id)) throw new Error(`id duplicado: ${p.id}`);
  seenIds.add(id);
  const sectorId = p.sector_id && SECTOR_IDS.has(p.sector_id) ? p.sector_id : null;
  const osmId = p.osm_id ?? (p.id.startsWith('osm-') ? p.id.replace(/^osm-/, '').replace('-', '/') : null);

  placeRows.push(
    `  (${[
      lit(id),
      lit(p.name),
      lit(p.description),
      lit(p.address),
      lit(sectorId),
      lit(p.lat),
      lit(p.lng),
      lit(p.phone),
      lit(p.whatsapp),
      lit(p.website),
      lit(p.instagram),
      lit(p.photo_url),
      textArray(p.gallery),
      lit(p.price_from),
      lit(p.price_note),
      lit(p.promotions),
      textArray(p.services),
      jsonb(p.hours),
      lit(p.source ?? 'osm'),
      lit(osmId),
      lit(p.published ?? true),
      lit(p.verified_at),
    ].join(', ')})`,
  );

  for (const sport of p.sport_ids ?? []) {
    if (!SPORT_IDS.has(sport)) throw new Error(`Deporte desconocido en ${p.id}: ${sport}`);
    sportRows.push(`  (${lit(id)}, ${lit(sport)})`);
  }
}

// ---------- Cuentas locales ----------
const ACCOUNTS = [
  { uuid: '00000000-0000-4000-8000-000000000001', email: 'admin@activagye.test', password: 'ActivaAdmin2026!', name: 'Administración Activa GYE', role: 'admin', birth: null, goal: null },
  { uuid: '00000000-0000-4000-8000-000000000002', email: 'nutri@activagye.test', password: 'ActivaNutri2026!', name: 'Nutricionista de prueba', role: 'nutricionista', birth: null, goal: null },
  { uuid: '00000000-0000-4000-8000-000000000003', email: 'usuario@activagye.test', password: 'ActivaUser2026!', name: 'Usuario de prueba', role: 'usuario', birth: '2000-05-10', goal: 'bajar_peso' },
];

const accountInserts = ACCOUNTS.map(
  (a) => `insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
values (${lit(a.uuid)}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', ${lit(a.email)},
  crypt(${lit(a.password)}, gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  ${jsonb(a.birth ? { full_name: a.name, birth_date: a.birth } : { full_name: a.name })},
  now(), now(), '', '', '', '');

insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), ${lit(a.uuid)}, ${lit(a.uuid)},
  jsonb_build_object('sub', ${lit(a.uuid)}, 'email', ${lit(a.email)}, 'email_verified', true, 'phone_verified', false),
  'email', now(), now(), now());`,
).join('\n\n');

const roleUpdates = ACCOUNTS.filter((a) => a.role !== 'usuario')
  .map((a) => `update public.profiles set role = ${lit(a.role)} where id = ${lit(a.uuid)};`)
  .join('\n');

const usuario = ACCOUNTS.find((a) => a.role === 'usuario');
const usuarioExtras = `update public.profiles set goal = ${lit(usuario.goal)} where id = ${lit(usuario.uuid)};

insert into public.progress_entries (user_id, entry_date, weight_kg, active_minutes, activity, note) values
  (${lit(usuario.uuid)}, current_date - 28, 78.0, 30, 'Caminata', null),
  (${lit(usuario.uuid)}, current_date - 21, 77.3, 45, 'Funcional', null),
  (${lit(usuario.uuid)}, current_date - 14, 76.9, 40, 'Natación', null),
  (${lit(usuario.uuid)}, current_date - 7, 76.5, 50, 'Funcional', null);`;

// ---------- Archivo final ----------
const out = `-- Semilla local de Activa GYE (generada por scripts/seed-sql.mjs; no editar a mano).
-- Lugares: ${placeRows.length} de src/data/mock/places.osm.json.
-- Se ejecuta después de las migraciones en \`supabase db reset\`.

begin;

-- Lugares (uuid determinístico desde el id OSM; osm_id guarda el original).
insert into public.places (id, name, description, address, sector_id, lat, lng, phone, whatsapp, website, instagram, photo_url, gallery, price_from, price_note, promotions, services, hours, source, osm_id, published, verified_at) values
${placeRows.join(',\n')}
on conflict (id) do nothing;

insert into public.place_sports (place_id, sport_id) values
${sportRows.join(',\n')}
on conflict do nothing;

-- CUENTAS LOCALES: NO se carga en la nube (solo lugares). Contraseñas de docs/entrega/CUENTAS-DE-PRUEBA.md.
-- El trigger on_auth_user_created crea el perfil; luego se fija el rol.
-- protect_role solo bloquea cuando hay sesión (auth.uid()); aquí no la hay, y además se permite explícitamente.
select set_config('activa.allow_role_change', 'on', true);

${accountInserts}

${roleUpdates}
${usuarioExtras}

select set_config('activa.allow_role_change', 'off', true);

commit;
`;

writeFileSync(OUTPUT, out);
console.log(`seed.sql: ${placeRows.length} lugares, ${sportRows.length} place_sports, ${ACCOUNTS.length} cuentas locales`);

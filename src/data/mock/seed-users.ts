/**
 * Cuentas de prueba del simulador (solo existen en este navegador). Se crean si no existen.
 * Contraseñas con el mismo hash que signUp. Documentadas en docs/entrega/CUENTAS-DE-PRUEBA.md.
 */
import type { Profile, ProgressEntry, Role } from '../types';
import { readTable, writeTable, hashPassword, nowIso, type StoredUser } from './store';

interface SeedAccount {
  id: string;
  email: string;
  password: string;
  full_name: string;
  role: Role;
  birth_date: string | null;
  goal: Profile['goal'];
}

const SEED_ACCOUNTS: SeedAccount[] = [
  { id: 'seed-admin', email: 'admin@activagye.test', password: 'ActivaAdmin2026!', full_name: 'Administración Activa GYE', role: 'admin', birth_date: null, goal: null },
  { id: 'seed-nutri', email: 'nutri@activagye.test', password: 'ActivaNutri2026!', full_name: 'Nutricionista de prueba', role: 'nutricionista', birth_date: null, goal: null },
  { id: 'seed-usuario', email: 'usuario@activagye.test', password: 'ActivaUser2026!', full_name: 'Usuario de prueba', role: 'usuario', birth_date: '2000-05-10', goal: 'bajar_peso' },
];

/** Fecha 'AAAA-MM-DD' en hora local, `daysAgo` días antes de hoy. */
function dateKeyDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Últimas 4 semanas del usuario de prueba: peso 78 → 76,5. */
function seedProgress(userId: string): ProgressEntry[] {
  const rows: { daysAgo: number; weight: number; minutes: number; activity: string }[] = [
    { daysAgo: 28, weight: 78, minutes: 30, activity: 'Caminata' },
    { daysAgo: 21, weight: 77.3, minutes: 45, activity: 'Funcional' },
    { daysAgo: 14, weight: 76.9, minutes: 40, activity: 'Natación' },
    { daysAgo: 7, weight: 76.5, minutes: 50, activity: 'Funcional' },
  ];
  const created = nowIso();
  return rows.map((r, i) => ({
    id: `seed-progress-${i + 1}`,
    user_id: userId,
    entry_date: dateKeyDaysAgo(r.daysAgo),
    weight_kg: r.weight,
    active_minutes: r.minutes,
    activity: r.activity,
    note: null,
    created_at: created,
  }));
}

/** Crea las cuentas de prueba que falten. Es idempotente. */
export async function ensureSeedUsers(): Promise<void> {
  const missingNow = () => SEED_ACCOUNTS.filter((s) => !readTable<StoredUser>('users').some((u) => u.email === s.email));
  if (missingNow().length === 0) return;

  const created = nowIso();
  const toCreate = missingNow();
  const users: StoredUser[] = [];
  for (const s of toCreate) {
    users.push({
      id: s.id,
      email: s.email,
      password_hash: await hashPassword(s.email, s.password),
      profile: {
        id: s.id,
        full_name: s.full_name,
        birth_date: s.birth_date,
        sex: null,
        phone: null,
        sector_id: null,
        goal: s.goal,
        activity_level: null,
        role: s.role,
        created_at: created,
        updated_at: created,
      },
    });
  }

  // Releer antes de escribir: otra llamada pudo crear alguna mientras se calculaban los hashes.
  const current = readTable<StoredUser>('users');
  const fresh = users.filter((u) => !current.some((c) => c.email === u.email));
  if (fresh.length === 0) return;
  writeTable('users', [...current, ...fresh]);

  if (fresh.some((u) => u.id === 'seed-usuario')) {
    const progress = readTable<ProgressEntry>('progress_entries');
    writeTable('progress_entries', [...progress, ...seedProgress('seed-usuario')]);
  }
}

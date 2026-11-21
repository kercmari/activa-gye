import type { Profile } from '../../data/types';
import { repo } from '../../data';
import { LinkButton } from '../ui/Button';
import { ErrorState, Loading } from '../ui/States';
import { ACTIVITY_LABELS, GOAL_LABELS, SEX_LABELS, ageFrom, formatDateLong } from './labels';
import { useAsync } from './useAsync';

interface Props {
  profile: Profile;
  email: string;
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-1 py-4 sm:flex-row sm:gap-6">
      <dt className="text-sm font-bold text-slate-500 sm:w-56 sm:shrink-0">{label}</dt>
      <dd className={value ? 'font-semibold text-navy-900' : 'italic text-slate-400'}>{value ?? 'Sin completar'}</dd>
    </div>
  );
}

/** Pestaña "Mis datos": lista del perfil con nombres legibles y botón Editar. */
export default function DataTab({ profile, email }: Props) {
  const sectors = useAsync(() => repo.listSectors(), []);

  if (sectors.status === 'loading') return <Loading text="Cargando tus datos…" />;
  if (sectors.status === 'error') return <ErrorState message={sectors.message} onRetry={sectors.reload} />;

  const sectorName = sectors.data.find((s) => s.id === profile.sector_id)?.name ?? null;
  const birth = profile.birth_date
    ? `${formatDateLong(profile.birth_date)} (${ageFrom(profile.birth_date)} años)`
    : null;

  return (
    <div className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="display text-2xl text-navy-900">Mis datos</h2>
        <LinkButton to="/perfil/editar" variant="secondary" size="md">Editar</LinkButton>
      </div>
      <dl className="mt-4 divide-y divide-slate-100">
        <Row label="Nombre completo" value={profile.full_name || null} />
        <Row label="Correo electrónico" value={email || null} />
        <Row label="Fecha de nacimiento" value={birth} />
        <Row label="Sexo" value={profile.sex ? SEX_LABELS[profile.sex] : null} />
        <Row label="Teléfono" value={profile.phone} />
        <Row label="Sector" value={sectorName} />
        <Row label="Objetivo" value={profile.goal ? GOAL_LABELS[profile.goal] : null} />
        <Row label="Nivel de actividad" value={profile.activity_level ? ACTIVITY_LABELS[profile.activity_level] : null} />
      </dl>
    </div>
  );
}

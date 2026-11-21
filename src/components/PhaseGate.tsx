/**
 * Muestra `children` solo si la fase está encendida; si no, un aviso «Próximamente».
 * Uso: <PhaseGate phase={2} title="Calendario y progreso">…</PhaseGate>
 * `compact` = aviso pequeño (para tarjetas o pestañas).
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Lock } from 'lucide-react';
import { usePhase } from '../auth/SettingsContext';

type Props = { phase: 1 | 2 | 3; title?: string; text?: string; compact?: boolean; back?: { to: string; label: string }; children: ReactNode };

export default function PhaseGate({ phase, title, text, compact, back, children }: Props) {
  const on = usePhase(phase);
  if (on) return <>{children}</>;
  const msg = text ?? 'Esta sección se habilitará en la siguiente etapa de Activa GYE.';
  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600" data-testid={`fase-${phase}-bloqueada`}>
        <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span><strong className="text-navy-900">Próximamente.</strong> {msg}</span>
      </div>
    );
  }
  return (
    <div className="rounded-[1.75rem] bg-white p-8 text-center shadow-xl shadow-navy-900/5" data-testid={`fase-${phase}-bloqueada`}>
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <Lock className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="eyebrow mt-4 text-brand-orange">Próximamente</p>
      {title ? <h2 className="display mt-2 text-2xl text-navy-900">{title}</h2> : null}
      <p className="mx-auto mt-2 max-w-md text-slate-600">{msg}</p>
      {back ? <Link to={back.to} className="mt-6 inline-block font-bold text-brand-orange">{back.label}</Link> : null}
    </div>
  );
}

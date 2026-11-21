import type { ReactNode } from 'react';

export type BadgeTone = 'blue' | 'orange' | 'slate' | 'green';

const TONES: Record<BadgeTone, string> = {
  blue: 'bg-sky-50 text-sky-tag',
  orange: 'bg-orange-50 text-brand-orange-dark',
  slate: 'bg-slate-100 text-slate-600',
  green: 'bg-emerald-50 text-emerald-700',
};

/** Pastilla redondeada para etiquetas cortas. */
export default function Badge({ tone = 'slate', className = '', children }: { tone?: BadgeTone; className?: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}

import { BookOpen, CalendarDays, HeartPulse, House, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';

export type PlanTab = 'hoy' | 'progreso' | 'agenda' | 'guia';

interface TabDef {
  key: PlanTab;
  label: string;
  to: string;
  icon: LucideIcon;
}

const TABS: readonly TabDef[] = [
  { key: 'hoy', label: 'Hoy', to: '/mi-plan/hoy', icon: House },
  { key: 'progreso', label: 'Progreso', to: '/mi-plan/progreso', icon: HeartPulse },
  { key: 'agenda', label: 'Agenda', to: '/mi-plan/agenda', icon: CalendarDays },
  { key: 'guia', label: 'Guía', to: '/guia', icon: BookOpen },
];

export interface BottomNavProps {
  active: PlanTab | null;
}

/** Barra inferior fija en celular; en pantallas ≥ 768 px queda como pestañas bajo el encabezado. */
export function BottomNav({ active }: BottomNavProps) {
  return (
    <nav
      aria-label="Secciones de Mi plan"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white shadow-xl shadow-navy-900/10 md:static md:border-b md:border-t-0 md:shadow-none"
    >
      <ul className="mx-auto grid max-w-6xl grid-cols-4 px-2 py-2 md:flex md:gap-2 md:px-4">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.key === active;
          return (
            <li key={tab.key} className="flex">
              <Link
                to={tab.to}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1 text-xs font-bold transition-colors md:flex-row md:px-4 md:py-3 md:text-sm ${
                  isActive ? 'bg-brand-orange/10 text-brand-orange' : 'text-slate-500 hover:bg-slate-100 hover:text-navy-900'
                }`}
              >
                <Icon aria-hidden="true" className="h-5 w-5" />
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default BottomNav;

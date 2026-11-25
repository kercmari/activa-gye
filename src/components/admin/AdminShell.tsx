import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router';
import { useAuth } from '../../auth/AuthContext';
import { usePhase } from '../../auth/SettingsContext';
import { usePendingCount } from './usePendingCount';

const ITEMS: { to: string; label: string; end: boolean; adminOnly: boolean; phase?: 2 | 3; pendientes?: boolean }[] = [
  { to: '/admin', label: 'Resumen', end: true, adminOnly: true },
  { to: '/nutri', label: 'Panel nutricionista', end: false, adminOnly: false, phase: 2 },
  { to: '/admin/plantillas', label: 'Plantillas', end: false, adminOnly: false },
  { to: '/admin/guia', label: 'Guía', end: false, adminOnly: false },
  { to: '/admin/fases', label: 'Fases', end: false, adminOnly: true },
  { to: '/admin/lugares', label: 'Lugares', end: false, adminOnly: true },
  { to: '/admin/datos-lugares', label: 'Datos de lugares', end: false, adminOnly: true, phase: 3 },
  { to: '/admin/suscripciones', label: 'Suscripciones', end: false, adminOnly: true, pendientes: true },
  { to: '/admin/planes', label: 'Planes y correo', end: false, adminOnly: true },
  { to: '/admin/mensajes', label: 'Mensajes', end: false, adminOnly: true },
  { to: '/admin/usuarios', label: 'Usuarios', end: false, adminOnly: true },
];

interface Props {
  title: string;
  children: ReactNode;
}

/** Diseño del panel: barra lateral en escritorio, pestañas arriba en celular. */
export default function AdminShell({ title, children }: Props) {
  const { session } = useAuth();
  const isAdmin = session?.profile.role === 'admin';
  const phase2 = usePhase(2);
  const phase3 = usePhase(3);
  // Las vistas de una fase apagada no aparecen en el menú.
  const items = ITEMS.filter((item) => (isAdmin || !item.adminOnly)
    && (item.phase === 2 ? phase2 : item.phase === 3 ? phase3 : true));
  // Suscripciones y Planes y correo se ven siempre, no dependen de la fase 2.
  const pendientes = usePendingCount(isAdmin);

  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-8 md:grid md:grid-cols-[14rem_minmax(0,1fr)] md:gap-8 md:py-12">
        <nav aria-label="Panel de administración" className="mb-6 md:mb-0">
          <Link to="/" className="mb-4 hidden text-sm font-bold text-brand-blue hover:underline md:block">
            ← Volver al sitio
          </Link>
          <ul className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible">
            {items.map((item) => (
              <li key={item.to} className="shrink-0">
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `block rounded-xl px-4 py-2.5 text-sm font-extrabold transition-colors ${
                      isActive ? 'bg-navy-900 text-white' : 'bg-white text-navy-900 hover:bg-slate-100'
                    }`
                  }
                >
                  {item.label}
                  {item.pendientes && pendientes ? (
                    <span className="ml-2 rounded-full bg-brand-orange px-2 py-0.5 text-xs font-extrabold text-white">{pendientes}</span>
                  ) : null}
                </NavLink>
              </li>
            ))}
            <li className="shrink-0 md:hidden">
              <Link to="/" className="block rounded-xl px-4 py-2.5 text-sm font-bold text-brand-blue">
                ← Volver al sitio
              </Link>
            </li>
          </ul>
        </nav>
        <div className="min-w-0">
          <p className="eyebrow">Panel de administración</p>
          <h1 className="display mt-2 text-3xl text-navy-900 md:text-5xl">{title}</h1>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </section>
  );
}

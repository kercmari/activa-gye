import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import { useAuth } from '../../auth/AuthContext';
import PageHeader from '../ui/PageHeader';

const ITEMS = [
  { to: '/nutri', label: 'Tablero', end: true },
  { to: '/nutri/pacientes', label: 'Mis pacientes', end: false },
  { to: '/nutri/solicitudes', label: 'Solicitudes', end: false },
  { to: '/nutri/suscripcion', label: 'Mi plan', end: false },
];

interface Props {
  /** Título de la página actual (p. ej. «Tablero»). */
  title: string;
  children: ReactNode;
}

/** Marco del panel del nutricionista: cabecera azul y pestañas (desplazables en celular). */
export default function NutriShell({ title, children }: Props) {
  const { session } = useAuth();
  const isAdmin = session?.profile.role === 'admin';

  return (
    <section className="bg-surface">
      <PageHeader eyebrow="PANEL DEL NUTRICIONISTA" title={title} back="/" />
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
        <nav aria-label="Panel del nutricionista" className="mb-8">
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {ITEMS.map((item) => (
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
                </NavLink>
              </li>
            ))}
            {isAdmin ? (
              <li className="shrink-0">
                <NavLink
                  to="/admin"
                  className="block rounded-xl bg-white px-4 py-2.5 text-sm font-extrabold text-brand-blue transition-colors hover:bg-slate-100"
                >
                  Administración
                </NavLink>
              </li>
            ) : null}
          </ul>
        </nav>
        {children}
      </div>
    </section>
  );
}

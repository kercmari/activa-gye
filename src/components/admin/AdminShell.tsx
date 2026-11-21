import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router';
import { useAuth } from '../../auth/AuthContext';

const ITEMS = [
  { to: '/admin', label: 'Resumen', end: true, adminOnly: true },
  { to: '/nutri', label: 'Panel nutricionista', end: false, adminOnly: false },
  { to: '/admin/fases', label: 'Fases', end: false, adminOnly: true },
  { to: '/admin/lugares', label: 'Lugares', end: false, adminOnly: true },
  { to: '/admin/datos-lugares', label: 'Datos de lugares', end: false, adminOnly: true },
  { to: '/admin/pagos', label: 'Pagos', end: false, adminOnly: true },
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
  const items = ITEMS.filter((item) => isAdmin || !item.adminOnly);

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

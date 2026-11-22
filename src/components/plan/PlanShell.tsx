import { Outlet, Link, useLocation } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { BottomNav, type PlanTab } from './BottomNav';

/** Qué pestaña queda marcada según la ruta. */
function tabFromPath(pathname: string): PlanTab | null {
  if (pathname.startsWith('/mi-plan/hoy')) return 'hoy';
  if (pathname.startsWith('/mi-plan/progreso')) return 'progreso';
  if (pathname.startsWith('/mi-plan/agenda')) return 'agenda';
  if (pathname.startsWith('/guia')) return 'guia';
  return null;
}

/** Marco de «Mi plan» (Hoy · Progreso · Agenda · Guía), con la barra inferior estilo Base Vital. */
export default function PlanShell() {
  const { pathname } = useLocation();
  const active = tabFromPath(pathname);

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-navy-900 text-white">
        <div className="mx-auto max-w-6xl px-4 pb-6 pt-5">
          <Link
            to="/mi-panel"
            className="inline-flex items-center gap-2 rounded-xl px-2 py-1 text-sm font-bold text-white/80 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Volver a Mi panel
          </Link>
          <p className="eyebrow mt-4 !text-brand-blue">Mi plan</p>
          <h1 className="display mt-1 text-3xl text-white md:text-4xl">Mi semana</h1>
        </div>
      </header>
      <BottomNav active={active} />
      <main className="mx-auto max-w-6xl px-4 pb-32 pt-6 md:pb-12">
        <Outlet />
      </main>
    </div>
  );
}

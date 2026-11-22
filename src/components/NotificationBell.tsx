import { Bell } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { usePhase } from '../auth/SettingsContext';
import { repo } from '../data';

const REFRESH_MS = 60_000;

/** Campana del encabezado con el número de avisos sin leer. Solo existe con la fase 2 encendida. */
export default function NotificationBell() {
  const on = usePhase(2);
  if (!on) return null;
  return <UnreadBell />;
}

function UnreadBell() {
  // null = todavía no hay número (cargando o error): la campana se muestra sin globo.
  const [count, setCount] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setCount(await repo.countUnreadNotifications());
    } catch {
      setCount(null);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  const badge = count !== null && count > 0 ? (count > 9 ? '9+' : String(count)) : null;
  const label = count === null ? 'Notificaciones' : `Notificaciones (${count} sin leer)`;

  return (
    <Link
      to="/notificaciones"
      aria-label={label}
      className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white transition-colors hover:bg-white/10"
    >
      <Bell className="h-5 w-5" aria-hidden="true" />
      {badge ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-orange px-1 text-[10px] font-extrabold leading-none text-white">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

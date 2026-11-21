import { ChevronDown, LogOut, Menu, User, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../auth/AuthContext';
import { repo, type Session } from '../../data';
import { LinkButton } from '../ui/Button';

export const NAV_ITEMS = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/conocenos', label: 'Conócenos' },
  { to: '/deportes', label: 'Explorar deportes' },
  { to: '/lugares', label: 'Buscar lugares' },
  { to: '/nutricion', label: 'Nutricionista' },
  { to: '/contacto', label: 'Contacto' },
] as const;

function canSeePanel(session: Session | null): boolean {
  const role = session?.profile.role;
  return role === 'nutricionista' || role === 'admin';
}

function initial(session: Session): string {
  return session.profile.full_name.trim().charAt(0).toUpperCase() || '?';
}

/** Enlaces de la cuenta con sesión (se usan en el menú de escritorio y en el móvil). */
function AccountLinks({ session, onSignOut, onNavigate }: { session: Session; onSignOut: () => void; onNavigate?: () => void }) {
  const itemClass = 'block rounded-xl px-3 py-2.5 text-sm font-semibold text-navy-900 hover:bg-slate-100';
  return (
    <>
      <Link to="/perfil" className={itemClass} onClick={onNavigate}>Mi perfil</Link>
      <Link to="/nutricion" className={itemClass} onClick={onNavigate}>Mi plan nutricional</Link>
      {canSeePanel(session) ? (
        <Link to="/admin" className={itemClass} onClick={onNavigate}>Panel</Link>
      ) : null}
      <button type="button" onClick={onSignOut} className={`${itemClass} flex w-full items-center gap-2 text-left`}>
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Salir
      </button>
    </>
  );
}

export function Header() {
  const { session, refresh } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  // Al cambiar de página se cierran los menús.
  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [location.pathname]);

  // Escape y clic fuera cierran el menú de cuenta.
  useEffect(() => {
    if (!accountOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAccountOpen(false); };
    const onClick = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [accountOpen]);

  // Escape también cierra el menú móvil.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const signOut = async () => {
    setAccountOpen(false);
    setMenuOpen(false);
    try {
      await repo.signOut();
    } catch {
      // Si falla, se refresca la sesión real y se va al inicio igual.
    }
    await refresh();
    navigate('/');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `border-b-2 pb-1 font-semibold transition-colors ${isActive ? 'border-brand-orange text-white' : 'border-transparent text-slate-300 hover:text-white'}`;

  return (
    <header className="sticky top-0 z-40 bg-navy-900 text-white shadow-lg shadow-navy-900/10">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex shrink-0 items-center gap-3" aria-label="Activa GYE, ir al inicio">
          <img src="/img/logo.png" alt="" className="h-11 w-auto" />
          <span className="text-xl font-extrabold italic tracking-tight">
            ACTIVA <span className="text-brand-orange">GYE</span>
          </span>
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-5 text-sm lg:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={'end' in item ? item.end : false} className={navLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <LinkButton to="/deportes" variant="primary" size="md" className="!hidden xl:!inline-flex">
            Explorar actividades <span aria-hidden="true">→</span>
          </LinkButton>

          {session ? (
            <div ref={accountRef} className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                aria-label={`Menú de cuenta de ${session.profile.full_name}`}
                onClick={() => setAccountOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-full bg-white/10 py-1 pl-1 pr-2 transition-colors hover:bg-white/20"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue text-sm font-extrabold">
                  {initial(session)}
                </span>
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </button>
              <div
                role="menu"
                hidden={!accountOpen}
                className="absolute right-0 mt-2 w-60 rounded-2xl bg-white p-2 text-navy-900 shadow-xl"
              >
                <AccountLinks session={session} onSignOut={signOut} />
              </div>
            </div>
          ) : (
            <Link
              to="/ingresar"
              className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-white hover:bg-white/10 sm:inline-flex"
            >
              <User className="h-4 w-4" aria-hidden="true" />
              Ingresar
            </Link>
          )}

          <button
            type="button"
            className="rounded-xl p-2 hover:bg-white/10 lg:hidden"
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
            aria-controls="menu-movil"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div id="menu-movil" className="max-h-[calc(100dvh-4.5rem)] overflow-y-auto overscroll-contain border-t border-white/10 bg-navy-900 px-4 pb-6 pt-3 lg:hidden">
          <nav aria-label="Menú móvil" className="flex flex-col">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={'end' in item ? item.end : false}
                className={({ isActive }) =>
                  `rounded-xl px-3 py-3 font-semibold ${isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-4 border-t border-white/10 pt-4">
            {session ? (
              <div className="rounded-2xl bg-white p-2 text-navy-900">
                <AccountLinks session={session} onSignOut={signOut} onNavigate={() => setMenuOpen(false)} />
              </div>
            ) : (
              <Link to="/ingresar" className="flex items-center gap-2 rounded-xl px-3 py-3 font-bold text-white hover:bg-white/10">
                <User className="h-4 w-4" aria-hidden="true" />
                Ingresar
              </Link>
            )}
          </div>
          <LinkButton to="/deportes" variant="primary" className="mt-4 w-full">
            Explorar actividades <span aria-hidden="true">→</span>
          </LinkButton>
        </div>
      ) : null}
    </header>
  );
}

export default Header;

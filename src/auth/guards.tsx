/** Protecciones de rutas. Sin sesión → /ingresar?volver=<ruta>. Sin rol → /sin-acceso. */
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './AuthContext';
import type { Role } from '../data';

function Waiting() {
  return <div className="mx-auto max-w-6xl px-4 py-24 text-center text-slate-500" role="status">Cargando…</div>;
}

export function RequireAuth() {
  const { session, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Waiting />;
  if (!session) return <Navigate to={`/ingresar?volver=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  return <Outlet />;
}

export function RequireGuest() {
  const { session, loading } = useAuth();
  if (loading) return <Waiting />;
  if (session) return <Navigate to="/perfil" replace />;
  return <Outlet />;
}

export function RequireRole({ roles }: { roles: Role[] }) {
  const { session, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Waiting />;
  if (!session) return <Navigate to={`/ingresar?volver=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  if (!roles.includes(session.profile.role)) return <Navigate to="/sin-acceso" replace />;
  return <Outlet />;
}

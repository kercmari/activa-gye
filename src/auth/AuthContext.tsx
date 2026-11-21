/** Sesión compartida por toda la página. Usar: const { session, loading, refresh } = useAuth(); */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { repo, type Session } from '../data';

type AuthState = { session: Session | null; loading: boolean; refresh: () => Promise<void> };
const AuthCtx = createContext<AuthState>({ session: null, loading: true, refresh: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = async () => {
    try { setSession(await repo.getSession()); } catch { setSession(null); } finally { setLoading(false); }
  };
  useEffect(() => {
    void refresh();
    const stop = repo.onAuthChange?.((s) => { setSession(s); setLoading(false); });
    return () => { stop?.(); };
  }, []);
  return <AuthCtx.Provider value={{ session, loading, refresh }}>{children}</AuthCtx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() { return useContext(AuthCtx); }

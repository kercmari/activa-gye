/** Fases encendidas (app_settings). Usar: const { settings, loading, reload } = useSettings(); */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { repo, type AppSettings } from '../data';

/** Mientras carga (o si falla) se asume solo la fase 1: nunca se muestra de más. */
export const DEFAULT_SETTINGS: AppSettings = { phase1: true, phase2: false, phase3: false, patient_limit: 5, patients_count: 0 };

type SettingsState = { settings: AppSettings; loading: boolean; reload: () => Promise<void> };
const Ctx = createContext<SettingsState>({ settings: DEFAULT_SETTINGS, loading: true, reload: async () => {} });

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    try { setSettings(await repo.getSettings()); } catch { setSettings(DEFAULT_SETTINGS); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  return <Ctx.Provider value={{ settings, loading, reload }}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings() { return useContext(Ctx); }

/** true si la fase n (1, 2 o 3) está encendida. */
// eslint-disable-next-line react-refresh/only-export-components
export function usePhase(n: 1 | 2 | 3): boolean {
  const { settings } = useSettings();
  return n === 1 ? settings.phase1 : n === 2 ? settings.phase2 : settings.phase3;
}

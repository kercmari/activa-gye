/**
 * Simulador de datos (sin servidor): solo para pruebas y para el modo sin base.
 * Fases 1–3 (ficha, nutricionista, pagos, reseñas) responden SIN_BASE: necesitan Supabase.
 * Dueño: orquestador.
 */
import type { AppSettings, Repo } from '../types';
import { withFallback } from '../fallback';
import { catalogPart } from './catalog';
import { accountsPart } from './accounts';

const MOCK_SETTINGS: AppSettings = { phase1: true, phase2: false, phase3: false, patient_limit: 5, patients_count: 0, admin_email: 'kerlyeliz19@gmail.com', free_patient_limit: 3, free_daily_record_limit: 10 };

export const mockRepo: Repo = withFallback({
  ...catalogPart,
  ...accountsPart,
  getSettings: async () => MOCK_SETTINGS,
});

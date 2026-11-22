/** Cliente único de Supabase (dueño: D1). Lo usan solo catalog.ts y account.ts. */
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL ?? 'http://localhost',
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'anon',
  { auth: { persistSession: true, autoRefreshToken: true } },
);

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_MARIBEL_URL || 'https://placeholder.supabase.co';
const key = import.meta.env.VITE_SUPABASE_MARIBEL_SERVICE_KEY || 'placeholder';

export const supabase = createClient(url, key);

export const isConfigured =
  !!import.meta.env.VITE_SUPABASE_MARIBEL_URL &&
  !!import.meta.env.VITE_SUPABASE_MARIBEL_SERVICE_KEY;

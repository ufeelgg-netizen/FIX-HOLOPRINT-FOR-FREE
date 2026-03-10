import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Code {
  id: string;
  code: string;
  type: 'unlimited' | 'limited';
  max_uses: number | null;
  current_uses: number;
  device_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://juvdgqfkpgelcetfjqhl.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_mixQaQt-Op1pd6-IWi9giw_j8ZpenBM';

export const supabase = createClient(supabaseUrl, supabaseKey);

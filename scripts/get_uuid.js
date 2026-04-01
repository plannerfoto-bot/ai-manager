import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function getId() {
  const { data, error } = await supabase.from('abandoned_cart_config').select('id, store_id').maybeSingle();
  if (error) console.error('Erro:', error.message);
  else {
    console.log('ID (UUID) REAL:', data.id);
    console.log('STORE_ID:', data.store_id);
  }
}

getId();

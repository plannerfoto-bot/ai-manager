import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
  console.log('--- Verificando abandoned_cart_config ---');
  const { data: abandoned, error: err1 } = await supabase.from('abandoned_cart_config').select('*').maybeSingle();
  if (err1) console.error('Erro abandoned_cart_config:', err1.message);
  else console.log('Dados abandoned_cart_config:', abandoned);

  console.log('\n--- Verificando marketing_settings ---');
  const { data: marketing, error: err2 } = await supabase.from('marketing_settings').select('*').limit(1);
  if (err2) console.error('Erro marketing_settings:', err2.message);
  else console.log('Dados marketing_settings:', marketing);
}

check();

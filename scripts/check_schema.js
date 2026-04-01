import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkSchema() {
  const { data, error } = await supabase.rpc('get_table_info', { t_name: 'nuvemshop_checkouts' });
  
  // Como RPC pode não existir, vamos tentar um select simples de uma linha e ver as chaves
  const { data: row, error: selectError } = await supabase.from('nuvemshop_checkouts').select('*').limit(1).maybeSingle();
  
  if (selectError) {
    console.error('Erro ao ler tabela:', selectError.message);
  } else {
    console.log('Colunas detectadas:', Object.keys(row || {}));
  }
}

checkSchema();

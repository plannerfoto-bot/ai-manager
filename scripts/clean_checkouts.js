import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function cleanTable() {
  console.log('🧹 Limpando tabela nuvemshop_checkouts...');
  const { error } = await supabase.from('nuvemshop_checkouts').delete().neq('id', '0');
  
  if (error) {
    console.error('❌ Erro ao limpar:', error.message);
  } else {
    console.log('✅ Tabela limpa com sucesso!');
  }
}

cleanTable();


import dotenv from 'dotenv';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: fs.existsSync('../nuvemshop-mcp/.env') ? '../nuvemshop-mcp/.env' : '.env' });

const supabaseUrl = process.env.SUPABASE_URL || 'https://juvdgqfkpgelcetfjqhl.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_mixQaQt-Op1pd6-IWi9giw_j8ZpenBM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testLog() {
    console.log('Tentando inserir log de teste...');
    const { data, error } = await supabase
        .from('automation_history')
        .insert([{
            store_id: '12345',
            product_id: 'TEST_ID',
            product_name: 'Produto de Teste Antigravity',
            event: 'test/persistence',
            status: 'Success',
            details: 'Verificação após migração de coluna'
        }]);

    if (error) {
        console.error('❌ Erro no teste:', error);
    } else {
        console.log('✅ Log inserido com sucesso!');
        console.log('Dados:', data);
    }
}

testLog();


import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Hardcoded for the repair script to ensure it works regardless of .env location
const supabaseUrl = 'https://juvdgqfkpgelcetfjqhl.supabase.co';
const supabaseKey = 'sb_publishable_mixQaQt-Op1pd6-IWi9giw_j8ZpenBM';
const supabase = createClient(supabaseUrl, supabaseKey);

const BASE_URL = "https://api.tiendanube.com/v1";

async function repair() {
    console.log('🔍 Iniciando reparo de imagens e nomes...');

    // 1. Busca jobs com dados ausentes
    const { data: queueJobs, error: qErr } = await supabase
        .from('post_queue')
        .select('*');

    const { data: historyJobs, error: hErr } = await supabase
        .from('automation_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

    if (qErr || hErr) {
        console.error('❌ Erro ao buscar dados:', qErr || hErr);
        return;
    }

    const filteredQueue = queueJobs.filter(j => !j.product_name || !j.image_url);
    const filteredHistory = historyJobs.filter(j => !j.product_name || !j.image_url);

    console.log(`📦 Encontrados ${filteredQueue.length} na fila e ${filteredHistory.length} no histórico para reparar.`);

    // Busca stores para tokens
    const { data: stores } = await supabase.from('stores').select('*');
    const storeMap = {};
    stores?.forEach(s => storeMap[s.id] = s.access_token);

    const processList = async (list, table) => {
        for (const job of list) {
            const storeId = job.store_id || '2767708';
            const productId = job.product_id;
            const token = storeMap[storeId];

            if (!productId || !token) {
                console.log(`⚠️ Pulando job ${job.id} (Falta ID ou Token)`);
                continue;
            }

            try {
                console.log(`🔄 Reparando ${productId} na tabela ${table}...`);
                const res = await axios.get(`${BASE_URL}/${storeId}/products/${productId}`, {
                    headers: { 'Authentication': `bearer ${token}`, 'User-Agent': 'RepairScript' }
                });
                const p = res.data;
                const name = p.name?.pt || p.name?.es || p.name?.en || Object.values(p.name || {})[0] || 'Produto';
                const image = p.images?.[0]?.src || '';

                const { error } = await supabase
                    .from(table)
                    .update({
                        product_name: name,
                        image_url: image
                    })
                    .eq('id', job.id);

                if (error) throw error;
                console.log(`✅ ${productId} reparado com sucesso.`);
            } catch (err) {
                console.error(`❌ Falha ao reparar ${productId}:`, err.message);
                if (err.response?.status === 404 && table === 'post_queue') {
                    console.log('🗑️ Produto deletado na Nuvemshop, removendo da fila...');
                    await supabase.from('post_queue').delete().eq('id', job.id);
                }
            }
        }
    };

    if (filteredQueue.length > 0) await processList(filteredQueue, 'post_queue');
    if (filteredHistory.length > 0) await processList(filteredHistory, 'automation_history');

    console.log('✨ Reparo concluído!');
}

repair();

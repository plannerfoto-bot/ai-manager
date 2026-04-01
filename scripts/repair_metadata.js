import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_FILE = path.join(__dirname, '../sync_progress.log');
const CHECKPOINT_FILE = path.join(__dirname, 'checkpoint_metadata.json');

function log(message) {
    // Horário de Brasília (America/Sao_Paulo)
    const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const formattedMessage = `[${timestamp}] ${message}`;
    console.log(formattedMessage);
    fs.appendFileSync(LOG_FILE, formattedMessage + '\n');
}

// Procurar .env na pasta atual (scripts) ou na pasta pai (ai-manager)
const envPath = fs.existsSync(path.join(__dirname, '../.env')) 
    ? path.join(__dirname, '../.env') 
    : path.join(__dirname, '.env');

dotenv.config({ path: envPath });

const ACCESS_TOKEN = process.env.NUVEMSHOP_ACCESS_TOKEN;
const STORE_ID = process.env.TIENDANUBE_STORE_ID;

if (!ACCESS_TOKEN || !STORE_ID) {
    console.error('❌ Erro: Credenciais (ACCESS_TOKEN ou STORE_ID) não encontradas no .env');
    process.exit(1);
}

const api = axios.create({
    baseURL: `https://api.nuvemshop.com.br/v1/${STORE_ID}`,
    headers: {
        'Authentication': `bearer ${ACCESS_TOKEN}`,
        'User-Agent': 'BulkRepairTool (admin@biags.com.br)',
        'Content-Type': 'application/json'
    }
});

const sleep = ms => new Promise(res => setTimeout(res, ms));

async function requestWithRetry(method, url, data) {
    let attempts = 0;
    while (attempts < 5) {
        try {
            return await api[method](url, data);
        } catch (error) {
            if (error.response?.status === 429) {
                log(`⚠️ Rate limit (429) atingido. Aguardando 30s para tentar novamente...`);
                await sleep(30000);
                attempts++;
            } else {
                throw error;
            }
        }
    }
    throw new Error(`Máximo de tentativas (5) atingido para ${url}`);
}

function slugify(text) {
    if (!text) return '';
    const str = typeof text === 'object' ? (text.pt || text.es || Object.values(text)[0]) : text;
    return str.toString().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^\w\s-]/g, '') // Remove caracteres especiais
        .replace(/\s+/g, '-') // Espaços por hifens
        .replace(/-+/g, '-') // Hifens repetidos
        .trim();
}

async function repairMetadata() {
    const isCommit = process.argv.includes('--commit');
    log(`🚀 Iniciando Reparo de Metadados (${isCommit ? 'MODO REAL' : 'MODO DRY-RUN'})`);

    try {
        let page = 1;
        
        // Carregar checkpoint se existir
        if (fs.existsSync(CHECKPOINT_FILE)) {
            try {
                const checkpoint = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8'));
                if (checkpoint.page) {
                    page = checkpoint.page;
                    log(`🔄 Retomando progresso a partir da página ${page}...`);
                }
            } catch (e) {
                log(`⚠️ Erro ao ler checkpoint: ${e.message}. Começando do zero.`);
            }
        }

        let hasMore = true;
        let totalProcessed = 0;

        while (hasMore) {
            log(`📦 Buscando página ${page} (Novos primeiro)...`);
            let response;
            try {
                response = await requestWithRetry('get', '/products', { 
                    params: { 
                        page, 
                        per_page: 50,
                        sort_by: 'created-at-descending'
                    } 
                });
            } catch (error) {
                if (error.response?.status === 404 && error.response?.data?.description?.includes('Last page')) {
                    log(`ℹ️ Última página alcançada. Finalizando...`);
                    hasMore = false;
                    break;
                }
                throw error;
            }
            const products = response.data;

            if (products.length === 0) {
                hasMore = false;
                break;
            }

            for (const product of products) {
                const productName = product.name.pt || product.name;
                const newHandle = slugify(productName);
                const newSku = productName; // Mantendo o Nome como solicitado pelo usuário

                let needsUpdate = false;
                const updateData = {};

                // Verificar Handle
                if (product.handle.pt !== newHandle && product.handle !== newHandle) {
                    log(`🔗 [URL] ${productName}: ${product.handle.pt || product.handle} -> ${newHandle}`);
                    updateData.handle = { pt: newHandle };
                    needsUpdate = true;
                }

                // Verificar SKU nas variantes
                const variantsToUpdate = [];
                for (const variant of product.variants) {
                    if (variant.sku !== newSku) {
                        log(`🆔 [SKU] ${productName} (V:${variant.id}): ${variant.sku || 'N/A'} -> ${newSku}`);
                        variantsToUpdate.push({ id: variant.id, sku: newSku });
                        needsUpdate = true;
                    }
                }

                if (needsUpdate && isCommit) {
                    log(`💾 Salvando alterações para: ${productName}...`);
                    // Atualiza o produto (handle)
                    if (updateData.handle) {
                        await requestWithRetry('put', `/products/${product.id}`, { handle: updateData.handle });
                        await sleep(1000); // Pausa base entre requisições
                    }
                    // Atualiza SKUs das variantes (via endpoint de variante)
                    for (const v of variantsToUpdate) {
                        await requestWithRetry('put', `/products/${product.id}/variants/${v.id}`, { sku: v.sku });
                        await sleep(1000); // Pausa base entre requisições
                    }
                }
            }

            // Salvar checkpoint para a próxima página
            page++;
            if (isCommit) {
                fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify({ page }));
            }
        }

        log(`\n🏁 PROCESSO FINALIZADO: Todos os produtos foram verificados.`);
        if (fs.existsSync(CHECKPOINT_FILE)) {
            fs.unlinkSync(CHECKPOINT_FILE);
        }
    } catch (error) {
        log(`❌ Erro durante o processo: ${error.response?.data || error.message}`);
    }
}

repairMetadata();

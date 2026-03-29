import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_FILE = path.join(__dirname, '../seo_progress.log');
const CHECKPOINT_FILE = path.join(__dirname, 'checkpoint_seo.json');

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

function cleanProductName(name) {
    // Ex: "Fundo Fotográfico - Dia das Mães" -> "Fundo Fotográfico Dia das Mães"
    return name.replace(' - ', ' ');
}

async function repairSeo() {
    const isCommit = process.argv.includes('--commit');
    log(`🚀 Iniciando Padronização de SEO (${isCommit ? 'MODO REAL' : 'MODO DRY-RUN'})`);

    try {
        let page = 1;

        // Carregar checkpoint se existir
        if (fs.existsSync(CHECKPOINT_FILE)) {
            try {
                const checkpoint = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8'));
                if (checkpoint.page) {
                    page = checkpoint.page;
                    log(`🔄 Retomando progresso de SEO a partir da página ${page}...`);
                }
            } catch (e) {
                log(`⚠️ Erro ao ler checkpoint de SEO: ${e.message}. Começando do zero.`);
            }
        }

        let hasMore = true;

        while (hasMore) {
            log(`📦 Buscando página ${page} (Novos primeiro)...`);
            const response = await api.get('/products', { 
                params: { 
                    page, 
                    per_page: 50,
                    sort_by: 'created-at-descending'
                } 
            });
            const products = response.data;

            if (products.length === 0) {
                hasMore = false;
                break;
            }

            for (const product of products) {
                const productName = product.name.pt || product.name;
                const cleanName = cleanProductName(productName);
                
                // Padrão solicitado pelo usuário:
                // SEO Title: "[Nome] | Cloth Sublimação"
                // SEO Description: "Compre [Nome] em tecido sublimado de alta qualidade. Não amassa e não reflete luz. Perfeito para ensaios fotográficos. Confira!"
                
                let targetSeoTitle = `${cleanName} | Cloth Sublimação`;
                if(targetSeoTitle.length > 70) {
                    // Truncate safely if too long 
                    const overflow = targetSeoTitle.length - 70;
                    targetSeoTitle = `${cleanName.substring(0, cleanName.length - overflow - 3)}... | Cloth Sublimação`;
                }

                let targetSeoDesc = `Compre ${cleanName} em tecido sublimado de alta qualidade. Não amassa e não reflete luz. Perfeito para ensaios fotográficos. Confira!`;
                if (targetSeoDesc.length > 160) {
                    targetSeoDesc = `Compre ${cleanName.substring(0, 50)}... Alta qualidade, não amassa e não reflete luz. Confira!`;
                }

                let needsUpdate = false;
                const updateData = {};

                const currentTitle = product.seo_title?.pt || product.seo_title || '';
                const currentDesc = product.seo_description?.pt || product.seo_description || '';

                if (currentTitle !== targetSeoTitle) {
                    log(`📝 [SEO Título] ${currentTitle || 'Vazio'} -> ${targetSeoTitle}`);
                    updateData.seo_title = { pt: targetSeoTitle };
                    needsUpdate = true;
                }

                if (currentDesc !== targetSeoDesc) {
                    log(`📝 [SEO Descrição] Atualizando para -> ${targetSeoDesc}`);
                    updateData.seo_description = { pt: targetSeoDesc };
                    needsUpdate = true;
                }

                if (needsUpdate && isCommit) {
                    log(`💾 Salvando SEO para: ${productName}...`);
                    if (Object.keys(updateData).length > 0) {
                        await requestWithRetry('put', `/products/${product.id}`, updateData);
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

        log(`\n🏁 PROCESSO SEO FINALIZADO: Todos os produtos foram verificados.`);
        if (fs.existsSync(CHECKPOINT_FILE)) {
            fs.unlinkSync(CHECKPOINT_FILE);
        }
    } catch (error) {
        log(`❌ Erro durante o processo de SEO: ${error.response?.data || error.message}`);
    }
}

repairSeo();

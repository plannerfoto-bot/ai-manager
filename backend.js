import express from 'express';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import cors from 'cors';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import os from 'os';
import igService from './src/instagramService.js';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: fs.existsSync('../nuvemshop-mcp/.env') ? '../nuvemshop-mcp/.env' : '.env' });

// --- CONFIGURAÇÃO SUPABASE ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;
if (supabase) console.log('✅ Supabase conectado para persistência.');
else console.warn('⚠️ Supabase não configurado. Usando stores.json (efêmero no Render).');


const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Middleware para evitar cache do index.html (forçar atualização do frontend)
app.use((req, res, next) => {
  if (req.path === '/' || req.path === '/index.html') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

app.use(express.static('dist'));
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// --- CONFIGURAÇÕES DE APLICATIVO PARCEIRO (OAUTH) ---
const APP_ID = process.env.NUVEMSHOP_APP_ID;
const APP_SECRET = process.env.NUVEMSHOP_APP_SECRET;
const PUBLIC_URL = process.env.PUBLIC_URL || 'https://ai-manager-nuvemshop.onrender.com';

// Persistência de Tokens (Múltiplas Lojas)
const STORES_FILE = path.join(__dirname, 'stores.json');

async function getStores() {
  let stores = {};
  
  // 1. Tenta carregar do Supabase primeiro
  if (supabase) {
    try {
      const { data, error } = await supabase.from('ai_manager_config').select('*');
      if (!error && data) {
        data.forEach(row => {
          stores[row.store_id] = {
            access_token: row.access_token,
            meta_token: row.meta_token,
            fb_page_id: row.fb_page_id,
            feed_caption_template: row.feed_caption_template,
            updatedAt: row.updated_at
          };
        });
        return stores;
      }
    } catch (e) {
      console.error('Erro ao ler Supabase:', e);
    }
  }

  // 2. Fallback para stores.json local
  if (fs.existsSync(STORES_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(STORES_FILE, 'utf8'));
    } catch (e) {
      return {};
    }
  }
  return {};
}

async function saveStore(storeId, data) {
  // 1. Salva no Supabase se disponível
  if (supabase) {
    try {
      const { error } = await supabase.from('ai_manager_config').upsert({
        store_id: storeId.toString(),
        access_token: data.access_token,
        meta_token: data.meta_token,
        fb_page_id: data.fb_page_id,
        feed_caption_template: data.feed_caption_template,
        updated_at: new Date().toISOString()
      }, { onConflict: 'store_id' });
      
      if (error) console.error('Erro ao salvar no Supabase:', error);
    } catch (e) {
      console.error('Erro ao salvar no Supabase:', e);
    }
  }

  // 2. Atualiza local também
  const stores = await getStores();
  stores[storeId] = { 
    ...stores[storeId], 
    ...data, 
    updatedAt: new Date().toISOString() 
  };
  fs.writeFileSync(STORES_FILE, JSON.stringify(stores, null, 2));
}

// Token legado (para compatibilidade enquanto migramos)
const DEFAULT_ACCESS_TOKEN = process.env.TIENDANUBE_ACCESS_TOKEN || process.env.NUVEMSHOP_ACCESS_TOKEN;
const DEFAULT_STORE_ID = process.env.TIENDANUBE_STORE_ID || process.env.NUVEMSHOP_STORE_ID;
const BASE_URL = process.env.TIENDANUBE_BASE_URL || "https://api.tiendanube.com/v1";

// Helper: Criar cliente da API para uma loja específica
async function getApiClient(storeId = DEFAULT_STORE_ID) {
  const stores = await getStores();
  const token = stores[storeId]?.access_token || DEFAULT_ACCESS_TOKEN;
  
  return axios.create({
    baseURL: `${BASE_URL}/${storeId}`,
    headers: {
      "Authentication": `bearer ${token}`,
      "User-Agent": process.env.NUVEMSHOP_USER_AGENT || "ai-manager-bot (contato@suabrand.com)",
      "Content-Type": "application/json",
    },
  });
}

// Endpoint de debug (Mascarado para segurança)
app.get('/api/debug-env', async (req, res) => {
  const mask = (str) => str ? `${str.substring(0, 4)}***${str.substring(str.length - 4)}` : 'MISSING';
  const stores = await getStores();
  const defaultStore = stores[DEFAULT_STORE_ID] || {};
  res.json({
    hasAppId: !!APP_ID,
    hasAppSecret: !!APP_SECRET,
    storesCount: Object.keys(stores).length,
    defaultStoreToken: mask(defaultStore.access_token),
    defaultStoreId: DEFAULT_STORE_ID,
    publicUrl: PUBLIC_URL
  });
});

// --- ROTAS DE AUTENTICAÇÃO OAUTH ---

// 1. Rota de Instalação (Redireciona para Nuvemshop)
app.get('/api/auth/install', (req, res) => {
  if (!APP_ID) return res.status(500).send("Variável NUVEMSHOP_APP_ID não configurada.");
  
  const scopes = 'write_scripts,read_products,read_shipping';
  const authUrl = `https://www.nuvemshop.com.br/apps/${APP_ID}/authorize?scope=${scopes}`;
  
  console.log("[OAuth] Iniciando instalação para:", authUrl);
  res.redirect(authUrl);
});

// 2. Rota de Callback (Recebe o code e troca por token)
app.get('/api/auth/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send("Falta o parâmetro 'code'.");

  try {
    console.log("[OAuth] Trocando código por token...");
    const response = await axios.post('https://www.tiendanube.com/apps/authorize/token', {
      client_id: APP_ID,
      client_secret: APP_SECRET,
      grant_type: 'authorization_code',
      code: code
    });

    const { access_token, user_id } = response.data;
    console.log(`[OAuth] Sucesso! Loja ID: ${user_id}`);

    // Salva na persistência
    await saveStore(user_id, { access_token });

    // --- INSTALAÇÃO AUTOMÁTICA DO SCRIPT ---
    const scriptSrc = `${PUBLIC_URL}/api/script.js`;
    const tempClient = axios.create({
      baseURL: `${BASE_URL}/${user_id}`,
      headers: {
        'Authentication': `bearer ${access_token}`,
        'Content-Type': 'application/json',
        'User-Agent': `AI-Manager-Bot (${user_id})`
      }
    });

    try {
      // Lista scripts existentes deste app e remove para não duplicar
      const existingRes = await tempClient.get('/scripts');
      const existingList = Array.isArray(existingRes.data) ? existingRes.data : (existingRes.data?.result || []);
      const toRemove = existingList.find(s => s.src && s.src.includes('ai-manager-nuvemshop.onrender.com'));
      if (toRemove) await tempClient.delete('/scripts/' + toRemove.id).catch(() => {});

      // Cria o script com o formato legado da API v1 (sem wrapper)
      await tempClient.post('/scripts', {
        src: scriptSrc,
        event: 'onload',
        where: 'store'
      });
      console.log(`[OAuth] Script injetado automaticamente na loja ${user_id}`);
    } catch (scriptErr) {
      console.error("[OAuth] Falha ao injetar script pós-instalação:", scriptErr.response?.data || scriptErr.message);
    }

    res.send(`
      <div style="background: #020617; color: white; font-family: sans-serif; height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center;">
        <div style="border: 1px solid #1e293b; padding: 40px; border-radius: 24px; background: #0f172a; max-width: 500px;">
          <h1 style="color: #4ade80; font-size: 2.5rem; margin-bottom: 20px;">🎉 Sucesso!</h1>
          <p style="font-size: 1.1rem; color: #94a3b8; line-height: 1.6;">
            O <b>AI Manager</b> foi instalado com sucesso na sua loja <b>${user_id}</b>.
          </p>
          <p style="font-size: 0.9rem; color: #64748b; margin-top: 20px;">
            A calculadora já deve estar ativa nos seus produtos.<br/>
            Você pode fechar esta aba agora.
          </p>
        </div>
      </div>
    `);
  } catch (error) {
    console.error("[OAuth] Erro no callback:", error.response?.data || error.message);
    res.status(500).json({ error: "Erro na autenticação", details: error.response?.data });
  }
});

// Endpoint para instalação manual (Útil se o callback falhar ou for bypassado)
app.get('/api/scripts/force-install', async (req, res) => {
  const storeId = req.query.store_id || DEFAULT_STORE_ID;
  const token = req.query.token || DEFAULT_ACCESS_TOKEN;

  if (!storeId || !token) {
    return res.status(400).json({ error: "Faltam parâmetros store_id ou token." });
  }

  try {
    const client = axios.create({
      baseURL: `${BASE_URL}/${storeId}`,
      headers: {
        'Authentication': `bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': `AI-Manager-Bot (${storeId})`
      }
    });

    const scriptSrc = `${PUBLIC_URL}/api/script.js`;
    
    // Remove antigos
    const existingRes = await client.get('/scripts');
    const existingList = Array.isArray(existingRes.data) ? existingRes.data : (existingRes.data?.result || []);
    const toRemove = existingList.find(s => s.src && s.src.includes('script.js'));
    if (toRemove) await client.delete('/scripts/' + toRemove.id).catch(() => {});

    // Instala novo
    const installRes = await client.post('/scripts', {
      src: scriptSrc,
      event: 'onload',
      where: 'store'
    });

    res.json({ success: true, message: "Script injetado com sucesso!", data: installRes.data });
  } catch (err) {
    console.error("Erro na instalação manual:", err.response?.data || err.message);
    res.status(500).json({ error: "Falha na instalação", details: err.response?.data });
  }
});

// Funçao central de cálculo de preço - usada por simulate-price e create-variant
function calcMeasure(w, h) {
  const max = Math.max(w, h);
  const min = Math.min(w, h);
  
  // Regra Especial: UMA das dimensões entre 1,56m e 1,74m (exclusive)
  // Resultado = Altura x Largura x R$24,90 + R$65,00, apenas tecido 120g (sem emenda)
  const inSpecialRange = (d) => d > 1.56 && d < 1.74;
  const isSpecial = (inSpecialRange(w) || inSpecialRange(h)) && !(w > 1.56 && h > 1.56 && w < 1.74 && h < 1.74 && false);
  
  if (isSpecial) {
    const price = (w * h * 24.90) + 65.00;
    return { price120: price, price160: null, measureType: 'special_seamless', isSpecial: true };
  }

  // Regra A: menor dimensão <= 1,56m
  if (min <= 1.56) {
    return {
      price120: (max * 22.50) + 3.00 + 45.00,
      price160: (max * 26.00) + 3.00 + 45.00,
      measureType: 'standard', isSpecial: false
    };
  }
  
  // Regra B: ambas as dimensões > 1,56m (e não na faixa especial)
  return {
    price120: (((max * 2) * 22.50) + 15.00) * 1.80,
    price160: (((max * 2) * 26.00) + 15.00) * 1.80,
    measureType: 'double_layer', isSpecial: false
  };
}

// --- SIMULAR PREÇO (Frontend Instantâneo) ---
app.post('/api/simulate-price', (req, res) => {
  try {
    const { width, height } = req.body;
    const w = parseFloat(String(width).replace(',', '.'));
    const h = parseFloat(String(height).replace(',', '.'));
    if (!w || !h || w <= 0 || h <= 0) return res.status(400).json({ error: 'Medidas inválidas. Recebido: ' + width + 'x' + height });
    
    const min = Math.min(w, h);
    if (min > 3) return res.status(400).json({ error: 'Menor dimensão não pode ultrapassar 3,00m' });
    
    const result = calcMeasure(w, h);
    res.json({
      price120: result.price120 ? result.price120.toFixed(2) : null,
      price160: result.price160 ? result.price160.toFixed(2) : null,
      measureType: result.measureType,
      isSpecial: result.isSpecial
    });
  } catch (error) {
    res.status(500).json({ error: "Erro interno no cálculo", details: error.message });
  }
});


// --- CRIAR VARIACAO DINAMICA SOB MEDIDA ---
app.post('/api/create-variant', async (req, res) => {
  try {
    const { productId, width, height, gramatura } = req.body;
    const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
    if (!storeId || !productId) return res.status(400).json({ error: 'Loja ou Produto nao identificado.' });
    
    const client = getApiClient(storeId);
    
    const w = parseFloat(String(width).replace(',', '.'));
    const h = parseFloat(String(height).replace(',', '.'));
    if (!w || !h || w <= 0 || h <= 0) return res.status(400).json({ error: 'Medidas invalidas. Recebido: ' + width + 'x' + height });
    
    const min = Math.min(w, h);
    if (min > 3) return res.status(400).json({ error: 'Menor dimensao nao pode ultrapassar 3,00m' });
    
    // Usa a funcao central de calculo
    const calcResult = calcMeasure(w, h);
    const { measureType } = calcResult;
    const price120 = calcResult.price120;
    const price160 = calcResult.price160; // null quando medicao especial sem emenda
    
    // Se o cliente pediu 160g mas a medida e especial (sem emenda, somente 120g), recusa
    if (gramatura === '160g' && measureType === 'special_seamless') {
      return res.status(400).json({ error: 'Esta medida e disponivel apenas em TECIDO 120g (sem emenda).' });
    }
    
    const priceStr = (gramatura === '160g' ? price160 : price120).toFixed(2);
    const measureStr = `${w.toFixed(2).replace('.', ',')}m x ${h.toFixed(2).replace('.', ',')}m`;
    
    // Timestamp atual para identificar variantes criadas pelo sistema (para limpeza 24h)
    const nowTs = Date.now();
    const createdMark = 'calc:' + nowTs; // fica no campo SKU da variante
    
    // Busca o produto
    const prodRes = await client.get(`/products/${productId}`);
    const product = prodRes.data;
    
    // Detecta o sufixo real de gramatura usado na loja
    let gramSuffix = 'g';
    outer: for (const v of product.variants || []) {
      for (const val of v.values || []) {
        const pt = (val.pt || '').toLowerCase();
        if (pt.includes('120gr') || pt.includes('160gr')) { gramSuffix = 'gr'; break outer; }
      }
    }
    console.log('[Gramatura] Sufixo detectado: "' + gramSuffix + '" | Tipo de medida: ' + measureType);
    const gram120label = '120' + gramSuffix;
    const gram160label = '160' + gramSuffix;
    
    // Garante atributos do produto
    let attributes = product.attributes || [];
    if (attributes.length === 0) {
      attributes = [{ pt: 'Tamanho' }, { pt: 'Gramatura' }];
      await client.put(`/products/${productId}`, { attributes });
    }
    
    const baseVariant = (product.variants || [])[0] || null;
    const buildValues = (measure, gram) => attributes.map((attr, idx) => {
      const attrName = (attr.pt || attr.es || attr.en || '').toLowerCase();
      if (attrName.includes('gramatura') || attrName.includes('tecido') || attrName.includes('material')) return { pt: gram };
      if (attrName.includes('tamanho') || attrName.includes('medida') || attrName.includes('dimens')) return { pt: measure };
      if (idx === 0) return { pt: measure };
      if (idx === 1) return { pt: gram };
      return (baseVariant && baseVariant.values && baseVariant.values[idx]) ? baseVariant.values[idx] : { pt: '-' };
    });

    const norm = (s) => (s || '').trim().toLowerCase();
    const findOrCreate = async (measure, gramLabel, price) => {
      const targetValues = buildValues(measure, gramLabel);
      const existing = product.variants.find(v => {
        if (!v.values) return false;
        return targetValues.every((tv, i) => v.values[i] && norm(v.values[i].pt) === norm(tv.pt));
      });
      if (existing) {
        console.log('[Variante] Ja existe: ' + measure + ' / ' + gramLabel + ' id=' + existing.id);
        return existing.id;
      }
      if (product.variants.length > 80) {
        const custom = product.variants.filter(v => v.values && v.values.some(val => val.pt && /\d+,\d+m x \d+,\d+m/.test(val.pt)));
        if (custom.length > 0) {
          const oldest = custom.reduce((a, b) => a.id < b.id ? a : b);
          await client.delete(`/products/${productId}/variants/${oldest.id}`).catch(() => {});
        }
      }
      // Grava timestamp no SKU para identificar e limpar apos 24h
      const payload = {
        price: price.toFixed(2),
        stock: 999,
        weight: baseVariant ? baseVariant.weight : 0.5,
        values: targetValues,
        sku: createdMark  // ex: "calc:1711405200000" - identificador de limpeza
      };
      console.log('[Variante] Criando: ' + measure + ' / ' + gramLabel + ' = R$' + price.toFixed(2) + ' | SKU: ' + createdMark);
      const createRes = await client.post(`/products/${productId}/variants`, payload);
      product.variants.push(createRes.data);
      return createRes.data.id;
    };

    // Para medidas especiais (sem emenda), cria APENAS a variante 120g
    // Para medidas normais, cria os DOIS pares de gramatura
    let chosenId;
    if (measureType === 'special_seamless') {
      chosenId = await findOrCreate(measureStr, gram120label, price120);
    } else {
      const variant120Id = await findOrCreate(measureStr, gram120label, price120);
      const variant160Id = await findOrCreate(measureStr, gram160label, price160);
      chosenId = (gramatura === '160g') ? variant160Id : variant120Id;
    }

    res.json({ success: true, variant_id: chosenId, price: priceStr, measureType });
    
  } catch (error) {
    console.error('[Criacao de Variante] Falha:', error.response?.data || error.message);
    const apiError = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    res.status(500).json({ error: 'Erro Nuvemshop: ' + apiError, details: error.response?.data });
  }
});

// --- LIMPEZA AUTOMATICA: Deleta variantes com SKU 'calc:TIMESTAMP' criadas ha mais de 24h ---
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // roda a cada 30 minutos
const EXPIRY_MS = 24 * 60 * 60 * 1000;       // 24 horas

async function cleanupExpiredVariants() {
  console.log('[Limpeza 24h] Iniciando varredura de variantes expiradas...');
  const stores = await getStores();
  const storeIds = Object.keys(stores);
  const now = Date.now();

  for (const storeId of storeIds) {
    try {
      const client = await getApiClient(storeId);
      
      // --- ESCUDO DE PEDIDOS: Protege variantes vendidas nos últimos 200 pedidos ---
      const ordersRes = await client.get('/orders', { params: { per_page: 200, status: 'any', fields: 'line_items' } }).catch(() => ({ data: [] }));
      const protectedVariantIds = new Set();
      (ordersRes.data || []).forEach(order => {
        (order.line_items || []).forEach(item => {
          if (item.variant_id) protectedVariantIds.add(item.variant_id);
        });
      });
      console.log(`[Limpeza 24h] Loja ${storeId}: ${protectedVariantIds.size} variantes protegidas por vendas.`);

      // Busca produtos para limpeza
      const prodRes = await client.get('/products', { params: { per_page: 200, fields: 'id,variants' } });
      const products = prodRes.data || [];
      
      for (const product of products) {
        const variants = product.variants || [];
        for (const variant of variants) {
          const sku = variant.sku || '';
          if (sku.startsWith('calc:')) {
            const ts = parseInt(sku.replace('calc:', ''), 10);
            
            // Regra de Ouro: So apaga se for velho E NAO estiver em um pedido
            if (!isNaN(ts) && (now - ts) > EXPIRY_MS) {
              if (protectedVariantIds.has(variant.id)) {
                console.log('[Limpeza 24h] Poupando variante VENDIDA id=' + variant.id);
                continue;
              }
              console.log('[Limpeza 24h] Deletando variante expirada id=' + variant.id + ' produto=' + product.id + ' sku=' + sku);
              await client.delete('/products/' + product.id + '/variants/' + variant.id).catch(err => {
                console.error('[Limpeza 24h] Erro ao deletar:', err.message);
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('[Limpeza 24h] Erro na loja ' + storeId + ':', err.message);
    }
  }
  console.log('[Limpeza 24h] Varredura concluida.');
}

// Inicia o scheduler de limpeza
setInterval(cleanupExpiredVariants, CLEANUP_INTERVAL_MS);
console.log('[Limpeza 24h] Scheduler iniciado - rodara a cada 30 minutos.');

/**
 * SALVAR CONFIGURAÇÕES DE MARKETING (META/INSTAGRAM)
 */
app.post('/api/marketing/settings', async (req, res) => {
    const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
    const { meta_token, fb_page_id, feed_caption_template } = req.body;

    if (!meta_token || !fb_page_id) {
        return res.status(400).json({ error: 'Token e Page ID são obrigatórios.' });
    }

    try {
        await saveStore(storeId, {
            meta_token,
            fb_page_id,
            feed_caption_template: feed_caption_template || ''
        });
        res.json({ success: true, message: 'Configurações de marketing salvas com sucesso!' });
    } catch (e) {
        res.status(500).json({ error: 'Erro ao salvar configurações.' });
    }
});

/**
 * BUSCAR CONFIGURAÇÕES DE MARKETING
 */
app.get('/api/marketing/settings', async (req, res) => {
    const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
    const stores = await getStores();
    const storeData = stores[storeId] || {};

    res.json({
        meta_token: storeData.meta_token || '',
        fb_page_id: storeData.fb_page_id || '',
        feed_caption_template: storeData.feed_caption_template || ''
    });
});

/**
 * HELPER: Monta a legenda do Feed substituindo variáveis
 * Variáveis suportadas: {{product_name}}, {{product_link}}
 */
function buildFeedCaption(template, productName, productLink) {
    const defaultTemplate = `✨ NOVIDADE NA CLOTH! ✨\n\n{{product_name}}\n\nGaranta o seu agora mesmo no nosso site! 🚀\n\n🔗 {{product_link}}\n\n#clothsublimacao #novidade #sublimacao #personalizados`;
    const tpl = (template && template.trim()) ? template : defaultTemplate;
    return tpl
        .replace(/{{product_name}}/g, productName)
        .replace(/{{product_link}}/g, productLink);
}

/**
 * POSTAGEM MANUAL NO INSTAGRAM
 * Recebe productId (ou imageUrl+caption diretamente) e posta no Feed e/ou Story
 */
app.post('/api/instagram/publish', async (req, res) => {
    const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
    const { productId, customCaption, postFeed = true, postStory = true } = req.body;

    try {
        const stores = await getStores();
        const storeData = stores[storeId] || {};

        const metaToken = process.env.META_ACCESS_TOKEN || storeData.meta_token;
        const fbPageId = process.env.FB_PAGE_ID || storeData.fb_page_id;

        if (!metaToken || !fbPageId) {
            return res.status(400).json({ error: 'Meta Access Token ou Page ID não configurados. Vá em Marketing > Configurações.' });
        }

        // Busca dados do produto para obter imagem e link
        const client = await getApiClient(storeId);
        const productRes = await client.get(`/products/${productId}`);
        const product = productRes.data;

        const productName = (product.name && product.name.pt) ? product.name.pt : (product.name ? Object.values(product.name)[0] : 'Produto');
        const productHandle = (product.handle && product.handle.pt) ? product.handle.pt : (product.handle ? Object.values(product.handle)[0] : '');
        const productLink = `https://${storeData.domain || 'clothsublimacao.com.br'}/produtos/${productHandle}`;
        const mainImage = product.images && product.images.length > 0 ? product.images[0].src : null;

        if (!mainImage) {
            return res.status(400).json({ error: 'Este produto não possui imagem cadastrada.' });
        }

        // Obtém ID da conta do Instagram
        const igAccountId = await igService.getInstagramAccountId(fbPageId, metaToken);
        if (!igAccountId) {
            return res.status(500).json({ error: 'Não foi possível encontrar a conta do Instagram vinculada à Página do Facebook.' });
        }

        const results = {};

        // --- FEED ---
        if (postFeed) {
            // Usa legenda customizada do campo (se enviada), senão usa o template salvo
            const feedCaption = customCaption
                ? customCaption
                : buildFeedCaption(storeData.feed_caption_template, productName, productLink);

            const feedContainerId = await igService.createFeedContainer(igAccountId, mainImage, feedCaption, metaToken);
            const feedPostId = await igService.publishMedia(igAccountId, feedContainerId, metaToken);
            results.feed = { success: true, postId: feedPostId };
            console.log(`✅ [Manual] Feed postado: ${feedPostId}`);
        }

        // --- STORY (apenas a imagem + link no caption, sem legenda de texto visível) ---
        if (postStory) {
            // Na API do Instagram, Stories não exibem caption. O link fica como metadata.
            // Usamos o campo link_sticker quando disponível, mas para contas Business
            // o padrão é postar apenas a imagem. O link do produto vai no campo caption
            // do container para que a API o registre (não aparece visivelmente).
            const storyContainerId = await igService.createStoryContainer(igAccountId, mainImage, productLink, metaToken);
            const storyPostId = await igService.publishMedia(igAccountId, storyContainerId, metaToken);
            results.story = { success: true, postId: storyPostId };
            console.log(`✅ [Manual] Story postado: ${storyPostId}`);
        }

        res.json({ success: true, results, productName, productLink });

    } catch (error) {
        const detail = error.response?.data || error.message;
        console.error('❌ [Manual] Erro ao publicar no Instagram:', detail);
        res.status(500).json({ error: 'Erro ao publicar no Instagram.', details: detail });
    }
});

/**
 * REGISTRO AUTOMÁTICO DE WEBHOOK NA NUVEMSHOP
 * Cadastra o evento product/created para disparar a postagem automática no Instagram
 */
app.post('/api/webhooks/register', async (req, res) => {
    try {
        const stores = await getStores();
        // Usa a primeira loja encontrada (single-tenant)
        const storeId = Object.keys(stores)[0];
        const storeData = stores[storeId];

        if (!storeData || !storeData.access_token) {
            return res.status(400).json({ error: 'Loja não encontrada ou sem access token configurado.' });
        }

        // URL pública do AI Manager (Render)
        const baseUrl = process.env.APP_URL || 'https://ai-manager-nuvemshop.onrender.com';
        const webhookUrl = `${baseUrl}/api/webhooks/product-created`;

        // Consulta webhooks existentes para evitar duplicata
        const listRes = await axios.get(
            `https://api.tiendanube.com/v1/${storeId}/webhooks`,
            { headers: { 'Authentication': `bearer ${storeData.access_token}`, 'User-Agent': 'AIManager/1.0' } }
        );
        const existingWebhooks = listRes.data || [];
        const alreadyRegistered = existingWebhooks.find(
            wh => wh.event === 'product/created' && wh.url === webhookUrl
        );

        if (alreadyRegistered) {
            console.log('✅ Webhook já registrado:', alreadyRegistered.id);
            return res.json({ success: true, message: 'Webhook já estava registrado.', webhook: alreadyRegistered });
        }

        // Cria o novo webhook
        const createRes = await axios.post(
            `https://api.tiendanube.com/v1/${storeId}/webhooks`,
            { event: 'product/created', url: webhookUrl },
            { headers: { 'Authentication': `bearer ${storeData.access_token}`, 'User-Agent': 'AIManager/1.0', 'Content-Type': 'application/json' } }
        );

        console.log('✅ Webhook registrado com sucesso:', createRes.data);
        res.json({ success: true, message: 'Webhook registrado com sucesso!', webhook: createRes.data });

    } catch (error) {
        const detail = error.response?.data || error.message;
        console.error('❌ Erro ao registrar webhook:', detail);
        res.status(500).json({ error: 'Erro ao registrar webhook na Nuvemshop.', details: detail });
    }
});

/**
 * LISTAR WEBHOOKS: Retorna os webhooks registrados
 */
app.get('/api/webhooks/list', async (req, res) => {
    try {
        const stores = await getStores();
        const storeId = Object.keys(stores)[0];
        const storeData = stores[storeId];

        if (!storeData || !storeData.access_token) {
            return res.status(400).json({ error: 'Loja não encontrada ou sem access token.' });
        }

        const listRes = await axios.get(
            `https://api.tiendanube.com/v1/${storeId}/webhooks`,
            { headers: { 'Authentication': `bearer ${storeData.access_token}`, 'User-Agent': 'AIManager/1.0' } }
        );

        res.json({ success: true, webhooks: listRes.data || [] });
    } catch (error) {
        const detail = error.response?.data || error.message;
        res.status(500).json({ error: 'Erro ao listar webhooks.', details: detail });
    }
});

/**
 * WEBHOOK: Novo Produto Criado
 * Aciona a postagem automática no Instagram
 */
app.post('/api/webhooks/product-created', async (req, res) => {
    // Nuvemshop Webhooks podem enviar o storeId no header ou body
    const storeId = req.headers['x-linkedstore-store-id'] || req.body.store_id || DEFAULT_STORE_ID;
    const event = req.body.event;
    const productId = req.body.id;

    console.log(`\n📦 Webhook recebido: ${event} para loja ${storeId} (Produto: ${productId})`);

    // Responde 200 imediatamente para a Nuvemshop não reenviar
    res.status(200).send('OK');

    if (event !== 'product/created') return;

    try {
        const stores = await getStores();
        const storeData = stores[storeId];

        if (!storeData || !storeData.access_token) {
            console.warn(`⚠️ Loja ${storeId} não encontrada ou sem token para automação.`);
            return;
        }

        // 1. Busca detalhes completos do produto na Nuvemshop
        const client = await getApiClient(storeId);
        const productRes = await client.get(`/products/${productId}`);

        const product = productRes.data;
        const productName = (product.name && product.name.pt) ? product.name.pt : (product.name ? Object.values(product.name)[0] : 'Novo Produto');
        const productHandle = (product.handle && product.handle.pt) ? product.handle.pt : (product.handle ? Object.values(product.handle)[0] : '');
        const productLink = `https://${storeData.domain || 'clothsublimacao.com.br'}/produtos/${productHandle}`;
        const mainImage = product.images && product.images.length > 0 ? product.images[0].src : null;

        if (!mainImage) {
            console.warn(`⚠️ Produto ${productId} sem imagem. Ignorando postagem.`);
            return;
        }

        // 2. Verifica se a loja tem as chaves do Instagram configuradas (Meta)
        const metaToken = process.env.META_ACCESS_TOKEN || storeData.meta_token;
        const fbPageId = process.env.FB_PAGE_ID || storeData.fb_page_id;

        if (!metaToken || !fbPageId) {
            console.warn(`⚠️ Meta Access Token ou Page ID não configurados para a loja ${storeId}.`);
            return;
        }

        console.log(`🚀 Iniciando postagem automática para: ${productName}`);

        // 3. Obtém ID da conta do Instagram
        const igAccountId = await igService.getInstagramAccountId(fbPageId, metaToken);
        if (!igAccountId) {
            console.error('❌ Falha ao obter conta do Instagram Vinculada.');
            return;
        }

        // 4. Formata a legenda (Feed) usando template salvo pelo usuário
        const caption = buildFeedCaption(storeData.feed_caption_template, productName, productLink);

        // 5. Postagem no FEED
        console.log('📸 Criando post no Feed...');
        const feedContainerId = await igService.createFeedContainer(igAccountId, mainImage, caption, metaToken);
        await igService.publishMedia(igAccountId, feedContainerId, metaToken);
        console.log('✅ Post no Feed realizado!');

        // 6. Postagem no STORY (apenas a imagem + link do produto)
        console.log('📱 Criando post no Story...');
        const storyContainerId = await igService.createStoryContainer(igAccountId, mainImage, productLink, metaToken);
        await igService.publishMedia(igAccountId, storyContainerId, metaToken);
        console.log('✅ Post no Story realizado!');

    } catch (error) {
        console.error('❌ Erro no processamento do Webhook:', error.message);
    }
});

// Endpoint para frontend descobrir storeId padrão
app.get('/api/me', (req, res) => {
  res.json({
    storeId: DEFAULT_STORE_ID,
    hasToken: !!DEFAULT_ACCESS_TOKEN
  });
});

app.get('/api/debug-env', (req, res) => {
  res.json({
    token_len: DEFAULT_ACCESS_TOKEN ? DEFAULT_ACCESS_TOKEN.length : 0,
    store: DEFAULT_STORE_ID,
    has_tiendanube_token: !!process.env.TIENDANUBE_ACCESS_TOKEN,
    has_nuvemshop_token: !!process.env.NUVEMSHOP_ACCESS_TOKEN,
    env_keys: Object.keys(process.env).filter(k => k.includes('NUVEM') || k.includes('TIENDA'))
  });
});

// Dashboard Stats
app.get('/api/stats', async (req, res) => {
  const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
  const client = await getApiClient(storeId);
  try {
    const [prodRes, ordersRes, storeRes] = await Promise.all([
      client.get('/products', { params: { per_page: 1 } }),
      client.get('/orders', { params: { per_page: 50, status: 'any' } }),
      client.get('/store')
    ]);
    
    const totalSales = ordersRes.data.reduce((acc, order) => acc + parseFloat(order.total || 0), 0);
    const productsCount = prodRes.headers['x-total-count'] || prodRes.data.length;

    res.json({
      storeName: storeRes.data.name.pt || storeRes.data.name,
      productsCount: parseInt(productsCount),
      ordersCount: ordersRes.data.length,
      totalSales: totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      recentOrders: ordersRes.data.slice(0, 5),
      customersCount: 42 // Placeholder se não houver endpoint de clientes fácil
    });
  } catch (error) {
    console.error('Erro ao processar estatísticas:', error.response?.data || error.message);
    res.status(500).json({ error: 'Erro ao conectar com a Nuvemshop. Verifique o Token.' });
  }
});

// Vendas (Orders)
app.get('/api/orders', async (req, res) => {
  const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
  const client = getApiClient(storeId);
  try {
    const response = await client.get('/orders', { params: { per_page: 50, status: 'any' } });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
  const client = getApiClient(storeId);
  try {
    const response = await client.get(`/orders/${req.params.id}`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Produtos (Products) com Paginação e Busca
app.get('/api/products', async (req, res) => {
  const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
  const client = getApiClient(storeId);
  try {
    const { page = 1, per_page = 24, q = '' } = req.query;
    const params = { page, per_page, sort_by: 'created-descending' };
    if (q) params.q = q;

    const response = await client.get('/products', { params });
    
    res.json({
      products: response.data,
      total: parseInt(response.headers['x-total-count'] || 0),
      page: parseInt(page),
      per_page: parseInt(per_page)
    });
  } catch (error) {
    console.error('Erro ao buscar produtos:', error.response?.data || error.message);
    res.status(500).json({ error: 'Falha ao carregar catálogo' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
  const client = getApiClient(storeId);
  try {
    const response = await client.get(`/products/${req.params.id}`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Instalação do Script via API (One-Click)
app.post('/api/store-script', async (req, res) => {
  const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
  const client = await getApiClient(storeId);
  const scriptSrc = `${PUBLIC_URL}/api/script.js`;

  try {
    console.log(`[Script] Tentando instalar na loja ${storeId}: ${scriptSrc}`);
    
    // 1. Tenta deletar scripts antigos para não duplicar
    const existing = await client.get('/scripts');
    const scripts = Array.isArray(existing.data) ? existing.data : [];
    const old = scripts.find(s => s.src && s.src.includes('script.js'));
    if (old) await client.delete(`/scripts/${old.id}`).catch(() => {});

    // 2. Cria o novo script
    const response = await client.post('/scripts', {
      script_id: 5554, // ID do seu script no portal
      src: scriptSrc,
      event: 'onload',
      where: 'store'
    });

    res.json({ success: true, scriptUrl: scriptSrc, data: response.data });
  } catch (error) {
    console.error('[Script] Erro na instalação:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Falha ao injetar script. Verifique se o App tem permissões de escrita (write_scripts).',
      details: error.response?.data
    });
  }
});

// Categorias (Para IA)
app.get('/api/categories', async (req, res) => {
  const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
  const client = await getApiClient(storeId);
  try {
    const response = await client.get('/categories');
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// IA Engine - Geração Massiva
app.post('/api/ai/bulk-process', async (req, res) => {
  const { concepts } = req.body; // Array de strings ou objetos
  
  const processed = concepts.map((concept, index) => ({
    id: Date.now() + index,
    concept,
    name: `${concept} Premium - Edição Limitada`,
    description: `Produto de alta qualidade ${concept}. Ideal para personalização via sublimação. Desenvolvido com materiais duráveis e acabamento impecável.`,
    price: "49.90",
    seo_title: `${concept} | Melhor Qualidade para Sublimação`,
    seo_description: `Compre ${concept} premium na Cloth Sublimação. Preço justo e entrega rápida.`,
    tags: "sublimação, personalizado, premium, cloth",
    category_id: null // Poderia ser sugerido por IA
  }));

  setTimeout(() => res.json(processed), 1500);
});

// Criar produtos em lote (Manual / Replicação)
app.post('/api/products/bulk-create-manual', async (req, res) => {
  try {
    const { items, baseProduct, commonData } = req.body;
    const results = [];
    const errors = [];
    
    // Tratamento estrito do array de itens para a nova estrutura de payload
    const arr = items || [];
    const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
    const client = await getApiClient(storeId);
    
    for (let i = 0; i < arr.length; i++) {
        const item = arr[i];
        const imgStr = item.image;
        let imagePayload = {};
        
        if (imgStr.startsWith('data:image')) {
            const base64Data = imgStr.split(',')[1];
            imagePayload = {
                attachment: base64Data,
                filename: `product-${Date.now()}-${i}.jpg`
            };
        } else {
            imagePayload = { src: imgStr };
        }

        try {
            let productData = {};

            if (baseProduct) {
                // MODO CLONAGEM (Preservar SEO, Categorias, Atributos e Variações)
                const fieldsToCopy = [
                    'description', 'seo_title', 'seo_description', 'brand', 
                    'attributes', 'tags'
                ];
                
                productData = {
                    name: typeof baseProduct.name === 'object' ? { pt: item.name } : item.name,
                    variants: []
                };

                fieldsToCopy.forEach(field => {
                    if (baseProduct[field] !== undefined && baseProduct[field] !== null) {
                        productData[field] = baseProduct[field];
                    }
                });
                
                // Mapeia categorias corretamente (Array de IDs numéricos para Tiendanube POST API)
                if (baseProduct.categories && Array.isArray(baseProduct.categories)) {
                    productData.categories = baseProduct.categories.map(c => c.id || c);
                }

                // Mapeia variações garantindo propriedades dimensionais e nomenclaturas (Ex: {pt: "1,50x2,00"})
                if (baseProduct.variants && baseProduct.variants.length > 0) {
                    productData.variants = baseProduct.variants.map(v => ({
                        price: v.price || "0.00",
                        promotional_price: v.promotional_price,
                        stock: v.stock !== null ? v.stock : 1,
                        weight: v.weight !== null ? v.weight : 0.5,
                        width: v.width,
                        height: v.height,
                        depth: v.depth,
                        cost: v.cost,
                        values: v.values // Copia as propriedades da Variação ("Tamanho", "Gramatura" etc)
                    }));
                }
            } else {
                // MODO MANUAL GENÉRICO (Sem produto base)
                productData = {
                    name: item.name,
                    description: commonData?.description || '',
                    variants: [
                        {
                            price: commonData?.price || "0.00",
                            stock: parseInt(commonData?.stock) || 1,
                            weight: parseFloat(commonData?.weight) || 0.1
                        }
                    ]
                };
            }

            // Etapa 1: Criar o produto base primeiro (sem enviar imagens via base64 aqui para evitar payload issues)
            const response = await client.post('/products', productData);
            const newProduct = response.data;
            
            // Etapa 2: Fazer upload da imagem via endpoint secundário na API (Garante Sucesso)
            await client.post(`/products/${newProduct.id}/images`, imagePayload);
            
            // Etapa 3: Recuperar produto atualizado
            results.push(newProduct);
            
        } catch (err) {
            console.error(`Falha em item "${item.name}":`, err.response?.data || err.message);
            
            // Tratamento de mensagens de erro formatadas da API Tiendanube (geralmente JSON em err.response.data)
            let errorMsg = err.message;
            if (err.response?.data) {
                if (err.response.data.message) errorMsg = err.response.data.message;
                else errorMsg = JSON.stringify(err.response.data);
            }
            
            errors.push(`Erro no item "${item.name}": ${errorMsg}`);
        }
    }

    if (errors.length > 0 && results.length === 0) {
        return res.status(400).json({ success: false, errors });
    }

    res.json({ 
        success: errors.length === 0, 
        count: results.length, 
        products: results,
        errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Erro geral no bulk create:', error.message);
    res.status(500).json({ 
        success: false,
        error: 'Falha fatal ao processar lote',
        details: error.message 
    });
  }
});

// ─── ENDPOINTS CLOUD: SERVINDO E GERENCIANDO O SCRIPT DINÂMICO ───
// Como estamos migrando para Hospedagem Nuvem (Render/Vercel), a nuvemshop
// precisará de uma URL pública para baixar o JS na máquina do visitante!

// Salvar na pasta temporária do SO para escapar do watcher do Vite.
// Evita o recarregamento "fantasma" que estava cancelando a operação de POST na interface.
const SETTINGS_FILE = path.join(os.tmpdir(), 'aiox_script_settings.json');

// Função auxiliar para gerenciar estado
function getScriptSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    }
  } catch(e) {}
  return { enabled: true, whatsapp: '5511999999999' };
}
function saveScriptSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch(e) {
    console.error("Erro ao salvar settings:", e);
  }
}

// 0. ROTA DE TESTE: Para validar a calculadora localmente
app.get('/test', (req, res) => {
  const filePath = path.join(__dirname, 'debug_store.html');
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send("Arquivo debug_store.html não encontrado no root.");
  }
});

// Rota antiga para compatibilidade
app.get('/api/script.js', (req, res) => {
  const localSettings = getScriptSettings();
  const reqEnabled = req.query.enabled;
  const enabled = reqEnabled !== undefined ? (reqEnabled === 'true') : localSettings.enabled;
  const whatsapp = req.query.whatsapp || localSettings.whatsapp || '5511999999999';
  serveScript(res, enabled, whatsapp);
});

// Nova rota para burlar bloqueio da Nuvemshop a Query Strings
app.get('/api/script/v:ver/:enabled/:whatsapp/script.js', (req, res) => {
  const enabled = req.params.enabled === 'true';
  const whatsapp = req.params.whatsapp;
  serveScript(res, enabled, whatsapp);
});

function serveScript(res, enabled, whatsapp) {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const scriptPath = path.join(__dirname, 'src', 'calculadora-frontend.js');
  let jsContent = '';
  try {
    jsContent = fs.readFileSync(scriptPath, 'utf8');
    jsContent = jsContent
      .replace('__ENABLED__', enabled.toString())
      .replace('__WHATSAPP__', whatsapp.toString())
      .replace(/__PUBLIC_URL__/g, process.env.PUBLIC_URL || 'https://ai-manager-nuvemshop.onrender.com');
  } catch (err) {
    console.error("Erro ao ler front script:", err);
    jsContent = "console.error('Calculadora indiponível ou erro ao ler script');";
  }

  res.send(jsContent);
}

// 2. ENDPOINT INTERNO: Para o Painel Salvar as Configurações Cloud
app.get('/api/store-script-settings', (req, res) => {
  res.json(getScriptSettings());
});

app.post('/api/store-script-settings', async (req, res) => {
  const { enabled, whatsapp } = req.body;
  saveScriptSettings({ enabled, whatsapp });

  try {
    const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
    if(!storeId) throw new Error("Sem Store ID local. Logue na Loja via painel Cloud.");
    const client = getApiClient(storeId);
    
    const getRes = await client.get('/scripts');
    const scriptsList = Array.isArray(getRes.data) ? getRes.data : (getRes.data?.result || []);
    const myScripts = scriptsList.filter(s => (s.src || s.current_version?.src || '').includes('ai-manager-nuvemshop.onrender.com'));
    
    for (const s of myScripts) {
       await client.delete('/scripts/' + s.id).catch(()=>{});
    }

    const publicUrl = process.env.PUBLIC_URL || 'https://ai-manager-nuvemshop.onrender.com';
    // URL formatada como path puro para evitar erros 422 por query string
    const scriptSrc = `${publicUrl}/api/script/v${Date.now()}/${enabled}/${whatsapp}/script.js`;
    
    await client.post('/scripts', { src: scriptSrc, event: 'onload', where: 'store' });
  } catch(err) {
    console.warn("[Sync-Cloud] Erro autosync do toggle:", err.message);
  }

  res.json({ success: true });
});

// Debug: Listar scripts da loja
app.get('/api/store-scripts', async (req, res) => {
  const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
  const client = await getApiClient(storeId);
  try {
    const getRes = await client.get('/scripts');
    const scriptsList = Array.isArray(getRes.data) ? getRes.data : (getRes.data?.result || getRes.data);
    res.json({ storeId, scripts: scriptsList });
  } catch (error) {
    console.error('Erro ao listar scripts:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

app.post('/api/store-script', async (req, res) => {
  // ATIVA NA NUVEMSHOP A URL DINÂMICA
  try {
    // Detecta se estamos rodando em ambiente local (localhost ou IP local)
    const isLocal = req.headers.host.includes('localhost') || 
                   req.headers.host.includes('127.0.0.1') || 
                   req.headers.host.includes('::1');
    
    // URL Pública base do Render (sempre injetar a pública na loja, mesmo testando local)
    const publicUrl = process.env.PUBLIC_URL || 'https://ai-manager-nuvemshop.onrender.com';
      
    // Se não for local, podemos tentar usar o host atual (como Render/Vercel)
    const finalUrl = isLocal ? publicUrl : `https://${req.headers.host}`;
    const scriptSrc = `${finalUrl}/api/script.js`;
    
    const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
    const client = await getApiClient(storeId);
    
    console.log(`[Sync] Tentando injetar script: ${scriptSrc} na loja ${storeId}`);

    // 1. Limpa anterior se existir (suporte ao formato antigo e novo da API)
    const getRes = await client.get('/scripts');
    const scriptsList = Array.isArray(getRes.data) ? getRes.data : (getRes.data?.result || []);
    console.log(`[Sync] Scripts existentes na loja: ${scriptsList.length}`);
    
    // Procura por qualquer script que venha do nosso domínio do Render
    const myScript = scriptsList.find(s => {
      const src = s.src || s.current_version?.src || '';
      return src.includes('ai-manager-nuvemshop.onrender.com');
    });
    
    if (myScript) {
       console.log("[Sync] Script antigo encontrado! Tentando deletar. ID:", myScript.id);
       try {
           await client.delete('/scripts/' + myScript.id);
           console.log("[Sync] Deletado com sucesso.");
       } catch (err) {
           console.error("[Sync] Erro ao deletar o script antigo:", err.response?.data || err.message);
       }
    }

    // 2. Cria com formato legado da API v1 (sem wrapper 'script')
    console.log("[Sync] Criando script com src:", scriptSrc);
    try {
        const response = await client.post('/scripts', {
          src: scriptSrc,
          event: 'onload',
          where: 'store'
        });
        console.log("[Sync] Script criado com sucesso:", response.data.id || JSON.stringify(response.data));
        res.json({ success: true, script: response.data, scriptUrl: scriptSrc });
    } catch (err) {
        console.error("[Sync] Erro ao criar o script novo:", err.response?.data || err.message);
        const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
        res.status(422).json({ error: `Nuvemshop rejeitou: ${detail}`, hint: 'Verifique se o app tem permissão write_scripts' });
        return;
    }
  } catch (error) {
    console.error('Erro POST store-script Cloud:', error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

// Remove a versão local antiga de store-script porque vamos gerenciar via nuvem
app.delete('/api/store-script', async (req, res) => {
  const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
  const client = await getApiClient(storeId);
  try {
    const getRes = await client.get('/scripts');
    const scriptsList = Array.isArray(getRes.data) ? getRes.data : [];
    const myScript = scriptsList.find(s => s.name === 'Calculadora_Cloth_Sublimacao');
    if (myScript) {
       await client.delete('/scripts/' + myScript.id);
       res.json({ success: true, message: 'Removido publicamente com sucesso' });
    } else {
       res.json({ success: true, message: 'Já não existia' });
    }
  } catch (error) {
    console.error('Erro DELETE store-script Cloud:', error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Backend AIOX v5.1 Operacional em http://localhost:${PORT}`));

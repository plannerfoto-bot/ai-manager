console.log('🚀 [BOOT] Iniciando backend.js...');
import express from 'express';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import crypto from 'crypto';
import cors from 'cors';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import os from 'os';
import { createClient } from '@supabase/supabase-js';
import igService from './src/instagramService.js';
import { Jimp } from 'jimp';
import multer from 'multer';

const upload = multer({ limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: fs.existsSync('../nuvemshop-mcp/.env') ? '../nuvemshop-mcp/.env' : '.env' });

const app = express();

// ==========================================
// CACHE MIDDLEWARE (SUPABASE)
// ==========================================
function cacheMiddleware(cacheKeyFn, ttlMinutes = 5) {
  return async (req, res, next) => {
    const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
    const forceRefresh = req.query.force_refresh === 'true';
    const cacheKey = typeof cacheKeyFn === 'function' ? cacheKeyFn(req) : cacheKeyFn;
    const fullKey = `${storeId}_${cacheKey}`;

    if (!forceRefresh) {
      try {
        const { data, error } = await supabase
          .from('api_cache')
          .select('*')
          .eq('key', fullKey)
          .single();
        
        if (!error && data) {
          const now = new Date();
          const updatedAt = new Date(data.updated_at);
          const diffMinutes = (now - updatedAt) / 1000 / 60;
          
          if (diffMinutes <= ttlMinutes) {
            console.log(`[CACHE HIT] ${fullKey}`);
            return res.json(data.value);
          }
        }
      } catch (err) {
        console.warn('Cache error (ignoring):', err.message);
      }
    }

    console.log(`[CACHE MISS] ${fullKey} - Fetching fresh data`);
    
    // Intercept res.json
    const originalJson = res.json;
    res.json = function (body) {
      // Only cache 200 OK responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        supabase.from('api_cache').upsert({
          key: fullKey,
          value: body,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' }).then(({error}) => {
          if (error && error.code !== '42P01') console.error('Error saving cache:', error);
        });
      }
      originalJson.call(this, body);
    };

    next();
  };
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Middleware de autenticação JWT com Supabase
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
  }
  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return res.status(401).json({ error: 'Acesso negado. Token inválido ou expirado.' });
  }
  req.user = user;
  next();
};

// Servindo arquivos estáticos do frontend (pasta dist após npm run build)
app.use(express.static(path.join(__dirname, 'dist')));
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

function getSystemSettings() {
  try {
    const data = fs.readFileSync(path.join(__dirname, 'system_settings.json'), 'utf8');
    return JSON.parse(data);
  } catch(e) {
    return {
      finance: { bobina120g: 22.50, bobina160g: 24.70, bobinaEspecial: 24.90, costuraOverloque: 4.00, costuraEmenda: 13.00, costuraEspecial: 6.00 },
      commissions: { valorFixo: 50.00 }
    };
  }
}

app.get('/api/settings', requireAuth, (req, res) => {
  res.json(getSystemSettings());
});

app.post('/api/settings', requireAuth, (req, res) => {
  try {
    fs.writeFileSync(path.join(__dirname, 'system_settings.json'), JSON.stringify(req.body, null, 2));
    exec('git add system_settings.json && git commit -m "chore: update system settings" && git -c http.sslVerify=false push', (err) => {
      if (err) console.error("Git Push Failed:", err);
    });
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * Registra atividade de webhook no Supabase (Persistente)
 */
async function addWebhookLog({ storeId, productId, productName, event, status, details, error, imageUrl }) {
    try {
        const { error: dbError } = await supabase
            .from('automation_history')
            .insert([{
                store_id: String(storeId),
                product_id: String(productId || ''),
                product_name: productName || '',
                image_url: imageUrl || '',
                event: event || 'product/updated',
                status: status || 'Processing',
                details: details || '',
                error: (error && typeof error === 'object') ? JSON.stringify(error) : (error || '')
            }]);

        if (dbError) console.error('❌ Erro ao gravar log no Supabase:', dbError);
    } catch (err) {
        console.error('❌ Erro fatal ao gravar log:', err);
    }
}

/**
 * Aplica marca d'água centralizada e redimensionada uma única vez
 */
async function applyWatermark(mainImage, watermark) {
    try {
        // Redimensionar marca d'água para a largura da imagem base
        watermark.resize(mainImage.bitmap.width, Jimp.AUTO);
        
        // Centralizar verticalmente (e verificar horizontal)
        const x = (mainImage.bitmap.width - watermark.bitmap.width) / 2;
        const y = (mainImage.bitmap.height - watermark.bitmap.height) / 2;

        mainImage.composite(watermark, Math.floor(x), Math.floor(y));

        // Retorna a própria imagem (mutada), compatível com a chamada await
        return mainImage;
    } catch (err) {
        console.error("Erro ao aplicar marca d'água:", err);
        return mainImage;
    }
}

// --- CONFIGURAÇÕES DE APLICATIVO PARCEIRO (OAUTH) ---
const APP_ID = process.env.NUVEMSHOP_APP_ID;
const APP_SECRET = process.env.NUVEMSHOP_APP_SECRET;
const PUBLIC_URL = process.env.PUBLIC_URL || 'https://ai-manager-nuvemshop.onrender.com';

// --- PERSISTÊNCIA DE TOKENS (SUPABASE) ---
const supabaseUrl = process.env.SUPABASE_URL || 'https://jiifmxlnhxodvqgscjro.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppaWZteGxuaHhvZHZxZ3NjanJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDE3MTc5OCwiZXhwIjoyMDk1NzQ3Nzk4fQ.VYXXKFr_r-jYtNor4oMKFqqtOULO37fOce08tGQrB5Y';
const supabase = createClient(supabaseUrl, supabaseKey);

async function getStores() {
  try {
    const { data, error } = await supabase.from('stores').select('*');
    if (error) throw error;
    
    // Se estiver vazio no banco, mas tivermos no ambiente (vazamento ou nova instalação), inserimos automaticamente
    if ((!data || data.length === 0) && DEFAULT_ACCESS_TOKEN && DEFAULT_STORE_ID) {
        console.log('🌱 Seed: Inserindo store padrão no Supabase...');
        await saveStore(DEFAULT_STORE_ID, { access_token: DEFAULT_ACCESS_TOKEN });
        return { [DEFAULT_STORE_ID]: { id: DEFAULT_STORE_ID, access_token: DEFAULT_ACCESS_TOKEN } };
    }

    const stores = {};
    (data || []).forEach(s => {
      stores[s.id] = s;
    });
    return stores;
  } catch (e) {
    console.error('Erro ao buscar stores no Supabase:', e);
    return {};
  }
}

async function saveStore(storeId, data) {
  try {
    const { error } = await supabase.from('stores').upsert({
      id: String(storeId),
      ...data,
      updated_at: new Date().toISOString()
    });
    if (error) throw error;
    console.log(`✅ Store ${storeId} salva no Supabase.`);
  } catch (e) {
    console.error('Erro ao salvar store no Supabase:', e);
  }
}

// Token legado (para compatibilidade enquanto migramos)
const DEFAULT_ACCESS_TOKEN = process.env.TIENDANUBE_ACCESS_TOKEN || process.env.NUVEMSHOP_ACCESS_TOKEN || '454761d47b7ce42c4d539deb3025366ac8dbe358';
const DEFAULT_STORE_ID = process.env.TIENDANUBE_STORE_ID || process.env.NUVEMSHOP_STORE_ID || '2767708';
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

// Funçao central de cálculo de preço
function calcMeasure(w, h, hasAlineTag = false) {
  // Regra Especial: UMA das dimensões entre 1,60m e 1,75m E a outra maior que 1,55m
  // Resultado = Altura x Largura x R$24,90 + R$65,00, apenas tecido 120g (sem emenda)
  const inSpecialRange = (d) => d >= 1.60 && d <= 1.75;
  const isSpecial = (inSpecialRange(w) && h > 1.55) || (inSpecialRange(h) && w > 1.55);
  
  if (isSpecial) {
    let price = (w * h * 24.90) + 65.00;
    if (hasAlineTag) { price += 50.00; }
    return { price120: price, price160: null, measureType: 'special_seamless', isSpecial: true };
  }

  const min = Math.min(w, h);
  const max = Math.max(w, h);

  // Regra A: menor dimensão <= 1,55m
  if (min <= 1.55) {
    let p120 = (max * 22.50) + 3.00 + 45.00;
    let p160 = (max * 26.00) + 3.00 + 45.00;
    if (hasAlineTag) { p120 += 50.00; p160 += 50.00; }
    return {
      price120: p120,
      price160: p160,
      measureType: 'standard', isSpecial: false
    };
  }
  
  // Regra B: ambas as dimensões > 1,56m (e não na faixa especial)
  let p120b = (((max * 2) * 22.50) + 15.00) * 1.80;
  let p160b = (((max * 2) * 26.00) + 15.00) * 1.80;
  if (hasAlineTag) { p120b += 50.00; p160b += 50.00; }
  return {
    price120: p120b,
    price160: p160b,
    measureType: 'double_layer', isSpecial: false
  };
}

// --- SIMULAR PREÇO (Frontend Instantâneo) ---
app.post('/api/simulate-price', async (req, res) => {
  try {
    const { width, height, productId } = req.body;
    const w = parseFloat(String(width).replace(',', '.'));
    const h = parseFloat(String(height).replace(',', '.'));
    if (!w || !h || w <= 0 || h <= 0) return res.status(400).json({ error: 'Medidas inválidas. Recebido: ' + width + 'x' + height });
    
    const min = Math.min(w, h);
    if (min > 3) return res.status(400).json({ error: 'Menor dimensão não pode ultrapassar 3,00m' });
    
    let hasAlineTag = false;
    if (productId) {
      try {
        const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
        const client = await getApiClient(storeId);
        const prodRes = await client.get(`/products/${productId}`);
        const tags = prodRes.data.tags || '';
        if (tags.toLowerCase().includes('aline-martins')) hasAlineTag = true;
      } catch (err) {
        console.warn('[Simulate] Erro ao buscar tags do produto:', err.message);
      }
    }
    
    const result = calcMeasure(w, h, hasAlineTag);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
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
    const { productId, width, height, gramatura, layout } = req.body;
    const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
    if (!storeId || !productId) return res.status(400).json({ error: 'Loja ou Produto nao identificado.' });
    
    const client = await getApiClient(storeId);
    
    const w = parseFloat(String(width).replace(',', '.'));
    const h = parseFloat(String(height).replace(',', '.'));
    if (!w || !h || w <= 0 || h <= 0) return res.status(400).json({ error: 'Medidas invalidas. Recebido: ' + width + 'x' + height });
    
    const min = Math.min(w, h);
    if (min > 3) return res.status(400).json({ error: 'Menor dimensao nao pode ultrapassar 3,00m' });
    
    // Busca o produto ANTES do calculo para ler as tags
    const prodRes = await client.get(`/products/${productId}`);
    const product = prodRes.data;
    const tags = product.tags || '';
    const hasAlineTag = tags.toLowerCase().includes('aline-martins');

    // Usa a funcao central de calculo
    const calcResult = calcMeasure(w, h, hasAlineTag);
    if (calcResult.error) {
      return res.status(400).json({ error: calcResult.error });
    }
    const { measureType } = calcResult;
    const price120 = calcResult.price120;
    const price160 = calcResult.price160; // null quando medicao especial sem emenda
    
    // Se o cliente pediu 160g mas a medida e especial (sem emenda, somente 120g), recusa
    if (gramatura === '160g' && measureType === 'special_seamless') {
      return res.status(400).json({ error: 'Esta medida e disponivel apenas em TECIDO 120g (sem emenda).' });
    }
    
    // Garantia de segurança contra gramaturas inválidas ou nulas
    const selectedGram = (gramatura || '').toLowerCase();
    const targetPrice = selectedGram.includes('160') ? price160 : price120;
    
    if (targetPrice === null || targetPrice === undefined) {
      return res.status(400).json({ 
        error: `A gramatura '${gramatura || 'não especificada'}' não está disponível para este produto. Por favor, escolha uma opção de tecido válida.` 
      });
    }
    
    const priceStr = targetPrice.toFixed(2);
    const measureStr = `${w.toFixed(2).replace('.', ',')}m x ${h.toFixed(2).replace('.', ',')}m`;
    
    // Sanitização e definição do Layout do Cenário
    const layoutLabel = layout || 'Só Parede';
    
    // Timestamp atual para identificar variantes criadas pelo sistema (para limpeza 24h)
    const nowTs = Date.now();
    const createdMark = 'calc:' + nowTs; // fica no campo SKU da variante
    
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
    let hasLayoutAttr = attributes.some(attr => {
      const name = (attr.pt || '').toLowerCase();
      return name.includes('layout') || name.includes('cenario') || name.includes('cenário') || name.includes('formato');
    });

    if (attributes.length === 0) {
      attributes = [{ pt: 'Tamanho' }, { pt: 'Gramatura' }, { pt: 'Layout do Cenário' }];
      await client.put(`/products/${productId}`, { attributes });
    } else if (!hasLayoutAttr) {
      attributes.push({ pt: 'Layout do Cenário' });
      await client.put(`/products/${productId}`, { attributes });
    }
    
    const baseVariant = (product.variants || [])[0] || null;
    const buildValues = (measure, gram, layoutVal) => attributes.map((attr, idx) => {
      const attrName = (attr.pt || attr.es || attr.en || '').toLowerCase();
      if (attrName.includes('gramatura') || attrName.includes('tecido') || attrName.includes('material')) return { pt: gram };
      if (attrName.includes('tamanho') || attrName.includes('medida') || attrName.includes('dimens')) return { pt: measure };
      if (attrName.includes('layout') || attrName.includes('cenario') || attrName.includes('cenário') || attrName.includes('formato')) return { pt: layoutVal };
      if (idx === 0) return { pt: measure };
      if (idx === 1) return { pt: gram };
      if (idx === 2) return { pt: layoutVal };
      return (baseVariant && baseVariant.values && baseVariant.values[idx]) ? baseVariant.values[idx] : { pt: '-' };
    });

    const norm = (s) => (s || '').trim().toLowerCase();
    const findOrCreate = async (measure, gramLabel, layoutVal, price) => {
      const targetValues = buildValues(measure, gramLabel, layoutVal);
      const existing = product.variants.find(v => {
        if (!v.values) return false;
        return targetValues.every((tv, i) => v.values[i] && norm(v.values[i].pt) === norm(tv.pt));
      });
      if (existing) {
        console.log('[Variante] Ja existe: ' + measure + ' / ' + gramLabel + ' / ' + layoutVal + ' id=' + existing.id);
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
        price: price ? price.toFixed(2) : '0.00',
        stock: 999,
        weight: baseVariant ? baseVariant.weight : 0.5,
        values: targetValues,
        sku: createdMark  // ex: "calc:1711405200000" - identificador de limpeza
      };
      console.log('[Variante] Criando: ' + measure + ' / ' + gramLabel + ' / ' + layoutVal + ' = R$' + (price ? price.toFixed(2) : '0.00') + ' | SKU: ' + createdMark);
      const createRes = await client.post(`/products/${productId}/variants`, payload);
      product.variants.push(createRes.data);
      return createRes.data.id;
    };

    // Para medidas especiais (sem emenda), cria APENAS a variante 120g
    // Para medidas normais, cria os DOIS pares de gramatura
    let chosenId;
    if (measureType === 'special_seamless') {
      chosenId = await findOrCreate(measureStr, gram120label, layoutLabel, price120);
    } else {
      const variant120Id = await findOrCreate(measureStr, gram120label, layoutLabel, price120);
      const variant160Id = await findOrCreate(measureStr, gram160label, layoutLabel, price160);
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
app.post('/api/marketing/settings', requireAuth, async (req, res) => {
    const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
    // Aceita os dois formatos de nome para máxima compatibilidade
    const meta_token = req.body.meta_token || req.body.metaToken || null;
    const fb_page_id = req.body.fb_page_id || req.body.pageId || null;
    const feed_caption_template = req.body.feed_caption_template || req.body.captionTemplate || null;

    console.log(`[Marketing POST] storeId=${storeId} meta_token=${meta_token ? 'OK' : 'VAZIO'} fb_page_id=${fb_page_id || 'VAZIO'}`);

    try {
        const { error } = await supabase
            .from('marketing_settings')
            .upsert({
                store_id: String(storeId),
                meta_access_token: meta_token,
                facebook_page_id: fb_page_id,
                feed_caption_template: feed_caption_template,
                updated_at: new Date().toISOString()
            }, { onConflict: 'store_id' });

        if (error) throw error;
        res.json({ success: true, message: 'Configurações salvas com sucesso!' });
    } catch (error) {
        console.error('[Marketing POST] Erro:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * BUSCAR CONFIGURAÇÕES DE MARKETING
 */
app.get('/api/marketing/settings', requireAuth, async (req, res) => {
    const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
    
    try {
        const { data, error } = await supabase
            .from('marketing_settings')
            .select('*')
            .eq('store_id', String(storeId))
            .maybeSingle();

        if (error) throw error;

        // Retorna com os nomes que o React espera (snake_case)
        res.json({
            meta_token: data?.meta_access_token || '',
            fb_page_id: data?.facebook_page_id || '',
            feed_caption_template: data?.feed_caption_template || ''
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * DIAGNÓSTICO DAS CREDENCIAIS DO META/INSTAGRAM
 * Testa o token e page_id antes de tentar postar, retorna erros detalhados
 */
app.get('/api/marketing/validate', requireAuth, async (req, res) => {
    const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
    console.log(`[Marketing Validate] Iniciando diagnóstico para loja ${storeId}`);
    try {
        const { data: ms, error: dbError } = await supabase
            .from('marketing_settings')
            .select('*')
            .eq('store_id', String(storeId))
            .maybeSingle();

        if (dbError) {
            console.error('[Marketing Validate] Erro Supabase:', dbError);
            throw dbError;
        }

        const metaToken = ms?.meta_access_token;
        const fbPageId  = ms?.facebook_page_id;

        if (!metaToken || !fbPageId) {
            console.warn('[Marketing Validate] Credenciais ausentes no banco.');
            return res.json({ valid: false, error: 'Token ou ID da Página não configurados. Preencha o painel Marketing e salve.' });
        }

        const result = await igService.validateCredentials(fbPageId, metaToken);
        if (result.valid) {
            console.log(`✅ [Marketing Validate] Conexão bem-sucedida: ${result.pageName}`);
            return res.json({ 
                valid: true, 
                message: `✅ Credenciais OK! Página: ${result.pageName}, IG ID: ${result.igAccountId}` 
            });
        } else {
            console.error(`❌ [Marketing Validate] Falha na validação do Instagram:`, result.error);
            return res.json({ valid: false, error: result.error });
        }
    } catch (error) {
        console.error(`🔥 [Marketing Validate] Erro Crítico:`, error.message);
        return res.status(500).json({ valid: false, error: 'Erro interno ao validar: ' + error.message });
    }
});

/**
 * HELPER: Monta a legenda do Feed substituindo variáveis
 * Variáveis suportadas: {{product_name}}, {{product_link}}
 */
function buildFeedCaption(template, productName, productLink, productPrice) {
    const defaultTemplate = `✨ NOVIDADE NA CLOTH! ✨\n\n{{product_name}}\n\nGaranta o seu agora mesmo no nosso site! 🚀\n\n🔗 {{product_link}}\n\n#fundofotograficocloth #novidade #sublimacao #personalizados`;
    const tpl = (template && template.trim()) ? template : defaultTemplate;
    return tpl
        .replace(/{{product_name}}/g, productName)
        .replace(/{{product_link}}/g, productLink)
        .replace(/{{product_price}}/g, productPrice || '');
}


/**
 * Redimensiona a imagem para 1080x1920 (Instagram Stories) adicionando padding.
 * @param {string} imageUrl URL da imagem original
 * @returns {Promise<string>} URL da imagem processada
 */
async function prepareStoryImage(imageUrl) {
    try {
        console.log('🖼️ Processando imagem para Stories:', imageUrl.substring(0, 50));
        const image = await Jimp.read(imageUrl);
        const targetWidth = 1080;
        const targetHeight = 1920;

        // Cria um canvas preto com o tamanho do Story
        const canvas = new Jimp(targetWidth, targetHeight, 0x000000ff);

        // Redimensiona a imagem original para caber no canvas mantendo o aspect ratio
        image.contain(targetWidth, targetHeight);

        // Combina a imagem no canvas (centralizada)
        canvas.composite(image, 0, 0);

        // Salva temporariamente na pasta public
        const filename = `story_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        const tempPath = path.join(__dirname, 'public', 'temp', filename);
        
        // Garante que a pasta existe
        if (!fs.existsSync(path.join(__dirname, 'public', 'temp'))) {
            fs.mkdirSync(path.join(__dirname, 'public', 'temp'), { recursive: true });
        }

        await canvas.quality(90).writeAsync(tempPath);
        console.log('✅ Imagem de Story gerada:', filename);

        return `${PUBLIC_URL}/temp/${filename}`;
    } catch (error) {
        console.error('❌ Erro ao processar imagem para Story:', error.message);
        return imageUrl; // Fallback para a original se falhar
    }
}

/**
 * Publica um produto recém-criado no Instagram (Feed e Story)
 * @param {object} product Dados do produto da Nuvemshop
 * @param {object} settings Configurações de marketing
 * @param {string} storeId ID da loja
 * @returns {Promise<object>} Detalhes da publicação
 */
async function publishProductToInstagram(product, settings, storeId) {
    const metaToken = settings?.meta_access_token;
    const fbPageId = settings?.facebook_page_id;

    if (!metaToken || !fbPageId) {
        throw new Error('Meta Access Token ou Page ID não configurados nas configurações de marketing.');
    }

    const stores = await getStores();
    const storeData = stores[storeId] || {};

    const productName = (product.name && product.name.pt) ? product.name.pt : (product.name ? Object.values(product.name)[0] : 'Produto');
    const productHandle = (product.handle && product.handle.pt) ? product.handle.pt : (product.handle ? Object.values(product.handle)[0] : '');
    const productLink = `https://${storeData.domain || 'www.fundofotograficocloth.com.br'}/produtos/${productHandle}`;
    const productPrice = product.variants && product.variants.length > 0 ? `R$ ${product.variants[0].price}` : '';
    const mainImage = product.images && product.images.length > 0 ? product.images[0].src : null;

    if (!mainImage) {
        throw new Error('Este produto não possui imagem cadastrada.');
    }

    const igAccountId = await igService.getInstagramAccountId(fbPageId, metaToken);
    if (!igAccountId) {
        throw new Error('Não foi possível encontrar a conta do Instagram vinculada à Página do Facebook.');
    }

    const feedCaption = buildFeedCaption(settings?.feed_caption_template, productName, productLink, productPrice);
    
    // 1. Publica no Feed
    console.log(`🚀 [Auto-Publish] Publicando Feed para o produto ${product.id}`);
    const feedContainerId = await igService.createFeedContainer(igAccountId, mainImage, feedCaption, metaToken);
    const feedPostId = await igService.publishMedia(igAccountId, feedContainerId, metaToken);
    console.log(`✅ [Auto-Publish] Feed postado: ${feedPostId}`);

    // 2. Publica no Story
    try {
        console.log(`🚀 [Auto-Publish] Publicando Story para o produto ${product.id}`);
        const storyImage = await prepareStoryImage(mainImage);
        const storyContainerId = await igService.createStoryContainer(igAccountId, storyImage, productLink, metaToken);
        const storyPostId = await igService.publishMedia(igAccountId, storyContainerId, metaToken);
        console.log(`✅ [Auto-Publish] Story postado: ${storyPostId}`);
    } catch (storyErr) {
        console.error('⚠️ [Auto-Publish] Falha ao publicar Story automático:', storyErr.message);
    }

    return { id: feedPostId };
}

/**
 * POSTAGEM MANUAL NO INSTAGRAM
 * Recebe productId (ou imageUrl+caption diretamente) e posta no Feed e/ou Story
 */
app.post('/api/instagram/publish', requireAuth, async (req, res) => {
    const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
    const { productId, customCaption, postFeed = true, postStory = true } = req.body;

    try {
        const { data: settings } = await supabase
            .from('marketing_settings')
            .select('*')
            .eq('store_id', String(storeId))
            .maybeSingle();

        const metaToken = settings?.meta_access_token;
        const fbPageId = settings?.facebook_page_id;

        if (!metaToken || !fbPageId) {
            return res.status(400).json({ error: 'Meta Access Token ou Page ID não configurados. Vá em Marketing > Configurações.' });
        }

        const stores = await getStores();
        const storeData = stores[storeId] || {};

        // Busca dados do produto para obter imagem e link
        const client = await getApiClient(storeId);
        const productRes = await client.get(`/products/${productId}`);
        const product = productRes.data;

        const productName = (product.name && product.name.pt) ? product.name.pt : (product.name ? Object.values(product.name)[0] : 'Produto');
        const productHandle = (product.handle && product.handle.pt) ? product.handle.pt : (product.handle ? Object.values(product.handle)[0] : '');
        const productLink = `https://${storeData.domain || 'www.fundofotograficocloth.com.br'}/produtos/${productHandle}`;
        const productPrice = product.variants && product.variants.length > 0 ? `R$ ${product.variants[0].price}` : '';
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
                : buildFeedCaption(settings?.feed_caption_template, productName, productLink, productPrice);


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
            const storyImage = await prepareStoryImage(mainImage);
            const storyContainerId = await igService.createStoryContainer(igAccountId, storyImage, productLink, metaToken);
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
        // Fallback: Se não houver lojas em stores.json, tenta usar o DEFAULT configurado no ambiente
        let storeId = Object.keys(stores)[0] || DEFAULT_STORE_ID;
        let storeData = stores[storeId] || { access_token: DEFAULT_ACCESS_TOKEN };

        if (!storeId || !storeData.access_token || storeData.access_token.includes('YOUR_NUVEMSHOP_ACCESS_TOKEN') || storeData.access_token === '4') {
            return res.status(400).json({ 
                error: 'Token Nuvemshop Ausente', 
                message: 'O token de acesso da Nuvemshop não foi encontrado no banco de dados ou é inválido. Certifique-se de que a variável NUVEMSHOP_ACCESS_TOKEN está configurada no Render ou tente salvar as configurações de marketing novamente.' 
            });
        }

        console.log(`[Webhook Register] Tentando registrar para loja ${storeId}...`);

        // URL pública do AI Manager (Render)
        const webhookUrl = `${PUBLIC_URL}/api/webhooks/nuvemshop`;
        console.log(`[Webhook] Verificando existência na URL: ${webhookUrl}`);

        // Consulta webhooks existentes
        const listRes = await axios.get(
            `https://api.tiendanube.com/v1/${storeId}/webhooks`,
            { headers: { 'Authentication': `bearer ${storeData.access_token}`, 'User-Agent': 'AIManager/1.0' } }
        );
        const existingWebhooks = listRes.data || [];
        
        // Limpa webhooks que apontam para nossa rota para forçar re-registro limpo
        for (const wh of existingWebhooks) {
            if (wh.url.includes('/api/webhooks/') || wh.url === webhookUrl) {
                console.log(`[Webhook] Removendo antigo: ${wh.id} (${wh.event})`);
                await axios.delete(`https://api.tiendanube.com/v1/${storeId}/webhooks/${wh.id}`, {
                    headers: { 'Authentication': `bearer ${storeData.access_token}`, 'User-Agent': 'AIManager/1.0' }
                });
            }
        }

        // Registra TODOS os eventos necessários
        const events = ['product/created', 'product/updated', 'order/created', 'order/updated', 'order/paid'];
        const results = [];

        for (const event of events) {
            console.log(`[Webhook] Registrando novo evento: ${event}`);
            const res = await axios.post(
                `https://api.tiendanube.com/v1/${storeId}/webhooks`,
                { event, url: webhookUrl },
                { headers: { 'Authentication': `bearer ${storeData.access_token}`, 'User-Agent': 'AIManager/1.0', 'Content-Type': 'application/json' } }
            );
            results.push(res.data);
        }

        res.json({ success: true, message: 'Automação sincronizada com sucesso!', webhooks: results });

    } catch (error) {
        const detail = error.response?.data || error.message;
        console.error('❌ Erro detalhado ao registrar webhook:', JSON.stringify(detail));
        res.status(500).json({ 
            error: 'Erro no registro', 
            message: detail.error_description || detail.message || 'Verifique se o Access Token da Nuvemshop é válido.',
            details: detail 
        });
    }
});

/**
 * LISTAR WEBHOOKS: Retorna os webhooks registrados
 */
app.get('/api/webhooks/list', async (req, res) => {
    try {
        const stores = await getStores();
        const storeId = Object.keys(stores)[0] || DEFAULT_STORE_ID;
        const storeData = stores[storeId] || { access_token: DEFAULT_ACCESS_TOKEN };

        if (!storeId || !storeData.access_token) {
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
 * LISTAR LOGS: Retorna o histórico de automação do Supabase
 */
app.get('/api/webhooks/logs', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('automation_history')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
            
        if (error) throw error;

        // Mapeia para o formato que o frontend espera (ts, productName)
        const mapped = (data || []).map(log => ({
            ...log,
            ts: log.created_at,
            productName: log.product_name,
            productId: log.product_id
        }));

        res.json(mapped);
    } catch (error) {
        console.error('Erro ao buscar logs:', error.message);
        res.status(500).json({ error: 'Erro ao carregar histórico.' });
    }
});

/**
 * WEBHOOK: Novo Produto Criado
 * Aciona a postagem automática no Instagram
 */

/**
 * WEBHOOK GERAL NUVEMSHOP
 * Recebe eventos de produtos e pedidos e atualiza o banco de dados em tempo real.
 */
app.post('/api/webhooks/nuvemshop', async (req, res) => {
    // Responder OK imediatamente para não travar a Nuvemshop
    res.status(200).send('OK');

    const storeId = req.headers['x-linked-store-id'] || req.body.store_id || DEFAULT_STORE_ID;
    const event = req.body.event;
    const id = String(req.body.id);

    console.log(`
🔔 [Webhook] Recebido evento "${event}" (ID: ${id}) para a loja ${storeId}`);

    try {
        const client = await getApiClient(storeId);

        if (event.startsWith('product/')) {
            // Buscar produto na Nuvemshop
            const response = await client.get(`/products/${id}`);
            const product = response.data;
            const name = typeof product.name === 'object' ? (product.name.pt || product.name.es || product.name.en || '') : String(product.name || '');
            
            await supabase.from('nuvemshop_products').upsert({
                id: String(product.id),
                store_id: String(storeId),
                name: name,
                sku: product.variants?.[0]?.sku || null,
                price: parseFloat(product.variants?.[0]?.price || 0),
                tags: product.tags || null,
                created_at: product.created_at,
                updated_at: product.updated_at,
                raw_data: product
            }, { onConflict: 'id' });

            console.log(`  ✅ Produto ${id} atualizado no Supabase via Webhook.`);
            
            // Logar no histórico se for criação para manter compatibilidade com Instagram
            if (event === 'product/created') {
                await addWebhookLog({ storeId, event, productId: id, status: 'Processing', details: 'Novo produto criado. Iniciando publicação automatizada...' });
                // Dispara fluxo do instagram
                try {
                    const settings = await getMarketingSettings(storeId);
                    if (settings && settings.instagram_enabled) {
                        const publishRes = await publishProductToInstagram(product, settings, storeId);
                        await updateWebhookLog(id, 'Success', `Publicado no Instagram: ${publishRes.id || 'OK'}`);
                    } else {
                        await updateWebhookLog(id, 'Success', 'Automação desativada nas configurações.');
                    }
                } catch (err) {
                    await updateWebhookLog(id, 'Error', err.message);
                }
            }

        } else if (event.startsWith('order/')) {
            // Buscar pedido na Nuvemshop
            const response = await client.get(`/orders/${id}`);
            const order = response.data;

            await supabase.from('nuvemshop_orders').upsert({
                id: String(order.id),
                store_id: String(storeId),
                number: String(order.number),
                status: String(order.status),
                payment_status: String(order.payment_status),
                total: parseFloat(order.total || 0),
                shipping_cost_customer: parseFloat(order.shipping_cost_customer || 0),
                shipping_cost_owner: parseFloat(order.shipping_cost_owner || 0),
                shipping_carrier: order.shipping_carrier || null,
                customer: {
                    name: order.customer?.name || null,
                    phone: order.customer?.phone || null,
                    email: order.customer?.email || null
                },
                products: order.products || [],
                created_at: order.created_at,
                updated_at: order.updated_at,
                raw_data: order
            }, { onConflict: 'id' });

            console.log(`  ✅ Pedido ${id} (${order.number}) atualizado no Supabase via Webhook.`);
            
            // Se o pedido foi pago, invalidar cache de comissões e financeiro
            if (order.payment_status === 'paid') {
                await supabase.from('api_cache').delete().eq('key', `${storeId}_commissions_report`);
                await supabase.from('api_cache').delete().eq('key', `${storeId}_profit_stats`);
                await supabase.from('api_cache').delete().eq('key', `${storeId}_stats`);
            }
        }
    } catch (err) {
        console.error(`❌ [Webhook Error] Erro ao processar evento ${event} (ID: ${id}):`, err.response?.data || err.message);
    }
});

app.post('/api/webhooks/product-created', async (req, res) => {
    // Debug profundo: Logar exatamente o que chega
    console.log('--- WEBHOOK RAW BODY ---');
    console.log(JSON.stringify(req.body, null, 2));
    console.log('--- WEBHOOK HEADERS ---');
    console.log(JSON.stringify(req.headers, null, 2));

    const storeId = req.headers['x-linked-store-id'] || req.body.store_id || DEFAULT_STORE_ID;
    const event = req.body.event;
    const productId = req.body.id;

    console.log(`\n📦 Webhook recebido: ${event} para loja ${storeId} (Produto: ${productId})`);

    // Responde 200 imediatamente para a Nuvemshop não reenviar
    res.status(200).send('OK');

    // Registra o início do recebimento (No Supabase)
    await addWebhookLog({ storeId, event, productId, status: 'Processing', details: `Evento ${event} recebido. Iniciando...` });

    // Aceita tanto criação quanto atualização
    const allowedEvents = ['product/created', 'product/updated'];
    if (!allowedEvents.includes(event)) {
        return res.status(200).send('Ignored event');
    }

    try {
        // Busca metadata do produto na Nuvemshop
        let productName = 'Novo Produto';
        let currentImageUrl = '';
        try {
            const client = await getApiClient(storeId);
            const productRes = await client.get(`/products/${productId}`);
            const product = productRes.data;
            productName = (product.name && product.name.pt) ? product.name.pt : (product.name ? Object.values(product.name)[0] : 'Novo Produto');
            currentImageUrl = product.images && product.images.length > 0 ? product.images[0].src : '';
            console.log(`[Webhook] Metadata obtida para ${productId}: ${productName}`);
        } catch (fetchErr) {
            console.warn(`[Webhook] Não foi possível buscar metadata para ${productId}.`);
        }

        // Verifica registro existente na fila que não seja sucesso
        const { data: existingInQueue } = await supabase
            .from('post_queue')
            .select('*')
            .eq('product_id', String(productId))
            .neq('status', 'success')
            .maybeSingle();

        if (event === 'product/created') {
            // DETECÇÃO DE DUPLICAÇÃO: Aguarda imagem se for novo
            console.log(`📦 [Waiting] Produto ${productId} criado/duplicado. Em espera de nova imagem.`);
            await supabase.from('post_queue').upsert({
                store_id: storeId,
                product_id: String(productId),
                product_name: productName,
                image_url: currentImageUrl,
                initial_image_url: currentImageUrl,
                event_type: 'created',
                status: 'waiting_image',
                scheduled_for: new Date(Date.now() + 5 * 60 * 1000).toISOString()
            }, { onConflict: 'product_id' });

            await addWebhookLog({ 
                storeId, productId, productName, imageUrl: currentImageUrl,
                status: 'Processing', 
                details: 'Produto detectado. Aguardando inserção de imagem personalizada para agendar.' 
            });
        } 
        else if (event === 'product/updated') {
            if (existingInQueue && existingInQueue.status === 'waiting_image') {
                // Compara se a imagem MUDOU em relação à original (do produto "pai")
                const hasImageChanged = currentImageUrl !== existingInQueue.initial_image_url;
                
                if (hasImageChanged && currentImageUrl !== '') {
                    console.log(`✨ [Ready] Imagem alterada detectada para ${productId}! Agendando.`);
                    const scheduledDate = new Date(Date.now() + 2 * 60 * 1000); // 2 min drip
                    
                    await supabase.from('post_queue').update({ 
                        status: 'pending', 
                        scheduled_for: scheduledDate.toISOString(),
                        image_url: currentImageUrl,
                        product_name: productName
                    }).eq('id', existingInQueue.id);

                    await addWebhookLog({ 
                        storeId, productId, productName, imageUrl: currentImageUrl,
                        status: 'Processing', 
                        details: 'Nova foto detectada! Postagem agendada automaticamente.' 
                    });
                }
            } else if (!existingInQueue) {
                // Update direto: Agenda se tiver imagem
                console.log(`⚡ [Direct] Update direto para ${productId}. Agendando.`);
                await supabase.from('post_queue').upsert({
                    store_id: storeId,
                    product_id: String(productId),
                    product_name: productName,
                    image_url: currentImageUrl,
                    status: 'pending',
                    scheduled_for: new Date(Date.now() + 2 * 60 * 1000).toISOString()
                }, { onConflict: 'product_id' });
            }
        }
        res.sendStatus(200);
    } catch (err) {
        console.error("❌ Erro no fluxo do Webhook:", err);
        res.status(500).send(err.message);
    }
});

// --- WORKER DE PROCESSAMENTO DA FILA (DRIP FEED) ---
app.all('/api/cron/process-queue', async (req, res) => {
    const cronKey = req.query.key || req.headers['x-cron-key'];
    const expectedKey = process.env.CRON_SECRET || 'ClothSecret2026';

    if (cronKey !== expectedKey) return res.status(401).json({ error: 'Unauthorized' });

    console.log('\n⚙️ Cron: Iniciando processamento múltiplo da fila...');
    
    try {
        // Busca até 3 jobs pendentes de uma vez para agilizar o processamento
        const { data: pendingJobs, error: selectError } = await supabase
            .from('post_queue')
            .select('*')
            .eq('status', 'pending')
            .lte('scheduled_for', new Date().toISOString())
            .order('scheduled_for', { ascending: true })
            .limit(3);

        if (selectError) throw selectError;
        if (!pendingJobs || pendingJobs.length === 0) return res.json({ message: 'No pending jobs' });

        const results = [];

        // Processa em sequência curta para evitar concorrência no banco mas agilizar volume
        for (const job of pendingJobs) {
            const jobId = job.id;
            const productId = job.product_id;
            const storeId = job.store_id;

            // Reserva o job
            const { data: grabbedJob } = await supabase
                .from('post_queue')
                .update({ status: 'processing' })
                .eq('id', jobId)
                .eq('status', 'pending')
                .select()
                .maybeSingle();

            if (!grabbedJob) continue;

            console.log(`🚀 Cron: Processando Job ${jobId} (Produto ${productId})`);

            try {
                const stores = await getStores();
                const storeData = stores[storeId];
                const { data: marketingSettings } = await supabase.from('marketing_settings').select('*').eq('store_id', String(storeId)).maybeSingle();

                const nsToken = storeData?.access_token || DEFAULT_ACCESS_TOKEN;
                const metaToken = marketingSettings?.meta_access_token || storeData?.meta_token || process.env.META_ACCESS_TOKEN;
                const fbPageId = marketingSettings?.facebook_page_id || storeData?.fb_page_id || process.env.FB_PAGE_ID;

                // Download da imagem e metadados finais
                const client = await getApiClient(storeId);
                const productRes = await client.get(`/products/${productId}`);
                const product = productRes.data;
                const productName = (product.name && product.name.pt) ? product.name.pt : (product.name ? Object.values(product.name)[0] : 'Produto');
                const productHandle = (product.handle && product.handle.pt) ? product.handle.pt : (product.handle ? Object.values(product.handle)[0] : '');
                const productLink = `https://${storeData.domain || 'www.fundofotograficocloth.com.br'}/produtos/${productHandle}`;

                const mainImage = product.images && product.images.length > 0 ? product.images[0].src : job.image_url;

                const igAccountId = await igService.getInstagramAccountId(fbPageId, metaToken);
                const caption = buildFeedCaption(marketingSettings?.feed_caption_template, productName, productLink, productPrice);


                // Meta API Calls
                const feedContainerId = await igService.createFeedContainer(igAccountId, mainImage, caption, metaToken);
                await igService.publishMedia(igAccountId, feedContainerId, metaToken);
                
                await new Promise(r => setTimeout(r, 5000)); // Delay curto entre postagens

                const storyImage = await prepareStoryImage(mainImage);
                const storyContainerId = await igService.createStoryContainer(igAccountId, storyImage, productLink, metaToken);
                await igService.publishMedia(igAccountId, storyContainerId, metaToken);


                // Sucesso
                await supabase.from('post_queue').update({ status: 'success' }).eq('id', jobId);
                await addWebhookLog({ storeId, productId, productName, status: 'Success', details: 'Postado com sucesso via Cron!' });
                
                results.push({ jobId, status: 'success' });
            } catch (jobErr) {
                const jobMsg = jobErr.message || 'Erro no job';
                console.error(`❌ Cron: Erro no job ${jobId}:`, jobMsg);
                await supabase.from('post_queue').update({ status: 'failed', error_log: { error: jobMsg, timestamp: new Date().toISOString() } }).eq('id', jobId);
                results.push({ jobId, status: 'failed', error: jobMsg });
            }
        }

        res.json({ processed: results.length, details: results });
    } catch (err) {
        console.error('❌ Cron Critical Error:', err);
        res.status(500).json({ error: err.message });
    }
});


// Remover item individual da fila
app.delete('/api/marketing/queue/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('post_queue')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true, message: 'Item removido da fila' });
    } catch (error) {
        console.error('Erro ao remover item da fila:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para frontend ver a fila de postagem
app.get('/api/marketing/queue', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('post_queue')
            .select('*')
            .order('scheduled_for', { ascending: true })
            .limit(20);

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para frontend descobrir storeId padrão
app.get('/api/me', requireAuth, (req, res) => {
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
app.get('/api/stats', requireAuth, cacheMiddleware('stats', 5), async (req, res) => {
  const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
  const client = await getApiClient(storeId);
  try {
    const [prodRes, ordersRes, storeRes, automationsCountRes, queueCountRes, automationLogsRes] = await Promise.all([
      client.get('/products', { params: { per_page: 1 } }),
      client.get('/orders', { params: { per_page: 50, payment_status: 'paid' } }),
      client.get('/store'),
      supabase.from('automation_history').select('*', { count: 'exact', head: true }).eq('store_id', storeId),
      supabase.from('post_queue').select('*', { count: 'exact', head: true }).eq('store_id', storeId).eq('status', 'pending'),
      supabase.from('automation_history').select('*').eq('store_id', storeId).order('created_at', { ascending: false }).limit(5)
    ]);
    
    const totalSales = ordersRes.data.reduce((acc, order) => {
      const total = parseFloat(order.total || 0);
      const shipping = parseFloat(order.shipping_cost_customer || 0);
      return acc + (total - shipping);
    }, 0);
    const productsCount = prodRes.headers['x-total-count'] || prodRes.data.length;

    res.json({
      storeName: storeRes.data.name.pt || storeRes.data.name,
      productsCount: parseInt(productsCount),
      ordersCount: ordersRes.data.length,
      totalSales: totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      recentOrders: ordersRes.data.slice(0, 5),
      automationLogs: (automationLogsRes.data || []).map(log => ({
        ...log,
        ts: log.created_at,
        productName: log.product_name || `ID: ${log.product_id}`
      })),
      automationsCount: automationsCountRes.count || 0,
      queueCount: queueCountRes.count || 0,
      customersCount: 42
    });
  } catch (error) {
    console.error('Erro ao processar estatísticas:', error.response?.data || error.message);
    res.status(500).json({ error: 'Erro ao conectar com a Nuvemshop. Verifique o Token.' });
  }
});

// ============================================================
// KPI DE LUCRO E CUSTO DE COSTUREIRA
// ============================================================

/**
 * Configurações de Custos Reais (Produção e Fornecedor)
 */
const BOBINA_LARGURA = 1.57;

/**
 * Detecta a gramatura a partir do nome da variante.
 * Ex: "1,50m x 2,00m / 120g" → "120g"
 */
function detectGramatura(variantName) {
  if (!variantName) return null;
  const name = variantName.toLowerCase();
  if (name.includes('160g') || name.includes('160gr')) return '160g';
  if (name.includes('120g') || name.includes('120gr')) return '120g';
  return null;
}

/**
 * Detecta as dimensões a partir do nome da variante.
 * Suporta formatos como "1,50m x 2,00m", "1.50 x 2.00", "1,50x2,00"
 * Retorna [dim1, dim2] em metros (float), ou null se não detectar.
 */
function detectDimensions(variantName) {
  if (!variantName) return null;
  // Limpeza: substitui vírgula por ponto e converte para minúsculo
  const cleanName = variantName.toLowerCase().replace(/,/g, '.');
  
  // Regex robusto: números seguidos opcionalmente por m/cm, separados por x/X/*
  const regex = /(\d+(?:\.\d+)?)\s*(?:m|cm|mt)?\s*[xX*]\s*(\d+(?:\.\d+)?)\s*(?:m|cm|mt)?/i;
  const match = cleanName.match(regex);
  
  if (!match) return null;
  
  let d1 = parseFloat(match[1]);
  let d2 = parseFloat(match[2]);

  // Conversão inteligente: se > 10, assume que está em cm e converte para metros
  // Ex: 150 -> 1.50 | 1.50 -> 1.50
  if (d1 > 10) d1 /= 100;
  if (d2 > 10) d2 /= 100;

  if (isNaN(d1) || isNaN(d2)) return null;
  return [d1, d2];
}

function calcLinearMeters(d1, d2) {
  if (d1 > 3.14) {
    return Math.ceil(d2 / BOBINA_LARGURA) * d1;
  }
  const optionA = Math.ceil(d1 / BOBINA_LARGURA) * d2;
  const optionB = Math.ceil(d2 / BOBINA_LARGURA) * d1;
  return Math.min(optionA, optionB);
}

class SkylinePacker {
  constructor(binWidth) {
    this.binWidth = binWidth;
    this.skyline = [{x: 0, y: 0, w: binWidth}];
  }

  pack(width, height) {
    width = Math.round(width * 1000) / 1000;
    height = Math.round(height * 1000) / 1000;

    let bestY = Infinity;
    let bestX = -1;

    for (let i = 0; i < this.skyline.length; i++) {
      let segment = this.skyline[i];
      let x = segment.x;
      
      if (Math.round((x + width)*1000)/1000 > this.binWidth) continue;

      let maxY = segment.y;
      let j = i;
      let currentX = x;
      while (Math.round(currentX * 1000)/1000 < Math.round((x + width)*1000)/1000 && j < this.skyline.length) {
        let seg = this.skyline[j];
        if (seg.y > maxY) maxY = seg.y;
        currentX += seg.w;
        j++;
      }

      if (maxY < bestY) {
        bestY = maxY;
        bestX = x;
      }
    }

    if (bestX === -1) return 0;

    let newSegment = {x: bestX, y: bestY + height, w: width};
    let newSkyline = [];
    let inserted = false;

    for (let i = 0; i < this.skyline.length; i++) {
      let seg = this.skyline[i];
      
      if (Math.round((seg.x + seg.w)*1000)/1000 <= Math.round(bestX*1000)/1000) {
        newSkyline.push(seg);
      }
      else if (Math.round(seg.x*1000)/1000 >= Math.round((bestX + width)*1000)/1000) {
        if (!inserted) {
          newSkyline.push(newSegment);
          inserted = true;
        }
        newSkyline.push(seg);
      }
      else {
        if (Math.round(seg.x*1000)/1000 < Math.round(bestX*1000)/1000) {
          newSkyline.push({x: seg.x, y: seg.y, w: bestX - seg.x});
        }
        if (!inserted) {
          newSkyline.push(newSegment);
          inserted = true;
        }
        if (Math.round((seg.x + seg.w)*1000)/1000 > Math.round((bestX + width)*1000)/1000) {
          newSkyline.push({x: bestX + width, y: seg.y, w: (seg.x + seg.w) - (bestX + width)});
        }
      }
    }
    
    if (!inserted) newSkyline.push(newSegment);
    
    this.skyline = [];
    for (let seg of newSkyline) {
      if (this.skyline.length > 0 && Math.round(this.skyline[this.skyline.length - 1].y*1000)/1000 === Math.round(seg.y*1000)/1000) {
        this.skyline[this.skyline.length - 1].w += seg.w;
      } else {
        this.skyline.push(seg);
      }
    }

    return bestY + height;
  }

  getMaxHeight() {
    return Math.max(0, ...this.skyline.map(s => s.y));
  }
}

function getBestStrips(d1, d2, quantity) {
  let strips = [];
  
  let optionA_strips = [];
  let wA = d1, hA = d2;
  let countA = Math.ceil(wA / BOBINA_LARGURA);
  for(let i=0; i<countA; i++) {
     let w = (i === countA - 1 && (wA % BOBINA_LARGURA !== 0)) ? (wA % BOBINA_LARGURA) : BOBINA_LARGURA;
     optionA_strips.push({w: w, h: hA});
  }
  let totalHeightA = countA * hA;

  let optionB_strips = [];
  let wB = d2, hB = d1;
  let countB = Math.ceil(wB / BOBINA_LARGURA);
  for(let i=0; i<countB; i++) {
     let w = (i === countB - 1 && (wB % BOBINA_LARGURA !== 0)) ? (wB % BOBINA_LARGURA) : BOBINA_LARGURA;
     optionB_strips.push({w: w, h: hB});
  }
  let totalHeightB = countB * hB;

  let chosenStrips = [];
  if (d1 > 3.14) {
    chosenStrips = optionB_strips; // força emenda horizontal -> h = d1
  } else {
    chosenStrips = totalHeightA <= totalHeightB ? optionA_strips : optionB_strips;
  }

  for (let q = 0; q < quantity; q++) {
    for (let s of chosenStrips) strips.push(s);
  }
  
  return strips;
}

function calcProductionCost(gram, d1, d2, settings) {
  const precoMetro = gram === '160g' ? settings.bobina160g : settings.bobina120g;
  const metrosLineares = calcLinearMeters(d1, d2);
  return metrosLineares * precoMetro;
}

/**
 * Calcula custo de costureira baseado nas regras de dimensão e configurações.
 */
function calcSewingCost(d1, d2, settings) {
  if (d1 >= 1.70 && d2 >= 1.70) return { cost: settings.costuraEmenda, type: 'emenda' };
  return { cost: settings.costuraOverloque, type: 'overloque' };
}

/**
 * Analisa um line_item de pedido e retorna estatísticas ou null se não reconhecido.
 */
function analyzeLineItem(item, settings) {
  const price = parseFloat(item.price || 0);
  const qty = parseInt(item.quantity || 1);
  if (price <= 0) return null;

  const variantName = item.variant_values
    ? (Array.isArray(item.variant_values) ? item.variant_values.join(' / ') : item.variant_values)
    : (item.name || '');

  const dims = detectDimensions(variantName) || detectDimensions(item.name || '');

  if (!dims) {
    return null;
  }

  const gram = detectGramatura(variantName) || detectGramatura(item.name || '') || '160g';
  const [d1, d2] = dims;

  const inSpecialRange = (d) => d >= 1.70 && d <= 1.75;
  const isSpecial = (inSpecialRange(d1) || inSpecialRange(d2));
  
  let prodCostEspecial = 0;
  let sewingCostUnit = 0;
  let sewingType = 'overloque';
  let strips120g = [];
  let strips160g = [];
  let m2120g = 0;

  if (isSpecial && gram === '120g') {
    prodCostEspecial = (d1 * d2) * settings.bobinaEspecial;
    sewingCostUnit = settings.costuraEspecial;
    sewingType = 'overloque';
    m2120g = d1 * d2;
  } else {
    const sewRes = calcSewingCost(d1, d2, settings);
    sewingCostUnit = sewRes.cost;
    sewingType = sewRes.type;
    
    if (gram === '120g') strips120g = getBestStrips(d1, d2, qty);
    if (gram === '160g') strips160g = getBestStrips(d1, d2, qty);
  }

  return {
    sewingCost: sewingCostUnit * qty,
    prodCostEspecial: prodCostEspecial * qty,
    m2120g: m2120g * qty,
    overloqueCount: sewingType === 'overloque' ? qty : 0,
    emendaCount: sewingType === 'emenda' ? qty : 0,
    strips120g,
    strips160g
  };
}

/**
 * GET /api/profit-stats
 * Query params:
 *   period: "current_month" | "last_month" | "custom"
 *   start: "YYYY-MM-DD" (para period=custom)
 *   end:   "YYYY-MM-DD" (para period=custom)
 *
 * Retorna:
 *   { totalProfit, sewingCost, ordersCount, period, startDate, endDate }
 */
app.get('/api/profit-stats', requireAuth, cacheMiddleware('profit_stats', 5), async (req, res) => {
  const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
  const client = await getApiClient(storeId);

  try {
    const { period = 'current_month', start, end, feePercent = 0, feeFixed = 0, feePixPercent = 0, feePixFixed = 0 } = req.query;
    const feeP = parseFloat(feePercent) || 0;
    const feeF = parseFloat(feeFixed) || 0;
    const feePixP = parseFloat(feePixPercent) || 0;
    const feePixF = parseFloat(feePixFixed) || 0;

    // Calcular datas do período no fuso de São Paulo
    const now = new Date();
    const brtNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));

    let startDate, endDate;

    if (period === 'last_month') {
      const firstDayLastMonth = new Date(brtNow.getFullYear(), brtNow.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(brtNow.getFullYear(), brtNow.getMonth(), 0);
      startDate = firstDayLastMonth.toISOString().split('T')[0];
      endDate = lastDayLastMonth.toISOString().split('T')[0];
    } else if (period === 'custom' && start && end) {
      startDate = start;
      endDate = end;
    } else if (period === 'semana') {
      const min = new Date(brtNow);
      min.setDate(brtNow.getDate() - brtNow.getDay()); // Domingo da semana atual
      startDate = min.toISOString().split('T')[0];
      endDate = brtNow.toISOString().split('T')[0];
    } else if (period === 'quinzena') {
      const min = new Date(brtNow);
      min.setDate(brtNow.getDate() - 15);
      startDate = min.toISOString().split('T')[0];
      endDate = brtNow.toISOString().split('T')[0];
    } else {
      // current_month (padrão)
      const firstDay = new Date(brtNow.getFullYear(), brtNow.getMonth(), 1);
      startDate = firstDay.toISOString().split('T')[0];
      endDate = brtNow.toISOString().split('T')[0];
    }

    // Buscar pedidos PAGOS no período
    let allOrders = [];
    let oPage = 1;
    let oHasMore = true;
    while (oHasMore) {
      const response = await client.get('/orders', {
        params: {
          per_page: 200,
          page: oPage,
          payment_status: 'paid',
          created_at_min: `${startDate}T00:00:00-03:00`,
          created_at_max: `${endDate}T23:59:59-03:00`,
        }
      });
      const ordersData = response.data || [];
      if (ordersData.length === 0) {
        oHasMore = false;
      } else {
        allOrders = allOrders.concat(ordersData);
        if (ordersData.length < 200) oHasMore = false;
        else oPage++;
        if (oPage > 500) oHasMore = false;
      }
    }

    let totalProfit = 0;
    let totalSewingCost = 0;
    let totalProductionCost = 0;
    let totalProdCost120g = 0;
    let totalProdCost160g = 0;
    let totalShippingCustomer = 0;
    let totalShippingOwner = 0;
    let totalFreeShippingCost = 0;
    let totalProfitFromFreeShipping = 0;
    let totalGatewayFee = 0;
    let totalGatewayFeePix = 0;
    let totalGatewayFeeCard = 0;
    let totalMeters120g = 0;
    let totalMeters160g = 0;
    let totalM2120g = 0;
    let analyzedItems = 0;
    let totalOverloqueCount = 0;
    let totalEmendaCount = 0;
    const settings = getSystemSettings().finance;
    let shippingDetails = {};
    let historicalOrders = [];

    for (const order of allOrders) {
      const lineItems = order.products || order.line_items || [];
      let orderProdCost = 0;
      let orderSewingCost = 0;
      let orderStrips120g = [];
      let orderStrips160g = [];

      for (const item of lineItems) {
        const result = analyzeLineItem(item, settings);
        if (result) {
          orderProdCost += result.prodCostEspecial || 0;
          orderSewingCost += result.sewingCost;
          totalM2120g += result.m2120g;
          analyzedItems += parseInt(item.quantity || 1);
          totalOverloqueCount += result.overloqueCount;
          totalEmendaCount += result.emendaCount;
          orderStrips120g.push(...result.strips120g);
          orderStrips160g.push(...result.strips160g);
        }
      }

      let m120 = 0;
      if (orderStrips120g.length > 0) {
        orderStrips120g.sort((a, b) => b.h - a.h || b.w - a.w);
        let packer120 = new SkylinePacker(BOBINA_LARGURA);
        for (let s of orderStrips120g) packer120.pack(s.w, s.h);
        m120 = packer120.getMaxHeight();
      }
      
      let m160 = 0;
      if (orderStrips160g.length > 0) {
        orderStrips160g.sort((a, b) => b.h - a.h || b.w - a.w);
        let packer160 = new SkylinePacker(BOBINA_LARGURA);
        for (let s of orderStrips160g) packer160.pack(s.w, s.h);
        m160 = packer160.getMaxHeight();
      }

      const cost120 = m120 * settings.bobina120g;
      const cost160 = m160 * settings.bobina160g;
      
      orderProdCost += cost120 + cost160;

      totalProdCost120g += cost120;
      totalProdCost160g += cost160;
      totalMeters120g += m120;
      totalMeters160g += m160;

      totalProductionCost += orderProdCost;
      totalSewingCost += orderSewingCost;

      // Cálculos financeiros do pedido
      const orderTotal = parseFloat(order.total || 0);
      const paymentMethod = order.payment_details ? order.payment_details.method : 'Desconhecido';
      const installments = order.payment_details ? order.payment_details.installments : 1;
      historicalOrders.push({
        id: order.id,
        number: order.number,
        total: orderTotal,
        paymentMethod: paymentMethod,
        installments: installments
      });
      
      const shippingCustomer = parseFloat(order.shipping_cost_customer || order.shipping || 0);
      const shippingOwner = parseFloat(order.shipping_cost_owner || order.shipping || 0);
      
      const isPix = order.payment_details && order.payment_details.method === 'pix';
      let gatewayFee = 0;
      if (isPix) {
        gatewayFee = (orderTotal * (feePixP / 100)) + feePixF;
        totalGatewayFeePix += gatewayFee;
      } else {
        gatewayFee = (orderTotal * (feeP / 100)) + feeF;
        totalGatewayFeeCard += gatewayFee;
      }

      totalShippingCustomer += shippingCustomer;
      totalShippingOwner += shippingOwner;
      
      const outOfPocketShipping = Math.max(0, shippingOwner - shippingCustomer);
      totalFreeShippingCost += outOfPocketShipping;

      totalGatewayFee += gatewayFee;

      const orderProfit = orderTotal - gatewayFee - shippingOwner - orderProdCost - orderSewingCost;

      totalProfit += orderProfit;
      if (outOfPocketShipping > 0) {
        totalProfitFromFreeShipping += orderProfit;
      }

      // Agrupamento de frete (custo real pago à transportadora)
      const shipOption = order.shipping_option || 'Desconhecido';
      shippingDetails[shipOption] = (shippingDetails[shipOption] || 0) + shippingOwner;
    }

    let minOrderNumber = null;
    let maxOrderNumber = null;
    if (historicalOrders.length > 0) {
      const nums = historicalOrders.map(o => parseInt(o.number, 10)).filter(n => !isNaN(n));
      if (nums.length > 0) {
        minOrderNumber = Math.min(...nums);
        maxOrderNumber = Math.max(...nums);
      }
    }

    res.json({
      totalProfit: parseFloat(totalProfit.toFixed(2)),
      sewingCost: parseFloat(totalSewingCost.toFixed(2)),
      productionCost: parseFloat(totalProductionCost.toFixed(2)),
      productionCost120g: parseFloat(totalProdCost120g.toFixed(2)),
      productionCost160g: parseFloat(totalProdCost160g.toFixed(2)),
      shippingTotal: parseFloat(totalShippingCustomer.toFixed(2)),
      shippingCustomerTotal: parseFloat(totalShippingCustomer.toFixed(2)),
      shippingOwnerTotal: parseFloat(totalShippingOwner.toFixed(2)),
      freeShippingCost: parseFloat(totalFreeShippingCost.toFixed(2)),
      profitFromFreeShipping: parseFloat(totalProfitFromFreeShipping.toFixed(2)),
      gatewayFeeTotal: parseFloat(totalGatewayFee.toFixed(2)),
      gatewayFeePix: parseFloat(totalGatewayFeePix.toFixed(2)),
      gatewayFeeCard: parseFloat(totalGatewayFeeCard.toFixed(2)),
      meters120g: parseFloat(totalMeters120g.toFixed(2)),
      meters160g: parseFloat(totalMeters160g.toFixed(2)),
      m2120g: parseFloat(totalM2120g.toFixed(2)),
      shippingDetails,
      historicalOrders,
      ordersCount: allOrders.length,
      analyzedItems,
      overloqueCount: totalOverloqueCount,
      emendaCount: totalEmendaCount,
      minOrderNumber,
      maxOrderNumber,
      period,
      startDate,
      endDate,
    });

  } catch (error) {
    console.error('[profit-stats] Erro:', error.response?.data || error.message);
    res.status(500).json({ error: 'Erro ao calcular lucro: ' + error.message });
  }
});

// Vendas (Orders)
app.get('/api/orders', requireAuth, cacheMiddleware(req => 'orders_p' + (req.query.page || 1) + '_s' + (req.query.status || 'all'), 5), async (req, res) => {
  const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
  const client = await getApiClient(storeId);
  try {
    const response = await client.get('/orders', { params: { per_page: 50, status: 'any' } });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/orders/:id', requireAuth, async (req, res) => {
  const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
  const client = await getApiClient(storeId);
  try {
    const response = await client.get(`/orders/${req.params.id}`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Produtos (Products) com Paginação e Busca
app.get('/api/products', requireAuth, cacheMiddleware(req => 'products_p' + (req.query.page || 1), 5), async (req, res) => {
  const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
  const client = await getApiClient(storeId);
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

app.get('/api/products/:id', requireAuth, async (req, res) => {
  const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
  const client = await getApiClient(storeId);
  try {
    const response = await client.get(`/products/${req.params.id}`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Instalação do Script via API (One-Click)
app.post('/api/store-script', requireAuth, async (req, res) => {
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
app.get('/api/categories', requireAuth, async (req, res) => {
  const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
  const client = await getApiClient(storeId);
  try {
    let allCats = [];
    let page = 1;
    let hasMore = true;
    while(hasMore) {
      const response = await client.get('/categories', { params: { per_page: 200, page } });
      const cats = response.data || [];
      allCats = allCats.concat(cats);
      if (cats.length < 200) hasMore = false;
      else page++;
      if (page > 10) hasMore = false; // Limit safety
    }
    res.json(allCats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Gerenciamento Financeiro (Comissões) ---

// ==========================================
// GERENCIADOR DE COMISSÕES ALINE MARTINS
// ==========================================

const COMMISSION_VALUE = 50.00;

// Busca comissões (relatório completo de pendentes e pagas)
app.get('/api/commissions/report', requireAuth, cacheMiddleware('commissions_report', 5), async (req, res) => {
  const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
  try {
    // 1. Busca última data de pagamento
    const { data: lastPayout, error: dbError } = await supabase
      .from('commissions_history')
      .select('*')
      .eq('store_id', storeId)
      .order('end_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (dbError && dbError.code !== '42P01') {
      console.warn('Erro ao buscar histórico (tabela pode não existir ainda):', dbError.message);
    }

    const lastPaidAt = lastPayout ? lastPayout.end_date : null;
    const now = new Date().toISOString();

    // 2. Buscar todos os produtos com a tag 'Aline Martins' direto do banco (Supabase)
    const { data: dbProducts, error: pError } = await supabase
      .from('nuvemshop_products')
      .select('id, tags')
      .eq('store_id', storeId)
      .or('tags.ilike.%aline martins%,tags.ilike.%aline-martins%,tags.ilike.%alinemartins%');

    if (pError) {
      console.error('Erro ao buscar produtos para comissões no Supabase:', pError.message);
      return res.status(500).json({ error: pError.message });
    }

    let targetProductIds = new Set();
    if (dbProducts && dbProducts.length > 0) {
      dbProducts.forEach(p => {
        targetProductIds.add(String(p.id));
      });
    }

    if (targetProductIds.size === 0) {
      return res.json({ pendingAmount: 0, itemsCount: 0, ordersCount: 0, startDate: lastPaidAt, endDate: now, pendingOrders: [], paidOrders: [] });
    }

    // 3. Buscar todos os pedidos pagos desde o lançamento (Fev/2025) salvos no Supabase
    const { data: dbOrders, error: oError } = await supabase
      .from('nuvemshop_orders')
      .select('id, number, status, payment_status, customer, products, created_at')
      .eq('store_id', storeId)
      .eq('payment_status', 'paid')
      .gte('created_at', '2025-02-15T00:00:00Z')
      .order('created_at', { ascending: false });

    if (oError) {
      console.error('Erro ao buscar pedidos para comissões no Supabase:', oError.message);
      return res.status(500).json({ error: oError.message });
    }

    let pendingOrders = [];
    let paidOrders = [];
    let totalPendingCommission = 0;
    let totalPendingItems = 0;

    for (const order of (dbOrders || [])) {
      const orderProducts = Array.isArray(order.products) ? order.products : [];
      if (orderProducts.length === 0) continue;
      
      let collectionItemCount = 0;
      let collectionRevenue = 0;
      
      for (const item of orderProducts) {
        // Garantindo comparação como string/número independente do tipo armazenado
        if (targetProductIds.has(String(item.product_id || item.id))) {
          const qty = parseInt(item.quantity || 1, 10);
          collectionItemCount += qty;
          collectionRevenue += (parseFloat(item.price || 0) * qty);
        }
      }

      if (collectionItemCount > 0) {
        const orderCommission = collectionItemCount * COMMISSION_VALUE;
        const orderData = {
          orderId: order.id,
          orderNumber: order.number,
          customerName: order.customer ? (order.customer.name || 'N/A') : 'N/A',
          createdAt: order.created_at,
          status: order.status,
          collectionItemsSold: collectionItemCount,
          collectionRevenue: collectionRevenue,
          commissionValue: orderCommission
        };

        const isPaid = lastPaidAt && new Date(order.created_at) <= new Date(lastPaidAt);

        if (isPaid) {
          paidOrders.push(orderData);
        } else {
          totalPendingCommission += orderCommission;
          totalPendingItems += collectionItemCount;
          pendingOrders.push(orderData);
        }
      }
    }

    res.json({
      pendingAmount: totalPendingCommission,
      itemsCount: totalPendingItems,
      ordersCount: pendingOrders.length,
      startDate: lastPaidAt,
      endDate: now,
      pendingOrders,
      paidOrders
    });
  } catch (error) {
    console.error('Error generating commissions report:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Pagar comissões (registrar na tabela commissions_history)
app.post('/api/commissions/pay', requireAuth, async (req, res) => {
  const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
  try {
    const { amount, itemsCount, ordersCount, startDate, endDate } = req.body;
    
    const { error } = await supabase.from('commissions_history').insert([{
      store_id: storeId,
      amount,
      items_count: itemsCount,
      orders_count: ordersCount,
      start_date: startDate,
      end_date: endDate
    }]);

    if (error) {
      if (error.code === '42P01') {
        return res.status(400).json({ error: "A tabela commissions_history ainda não foi criada no Supabase." });
      }
      throw error;
    }

    // Invalidar cache
    await supabase.from('api_cache').delete().eq('key', `${storeId}_commissions_report`);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buscar histórico de pagamentos
app.get('/api/commissions/history', requireAuth, async (req, res) => {
  const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
  try {
    const { data, error } = await supabase
      .from('commissions_history')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });
      
    if (error) {
      if (error.code === '42P01') {
         return res.json([]); // Tabela não existe, retorna vazio
      }
      throw error;
    }
    
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// IA Engine - Geração Massiva
app.post('/api/ai/bulk-process', requireAuth, async (req, res) => {
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
app.post('/api/products/bulk-create-manual', requireAuth, async (req, res) => {
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
            
            // LÓGICA DE MARCA D'ÁGUA NO LOTE
            try {
                const watermarkPath = path.join(__dirname, 'public', 'watermark_cloth.png');
                if (fs.existsSync(watermarkPath)) {
                    const mainImage = await Jimp.read(Buffer.from(base64Data, 'base64'));
                    const watermark = await Jimp.read(watermarkPath);
                    
                    await applyWatermark(mainImage, watermark);
                    
                    const processedBase64 = await mainImage.getBase64('image/jpeg');
                    imagePayload = {
                        attachment: processedBase64.split(',')[1],
                        filename: `product-${Date.now()}-${i}.jpg`
                    };
                    console.log(`📸 [Bulk] Marca d'água aplicada no item ${i+1}`);
                } else {
                    imagePayload = { attachment: base64Data, filename: `product-${Date.now()}-${i}.jpg` };
                }
            } catch (pErr) {
                console.error(`⚠️ [Bulk] Falha ao processar imagem do item ${i+1}:`, pErr.message);
                imagePayload = { attachment: base64Data, filename: `product-${Date.now()}-${i}.jpg` };
            }

        } else {
            imagePayload = { src: imgStr };
        }

        try {
            let productData = {};

            if (baseProduct) {
                // MODO CLONAGEM (Preservar apenas Descrição, Tags, Categorias, Atributos e Variações)
                const fieldsToCopy = [
                    'description', 'attributes', 'tags'
                ];
                
                productData = {
                    name: typeof baseProduct.name === 'object' ? { pt: item.name } : item.name,
                    seo_title: item.name,
                    seo_description: `Fundo fotográfico produzido para ${item.name} com valores a partir de R$94,00`,
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

                if (baseProduct.variants && baseProduct.variants.length > 0) {
                    productData.variants = baseProduct.variants.map((v) => {
                        // O usuário pediu o SKU igual ao nome do produto (removendo os hífens)
                        const finalSku = item.name.replace(/-/g, '');

                        return {
                            price: v.price || "0.00",
                            promotional_price: v.promotional_price,
                            stock: null, // null = estoque infinito na API Nuvemshop/Tiendanube
                            weight: v.weight !== null ? v.weight : 0.5,
                            width: v.width,
                            height: v.height,
                            depth: v.depth,
                            cost: v.cost,
                            values: v.values, // Copia as propriedades da Variação ("Tamanho", "Gramatura" etc)
                            sku: finalSku     // SKU automático baseado no nome do arquivo (sem hífens)
                        };
                    });
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

/**
 * REGISTRO UNITÁRIO COM MARCA D'ÁGUA E REPLICAÇÃO
 * 
 * Este endpoint clona as configurações de um produto base e aplica uma marca d'água
 * em grade (tiled) em uma nova imagem antes de cadastrar o produto na Nuvemshop.
 * O SKU é gerado automaticamente a partir do nome do arquivo original.
 */
app.post('/api/products/register-unitary', requireAuth, async (req, res) => {
    try {
        const { baseProductId, fileName, imageData } = req.body;
        const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
        const client = await getApiClient(storeId);

        if (!baseProductId || !imageData || !fileName) {
            return res.status(400).json({ error: 'Dados insuficientes: baseProductId, fileName e imageData são obrigatórios.' });
        }

        console.log(`🚀 [Unitary] Iniciando cadastro unitário. Base: ${baseProductId}, Arquivo: ${fileName}`);

        // 1. Buscar produto base para clonar configurações
        const baseRes = await client.get(`/products/${baseProductId}`);
        const baseProduct = baseRes.data;

        // 2. Processar Imagem com Marca d'Água (Tiled)
        const watermarkPath = path.join(__dirname, 'public', 'watermark_cloth.png');
        let finalWmPath = watermarkPath;
        if (!fs.existsSync(watermarkPath)) {
            finalWmPath = path.join(__dirname, 'public', 'watermark.png');
            if (!fs.existsSync(finalWmPath)) {
                return res.status(500).json({ error: 'Marca d\'água não encontrada em public/watermark_cloth.png' });
            }
        }

        const buffer = Buffer.from(imageData.split(',')[1], 'base64');
        const mainImage = await Jimp.read(buffer);
        const watermark = await Jimp.read(finalWmPath);

        // APLICAÇÃO DA NOVA LÓGICA (Centralizada e Redimensionada uma única vez)
        await applyWatermark(mainImage, watermark);

        const processedImageBase64 = await mainImage.getBase64('image/jpeg');

        // 3. Gerar SKU limpo a partir do nome do arquivo
        const cleanSku = fileName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9-]/g, "");
        
        // 4. Montar Payload do Produto (Clonando do base já com a imagem aplicada)
        const productData = {
            name: { pt: cleanSku },
            description: baseProduct.description,
            categories: (baseProduct.categories || []).map(c => c.id || c),
            seo_title: baseProduct.seo_title || cleanSku,
            seo_description: baseProduct.seo_description,
            attributes: baseProduct.attributes,
            tags: baseProduct.tags,
            variants: (baseProduct.variants || []).map(v => ({
                price: v.price,
                stock: null, // Sem limite de estoque
                weight: v.weight,
                width: v.width,
                height: v.height,
                depth: v.depth,
                sku: cleanSku,
                values: v.values
            })),
            images: [
                {
                    attachment: processedImageBase64.split(',')[1],
                    filename: `${cleanSku}.jpg`
                }
            ]
        };

        // 5. Enviar para API Nuvemshop (Produto + Imagem de uma vez)
        const createRes = await client.post('/products', productData);
        const newProduct = createRes.data;

        console.log(`✅ [Unitary] Produto ${newProduct.id} criado com sucesso! SKU: ${cleanSku}`);
        res.json({ success: true, product: newProduct });

    } catch (error) {
        const errorDetail = error.response?.data || error.message;
        console.error('❌ [Unitary] Erro:', errorDetail);
        res.status(500).json({ error: 'Erro no cadastro unitário', details: errorDetail });
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
    const localSettings = path.join(__dirname, 'script_settings.json');
    if (fs.existsSync(localSettings)) {
      return JSON.parse(fs.readFileSync(localSettings, 'utf-8'));
    }
  } catch(e) {}
  return { enabled: true, whatsapp: '5521964403083' };
}
function saveScriptSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
    const localSettings = path.join(__dirname, 'script_settings.json');
    fs.writeFileSync(localSettings, JSON.stringify(settings, null, 2), 'utf-8');
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
  const fretePath = path.join(__dirname, 'src', 'frete-frontend.js');
  let jsContent = '';
  try {
    const calcContent = fs.readFileSync(scriptPath, 'utf8');
    
    let freteContent = '';
    try {
      freteContent = fs.readFileSync(fretePath, 'utf8');
    } catch(e) {
      console.warn("Script frete-frontend.js não encontrado, ignorando.");
    }
    
    let searchContent = '';
    try {
      const searchPath = path.join(__dirname, 'src', 'search-frontend.js');
      searchContent = fs.readFileSync(searchPath, 'utf8');
    } catch(e) {
      console.warn("Script search-frontend.js não encontrado, ignorando.");
    }
    
    jsContent = calcContent + 
                '\n\n/* --- Frete Dinamico Injetado --- */\n\n' + freteContent +
                '\n\n/* --- Busca Inteligente Injetada --- */\n\n' + searchContent;
    
    const localSettings = getScriptSettings();
    const promocaoAlineAtiva = localSettings.promocaoAlineAtiva === true;

    jsContent = jsContent
      .replace(/__ENABLED__/g, enabled.toString())
      .replace(/__WHATSAPP__/g, whatsapp.toString())
      .replace(/__PROMOCAO_ALINE_ATIVA__/g, promocaoAlineAtiva.toString())
      .replace(/__PUBLIC_URL__/g, process.env.PUBLIC_URL || 'https://ai-manager-nuvemshop.onrender.com');

  } catch (err) {
    console.error("Erro ao ler front script:", err);
    jsContent = "console.error('Calculadora indiponível ou erro ao ler script');";
  }

  res.send(jsContent);
}

// 2. ENDPOINT INTERNO: Para o Painel Salvar as Configurações Cloud
app.get('/api/store-script-settings', requireAuth, (req, res) => {
  res.json(getScriptSettings());
});



app.post('/api/store-script-settings', requireAuth, async (req, res) => {
  const { enabled, whatsapp, promocaoAlineAtiva } = req.body;
  const currentSettings = getScriptSettings();
  
  const finalEnabled = enabled !== undefined ? (enabled === true) : (currentSettings.enabled !== false);
  const finalWhatsapp = whatsapp || currentSettings.whatsapp || '5511999999999';
  const finalPromocaoAlineAtiva = promocaoAlineAtiva !== undefined 
    ? (promocaoAlineAtiva === true) 
    : (currentSettings.promocaoAlineAtiva === true);

  saveScriptSettings({ 
    enabled: finalEnabled, 
    whatsapp: finalWhatsapp, 
    promocaoAlineAtiva: finalPromocaoAlineAtiva 
  });


  try {
    const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
    if(!storeId) throw new Error("Sem Store ID local. Logue na Loja via painel Cloud.");
    const client = await getApiClient(storeId);
    
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
app.delete('/api/store-script', requireAuth, async (req, res) => {
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

// Remove da loja especificamente (Nuvemshop)
app.delete('/api/scripts/store-script', async (req, res) => {
  const storeId = req.query.store_id || DEFAULT_STORE_ID;
  const client = await getApiClient(storeId);
  try {
    const getRes = await client.get('/scripts');
    const scriptsList = Array.isArray(getRes.data) ? getRes.data : [];
    const myScript = scriptsList.find(s => (s.src || '').includes('ai-manager-nuvemshop.onrender.com'));
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

// ============================================================
// CARRINHO ABANDONADO — API SUPABASE ✨
// ============================================================

/** GET /api/abandoned-cart/settings — retorna configurações */
app.get('/api/abandoned-cart/settings', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('abandoned_cart_config')
      .select('*')
      .maybeSingle();

    if (error) throw error;
    res.json({ success: true, data: data });
  } catch (err) {
    console.error('Erro ao buscar configurações:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/abandoned-cart/settings — salva configurações */
app.post('/api/abandoned-cart/settings', requireAuth, async (req, res) => {
  try {
    const { data: current } = await supabase.from('abandoned_cart_config').select('id').maybeSingle();
    const safeBody = req.body;
    
    // Limpar campos que não devem ir para o DB ou que podem causar erro
    const { id, updated_at, ...cleanPayload } = safeBody;
    
    const payload = {
      ...cleanPayload,
      updated_at: new Date().toISOString()
    };
    
    let result;
    if (current?.id) {
        result = await supabase.from('abandoned_cart_config').update(payload).eq('id', current.id);
    } else {
        result = await supabase.from('abandoned_cart_config').insert([payload]);
    }

    if (result.error) throw result.error;
    res.json({ success: true, data: payload });
  } catch (err) {
    console.error('Erro ao salvar configurações:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/abandoned-cart/history — lista carrinhos já contatados */
/** GET /api/abandoned-cart/history — lista carrinhos já contatados */
app.get('/api/abandoned-cart/history', requireAuth, async (req, res) => {
  try {
    const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
    console.log(`[Admin] Buscando histórico para loja ${storeId}...`);
    
    // Usamos a tabela nuvemshop_checkouts que é a fonte de verdade do Vigilante
    const { data, error } = await supabase
      .from('nuvemshop_checkouts')
      .select('*')
      .eq('store_id', String(storeId))
      .eq('recovery_status', 'sent')
      .order('nuvemshop_updated_at', { ascending: false })
      .limit(100);

    if (error) {
        console.error('[Admin] Erro Supabase no histórico:', error);
        throw error;
    }
    
    res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('[Admin] Falha crítica no histórico:', err.message);
    res.status(500).json({ success: false, error: 'Falha ao recuperar histórico: ' + err.message });
  }
});


/** POST /api/abandoned-cart/mark-sent — registra que um carrinho foi contatado (chamado pelo n8n) */
app.post('/api/abandoned-cart/mark-sent', async (req, res) => {
  try {
    // Autenticação flexível: Supabase JWT ou CRON_SECRET
    const cronKey = req.query.key || req.headers['x-cron-key'];
    const expectedKey = process.env.CRON_SECRET || 'ClothSecret2026';
    let isAuthorized = false;

    if (cronKey === expectedKey) {
      isAuthorized = true;
    } else {
      // Tenta JWT do Supabase
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return res.status(401).json({ error: 'Acesso negado. Token não fornecido ou inválido.' });
    }

    const { checkout_id, customer_name, customer_phone, total, products, status, error_message, store_id } = req.body;
    const finalStoreId = String(store_id || req.headers['x-store-id'] || DEFAULT_STORE_ID);
    
    if (!checkout_id) return res.status(400).json({ success: false, error: 'checkout_id obrigatório' });

    console.log(`[Carrinho] Marcando enviado: checkout ${checkout_id} | Store ${finalStoreId}`);

    const payload = {
      checkout_id: String(checkout_id),
      store_id: finalStoreId,
      customer_name: customer_name || 'N/A',
      customer_phone: customer_phone || 'N/A',
      status: status || 'sent',
      sent_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('abandoned_cart_sent')
      .upsert(payload, { onConflict: 'checkout_id' });

    if (error) {
      console.error('❌ Erro Supabase mark-sent:', error);
      throw error;
    }

    res.json({ success: true, record: payload });
  } catch (err) {
    console.error('Erro ao marcar como enviado:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/abandoned-cart/check-sent/:checkoutId — verifica se carrinho já foi contatado */
app.get('/api/abandoned-cart/check-sent/:checkoutId', async (req, res) => {
  try {
    // Este endpoint foi desativado pois a Nuvemshop V1 não suporta webhooks de abandono.
    // O sistema agora utiliza o 'Vigilante (Polling)' automático no servidor.
    res.json({ success: true, message: 'O sistema agora é 100% automático via Vigilante (Polling). Nenhuma sincronização manual necessária.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/feedback/eligible — busca pedidos elegíveis para feedback com prazo dinâmico por CEP/UF */
app.get('/api/feedback/eligible', async (req, res) => {
  try {
    // Autenticação flexível
    const cronKey = req.query.key || req.headers['x-cron-key'];
    const expectedKey = process.env.CRON_SECRET || 'ClothSecret2026';
    if (cronKey !== expectedKey) {
      return res.status(401).json({ error: 'Acesso negado. Token inválido.' });
    }

    const { data: orders, error } = await supabase
      .from('nuvemshop_orders')
      .select('id, store_id, number, customer, created_at, updated_at, raw_data')
      .eq('payment_status', 'paid');

    if (error) throw error;

    const { data: sentFeedbacks, error: fError } = await supabase
      .from('nuvemshop_feedbacks')
      .select('order_id');
    if (fError) throw fError;

    const sentIds = new Set((sentFeedbacks || []).map(f => f.order_id));

    // Filtrar elegíveis
    const now = new Date();
    const limitDate = new Date('2026-06-15T00:00:00Z');
    const eligibleOrders = [];

    for (const order of (orders || [])) {
      // Ignorar se já foi enviado feedback
      if (sentIds.has(order.id)) continue;

      // REGRA: Ignorar pedidos criados antes de 15/06/2026
      const orderDate = new Date(order.created_at);
      if (orderDate < limitDate) continue;

      const raw = order.raw_data || {};
      const trackingNumber = raw.shipping_tracking_number;
      
      // Só prossegue se tiver código de rastreamento
      if (!trackingNumber || String(trackingNumber).trim() === '') continue;

      // Pegar data de envio (ou última atualização do pedido)
      const shippedAtStr = raw.shipped_at || order.updated_at || order.created_at;
      const shippedAt = new Date(shippedAtStr);

      // Calcular quantos dias se passaram desde o envio
      const diffTime = Math.abs(now - shippedAt);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      // Limite de segurança: se foi enviado há mais de 40 dias, ignora para evitar contatar históricos antigos
      if (diffDays > 40) continue;

      // Determinar o prazo com base no CEP e Estado
      const address = raw.shipping_address || {};
      const zipcode = address.zipcode || '';
      const province = address.province || '';
      
      const daysToWait = getDaysToWait(zipcode, province);

      if (diffDays >= daysToWait) {
        eligibleOrders.push({
          id: order.id,
          store_id: order.store_id,
          number: order.number,
          customer_name: order.customer?.name || 'Cliente',
          customer_phone: order.customer?.phone || '',
          customer_email: order.customer?.email || '',
          tracking_number: trackingNumber,
          shipped_at: shippedAtStr,
          days_elapsed: diffDays,
          days_required: daysToWait,
          province: province,
          zipcode: zipcode
        });
      }
    }

    // REGRA: Limitar quantidade de envios por execução para evitar spam no WhatsApp (padrão 3 pedidos)
    const limit = parseInt(req.query.limit || '3', 10);
    const batch = eligibleOrders.slice(0, limit);

    res.json({ success: true, count: batch.length, total_eligible: eligibleOrders.length, orders: batch });
  } catch (err) {
    console.error('Erro ao buscar pedidos elegíveis para feedback:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Função auxiliar para calcular o prazo com base no CEP/UF
function getDaysToWait(zipcode, province) {
  const uf = String(province || '').toUpperCase().trim();
  const cep = String(zipcode || '').replace(/\D/g, '');
  
  // RJ (Nova Iguaçu é no RJ)
  if (uf === 'RJ' || uf === 'RIO DE JANEIRO' || cep.startsWith('2')) {
    return 10; // 7 dias + 3 de margem
  }
  
  // SP, MG, ES (Sudeste)
  if (uf === 'SP' || uf === 'SÃO PAULO' || uf === 'SAO PAULO' || uf === 'MG' || uf === 'MINAS GERAIS' || uf === 'ES' || uf === 'ESPÍRITO SANTO' || uf === 'ESPIRITO SANTO') {
    return 12;
  }
  
  // Sul (PR, SC, RS)
  if (['PR', 'PARANÁ', 'PARANA', 'SC', 'SANTA CATARINA', 'RS', 'RIO GRANDE DO SUL'].some(x => uf.includes(x)) || cep.startsWith('8') || cep.startsWith('9')) {
    return 15;
  }
  
  // Centro-Oeste
  if (['DF', 'DISTRITO FEDERAL', 'GO', 'GOIÁS', 'GOIAS', 'MT', 'MATO GROSSO', 'MS', 'MATO GROSSO DO SUL'].some(x => uf.includes(x)) || cep.startsWith('7')) {
    return 18;
  }
  
  // Nordeste / Norte (Demora mais)
  return 31;
}

/** POST /api/feedback/mark-sent — registra o envio do feedback para evitar duplicidade */
app.post('/api/feedback/mark-sent', async (req, res) => {
  try {
    const cronKey = req.query.key || req.headers['x-cron-key'];
    const expectedKey = process.env.CRON_SECRET || 'ClothSecret2026';
    if (cronKey !== expectedKey) {
      return res.status(401).json({ error: 'Acesso negado. Token inválido.' });
    }

    const { order_id, store_id, customer_name, customer_phone, status } = req.body;
    if (!order_id) return res.status(400).json({ success: false, error: 'order_id obrigatório' });

    const payload = {
      order_id: String(order_id),
      store_id: String(store_id || DEFAULT_STORE_ID),
      customer_name: customer_name || 'N/A',
      customer_phone: customer_phone || 'N/A',
      status: status || 'sent',
      sent_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('nuvemshop_feedbacks')
      .upsert(payload, { onConflict: 'order_id' });

    if (error) {
      console.error('❌ Erro Supabase mark-feedback-sent:', error);
      throw error;
    }

    res.json({ success: true, record: payload });
  } catch (err) {
    console.error('Erro ao marcar feedback como enviado:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/public/search-products — Endpoint público de busca avançada por múltiplos termos (Nome, SKU, Tags) */
app.get('/api/public/search-products', async (req, res) => {
  try {
    const q = req.query.q;
    const storeId = req.query.store_id || DEFAULT_STORE_ID;
    
    if (!q || String(q).trim() === '') {
      return res.json({ success: true, count: 0, products: [] });
    }

    // Limpar termos e remover acentos para busca flexível
    const cleanTerm = String(q).normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    // Dividir em palavras individuais
    const words = cleanTerm.split(/\s+/).filter(w => w.length > 1);

    if (words.length === 0) {
      return res.json({ success: true, count: 0, products: [] });
    }

    let query = supabase
      .from('nuvemshop_products')
      .select('id, name, price, sku, tags, raw_data')
      .eq('store_id', String(storeId));

    // Lógica para mapear letras para padrões regex com/sem acento
    const buildRegexPattern = (word) => {
      const map = {
        'a': '[aáàâãäåæ]',
        'e': '[eéèêë]',
        'i': '[iíìîï]',
        'o': '[oóòôõöø]',
        'u': '[uúùûü]',
        'c': '[cç]',
        'n': '[nñ]'
      };
      let pattern = '';
      for (let i = 0; i < word.length; i++) {
        const char = word[i].toLowerCase();
        if (map[char]) {
          pattern += map[char];
        } else {
          pattern += char;
        }
      }
      return pattern;
    };

    // Aplicar a lógica AND: todas as palavras devem estar em Nome, SKU ou Tags usando regex (imatch)
    words.forEach(word => {
      const regex = buildRegexPattern(word);
      query = query.or(`name.imatch.${regex},sku.imatch.${regex},tags.imatch.${regex}`);
    });

    const { data: products, error } = await query
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('❌ Erro Supabase search:', error);
      throw error;
    }

    // Formatar resposta amigável para o frontend
    const results = (products || []).map(p => {
      const raw = p.raw_data || {};
      const image = raw.images?.[0]?.src || '';
      
      let url = raw.canonical_url || '';
      if (url && url.includes('tiendanube.com')) {
        url = `/produtos/${raw.handle || ''}`;
      } else if (!url) {
        url = `/produtos/${raw.handle || ''}`;
      } else {
        try {
          const parsedUrl = new URL(url);
          url = parsedUrl.pathname;
        } catch(e) {
          url = `/produtos/${raw.handle || ''}`;
        }
      }

      return {
        id: p.id,
        name: p.name,
        price: p.price,
        sku: p.sku,
        url: url,
        image: image
      };
    });

    res.json({ success: true, count: results.length, products: results });
  } catch (err) {
    console.error('Erro ao buscar produtos:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});


/** GET /api/abandoned-cart/checkouts — busca carrinhos abandonados da Nuvemshop (para o painel) */
/**
 * POST /api/abandoned-cart/register-webhook — Registra o webhook de abandono na Nuvemshop
 */
app.post('/api/abandoned-cart/register-webhook', requireAuth, async (req, res) => {
  try {
    const STORE_ID = req.headers['x-store-id'] || DEFAULT_STORE_ID;
    
    // Buscar token dinamicamente do Supabase
    const stores = await getStores();
    const token = stores[STORE_ID]?.access_token || DEFAULT_ACCESS_TOKEN;
    
    if (!token || token.includes('YOUR_ACCESS_TOKEN')) {
      return res.status(400).json({ success: false, error: 'Token de acesso Nuvemshop não configurado.' });
    }

    const webhookUrl = `${PUBLIC_URL}/api/abandoned-cart/webhook`;
    console.log(`[Webhook Auto] Registrando abandono para loja ${STORE_ID} na URL: ${webhookUrl}`);

    // 1. Listar TODOS os webhooks para garantir limpeza total
    const listRes = await axios.get(
      `https://api.tiendanube.com/v1/${STORE_ID}/webhooks`,
      { headers: { 'Authentication': `bearer ${token}`, 'User-Agent': 'AIManager/1.0' } }
    );
    
    const existing = listRes.data || [];
    for (const wh of existing) {
      // Remover se for o mesmo evento OU se a URL contiver nosso endpoint de abandono
      if (wh.event === 'abandoned_checkout/created' || (wh.url && wh.url.includes('/api/abandoned-cart/webhook'))) {
        console.log(`[Webhook Auto] Removendo conflito: ${wh.id} (${wh.event})`);
        try {
          await axios.delete(`https://api.tiendanube.com/v1/${STORE_ID}/webhooks/${wh.id}`, {
            headers: { 'Authentication': `bearer ${token}`, 'User-Agent': 'AIManager/1.0' }
          });
        } catch (delErr) {
          console.warn(`[Webhook Auto] Falha ao deletar webhook ${wh.id}:`, delErr.message);
        }
      }
    }

    // 2. Registrar novo
    const regRes = await axios.post(
      `https://api.tiendanube.com/v1/${STORE_ID}/webhooks`,
      { event: 'abandoned_checkout/created', url: webhookUrl },
      { headers: { 
          'Authentication': `bearer ${token}`, 
          'User-Agent': 'AIManager/1.0',
          'Content-Type': 'application/json' 
      }}
    );

    res.json({ success: true, data: regRes.data });
  } catch (err) {
    const errorDetail = err.response?.data || err.message;
    console.error('❌ Erro ao registrar webhook de abandono:', errorDetail);
    
    // Se for erro de validação da Nuvemshop (422), extrair a mensagem amigável
    let message = 'Erro desconhecido ao registrar webhook';
    if (err.response?.status === 422) {
       message = `Nuvemshop: ${JSON.stringify(errorDetail)}`;
    } else {
       message = err.message;
    }
    
    res.status(500).json({ success: false, error: message });
  }
});

app.get('/api/abandoned-cart/checkouts', requireAuth, async (req, res) => {
  try {
    const storeId = req.headers['x-store-id'] || req.query.store_id || DEFAULT_STORE_ID;
    const api = await getApiClient(storeId);
    
    // Na Nuvemshop V1, os carrinhos abandonados são acessados via /checkouts com o filtro completed_at null
    const response = await api.get('/checkouts', {
      params: { 
        per_page: 50,
        // O status "open" no checkout costuma refletir carrinhos não finalizados
        status: 'open' 
      }
    });

    // Filtro adicional de segurança: apenas checkouts que não foram concluídos
    const checkouts = response.data
      .filter(c => !c.completed_at) 
      .map(c => ({
      id: c.id,
      // Fallbacks para nome: contact_name > billing_address > customer.name
      customer_name: c.contact_name || 
                     (c.billing_address ? `${c.billing_address.first_name || ''} ${c.billing_address.last_name || ''}`.trim() : '') || 
                     c.customer?.name || 
                     'Cliente Sem Nome',
      customer_email: c.contact_email || c.customer?.email,
      // Fallbacks para telefone: contact_phone > billing_address.phone > customer.phone
      customer_phone: c.contact_phone || c.billing_address?.phone || c.customer?.phone || null,
      total: c.total,
      currency: c.currency,
      checkout_url: c.abandoned_checkout_url,
      created_at: c.created_at,
      updated_at: c.updated_at,
      // Dados detalhados para a aba de detalhes
      billing_address: c.billing_address,
      shipping_address: c.shipping_address,
      line_items: c.products || [],
      products: c.products?.map(item => item.name).join(', ') || 'Sem produtos',
      items_count: c.products?.length || 0
    }));

    res.json({ 
      success: true, 
      data: checkouts, 
      total: checkouts.length 
    });
  } catch (err) {
    console.error('❌ Erro ao buscar checkouts da Nuvemshop:', err.message);
    res.status(500).json({ 
      success: false, 
      error: err.response?.data || err.message 
    });
  }
});

/**
 * GET /api/abandoned-cart/verify-recovery/:checkoutId
 * Verifica se um carrinho abandonado foi recuperado.
 * Retorna { recovered: true/false, reason: 'completed' | 'new_order' | null }
 * Permite acesso com Supabase Auth ou com a CRON_SECRET como header/query.
 */
app.get('/api/abandoned-cart/verify-recovery/:checkoutId', async (req, res) => {
  try {
    const checkoutId = req.params.checkoutId;
    if (!checkoutId) return res.status(400).json({ success: false, error: 'checkoutId obrigatório' });

    // Autenticação flexível: Supabase JWT ou CRON_SECRET
    const cronKey = req.query.key || req.headers['x-cron-key'];
    const expectedKey = process.env.CRON_SECRET || 'ClothSecret2026';
    let isAuthorized = false;

    if (cronKey === expectedKey) {
      isAuthorized = true;
    } else {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
          isAuthorized = true;
          req.user = user;
        }
      }
    }

    if (!isAuthorized) {
      return res.status(401).json({ success: false, error: 'Acesso negado. Autenticação inválida.' });
    }

    // 1. Buscar o carrinho no banco para pegar o email/telefone e a data de criação
    const { data: checkout, error: dbErr } = await supabase
      .from('nuvemshop_checkouts')
      .select('*')
      .eq('id', String(checkoutId))
      .maybeSingle();

    if (dbErr) throw dbErr;
    if (!checkout) {
      return res.status(404).json({ success: false, error: 'Carrinho não encontrado no banco' });
    }

    const storeId = checkout.store_id || DEFAULT_STORE_ID;
    const client = await getApiClient(storeId);
    
    // 2. Chamar a API da Nuvemshop para verificar se o checkout já foi pago/concluído
    let isCompleted = false;
    try {
      const apiRes = await client.get(`/checkouts/${checkoutId}`);
      const apiCart = apiRes.data;
      if (apiCart && apiCart.completed_at) {
        isCompleted = true;
      }
    } catch (apiErr) {
      console.warn(`[Verificação] Falha ao buscar checkout ${checkoutId} na Nuvemshop API:`, apiErr.message);
    }

    if (isCompleted) {
      // Atualiza o status no banco de dados para evitar reprocessamento futuro
      await supabase
        .from('nuvemshop_checkouts')
        .update({ recovery_status: 'completed', last_sync_at: new Date().toISOString() })
        .eq('id', checkoutId);

      return res.json({ success: true, recovered: true, reason: 'completed' });
    }

    // 3. Verificar se o cliente comprou algo APÓS criar este carrinho
    const email = checkout.customer_email;
    const phone = checkout.customer_phone;
    const createdTime = checkout.nuvemshop_created_at;

    if (email || phone) {
      // Procurar pedidos pagos ou em aberto da mesma loja criados após este carrinho
      let query = supabase
        .from('nuvemshop_orders')
        .select('id, created_at, status')
        .eq('store_id', storeId)
        .gt('created_at', createdTime)
        .neq('status', 'cancelled'); // Desconsidera cancelados

      if (email && phone) {
        query = query.or(`customer->>email.eq."${email}",customer->>phone.eq."${phone}"`);
      } else if (email) {
        query = query.eq('customer->>email', email);
      } else {
        query = query.eq('customer->>phone', phone);
      }

      const { data: orders, error: ordersErr } = await query;

      if (ordersErr) {
        console.error('[Verificação] Erro ao buscar pedidos recentes do cliente:', ordersErr.message);
      } else if (orders && orders.length > 0) {
        console.log(`[Verificação] Cliente ${email || phone} realizou a compra ${orders[0].id} após o carrinho ${checkoutId}.`);
        
        // Atualiza o status no banco para "recovered_other"
        await supabase
          .from('nuvemshop_checkouts')
          .update({ recovery_status: 'recovered_other', last_sync_at: new Date().toISOString() })
          .eq('id', checkoutId);

        return res.json({ success: true, recovered: true, reason: 'new_order' });
      }
    }

    res.json({ success: true, recovered: false });
  } catch (err) {
    console.error('[Verificação] Erro crítico no endpoint de verificação:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/** 
 * POST /api/abandoned-cart/webhook — Webhook oficial para Automação Total 
 * Recebe notificações de abandono de carrinho da Nuvemshop
 */
app.post('/api/abandoned-cart/webhook', async (req, res) => {
  try {
    const checkout = req.body; // Payload da Nuvemshop (abandoned_checkout/created)
    if (!checkout || !checkout.id) return res.status(400).send('Webhook payload inválido');

    console.log(`[Automação] Novo carrinho abandonado detectado: ${checkout.id} (Cliente: ${checkout.customer?.first_name})`);

    // 1. Buscar Configurações no Supabase
    const { data: config, error: cfgErr } = await supabase
      .from('abandoned_cart_config')
      .select('*')
      .maybeSingle();

    if (cfgErr || !config) {
      console.error('[Automação] Erro ao buscar config:', cfgErr);
      return res.status(500).send('Erro ao buscar configuração');
    }

    // 2. Verificar se automação está ATIVA
    if (!config.enabled) {
      console.log('[Automação] Abortado: Automação desativada nas configurações.');
      return res.json({ success: false, message: 'Automação desativada' });
    }

    // 3. Verificar se já enviamos para este checkout (evitar duplicidade)
    const { data: sentBefore } = await supabase
      .from('abandoned_cart_sent')
      .select('id')
      .eq('checkout_id', String(checkout.id))
      .maybeSingle();

    if (sentBefore) {
      console.log(`[Automação] Abortado: Carrinho ${checkout.id} já recebeu mensagem anteriormente.`);
      return res.json({ success: false, message: 'Já processado' });
    }

    // 4. Preparar Dados
    const customer = checkout.customer || {};
    const phone = (customer.phone || checkout.billing_address?.phone || '').replace(/\D/g, '');
    const name = customer.first_name || customer.name || 'Cliente';
    const total = parseFloat(checkout.total) || 0;
    const checkoutUrl = checkout.abandoned_checkout_url || checkout.checkout_url || '';
    
    if (!phone || phone.length < 8) {
      console.log('[Automação] Abortado: Cliente sem telefone válido.');
      return res.json({ success: false, message: 'Sem telefone' });
    }

    // 5. Aplicar Regras Dinâmicas de Cupom
    let chosenDiscount = 5;
    const rules = config.coupon_rules || [];
    if (Array.isArray(rules)) {
      for (const rule of rules) {
        const minV = parseFloat(rule.min) || 0;
        const maxV = parseFloat(rule.max) || Infinity;
        if (total >= minV && total <= maxV) {
          chosenDiscount = parseInt(rule.discount) || 5;
          break;
        }
      }
    }
    const validDiscount = Math.max(5, Math.min(15, chosenDiscount));

    // 6. Gerar Cupom na Nuvemshop
    const couponCode = Math.floor(10000 + Math.random() * 90000).toString();
    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().split('T')[0];
    
    const STORE_ID = process.env.TIENDANUBE_STORE_ID || '2767708';
    const NUVEMSHOP_TOKEN = process.env.TIENDANUBE_ACCESS_TOKEN || '454761d47b7ce42c4d539deb3025366ac8dbe358';

    try {
      await axios.post(`https://api.tiendanube.com/v1/${STORE_ID}/coupons`, {
        code: couponCode,
        type: 'percentage',
        value: validDiscount.toFixed(2),
        max_uses: 1,
        end_date: localISOTime
      }, {
        headers: {
          'Authentication': `bearer ${NUVEMSHOP_TOKEN}`,
          'User-Agent': 'AI-Manager Automation',
          'Content-Type': 'application/json'
        }
      });
      console.log(`[Automação] Cupom ${couponCode} (${validDiscount}%) gerado para ${name}.`);
    } catch (cErr) {
      console.error('[Automação] Erro ao criar cupom Nuvemshop:', cErr.response?.data || cErr.message);
      // Prossegue sem cupom ou aborta? Vamos prosseguir com cupom fake 12345 se falhar para não perder a venda?
      // Melhor abortar para não enviar mensagem errada.
      return res.status(500).json({ success: false, error: 'Erro Nuvemshop Cupom' });
    }

    // 7. Formatar Mensagem
    const productList = checkout.line_items?.map(p => `• ${p.name} x${p.quantity}`).join('\n') || 'Produtos no carrinho';
    let messageBody = (config.message_template || 'Olá {{nome}}, vimos seu carrinho...')
      .replace(/{{(nome|name)}}/g, name)
      .replace(/{{produtos}}/g, productList)
      .replace(/{{total}}/g, total.toFixed(2).replace('.', ','))
      .replace(/{{link}}/g, checkoutUrl)
      .replace(/{{cupom}}/g, couponCode)
      .replace(/{{desconto}}/g, validDiscount);

    // 8. Enviar via WuzAPI (Chamando o n8n ou direto)
    // Usaremos o padrão de enviar para o WuzAPI configurado
    const wuzapiUrl = config.wuzapi_url;
    const wuzapiToken = config.wuzapi_user_token || config.wuzapi_token;

    if (wuzapiUrl && wuzapiToken) {
      try {
        await axios.post(`${wuzapiUrl}/chat/send/text`, {
          phone: phone,
          message: messageBody
        }, {
          headers: { 'Authorization': `Bearer ${wuzapiToken}` }
        });
        console.log(`[Automação] Mensagem enviada com sucesso para ${phone}.`);
      } catch (wErr) {
        console.error('[Automação] Erro ao enviar WuzAPI:', wErr.response?.data || wErr.message);
      }
    }

    // 9. Registrar no Histórico
    await supabase.from('abandoned_cart_sent').upsert({
      checkout_id: String(checkout.id),
      store_id: String(STORE_ID),
      customer_name: name,
      customer_phone: phone,
      status: 'sent',
      sent_at: new Date().toISOString()
    }, { onConflict: 'checkout_id' });

    res.json({ success: true, message: 'Processado automaticamente' });

  } catch (err) {
    console.error('[Automação] Erro fatal no webhook:', err.message);
    res.status(500).send('Internal Error');
  }
});

/** POST /api/abandoned-cart/manual-send — Proxy simples para webhook do n8n */
app.post('/api/abandoned-cart/manual-send', requireAuth, async (req, res) => {
  try {
    const { 
      phone, customer_name, products, total, checkout_url,
      wuzapi_url, wuzapi_token, wuzapi_user_token,
      coupon_rules
    } = req.body;
    
    let message = req.body.message;

    // Lógica para Cupom Dinâmico Nuvemshop
    if (message && message.includes('{{cupom}}')) {
      try {
        const couponCode = Math.floor(10000 + Math.random() * 90000).toString();
        
        // Define data de validade para o final do dia atual (limitação da Nuvemshop API de não aceitar horas precisas)
        const tzOffset = (new Date()).getTimezoneOffset() * 60000;
        const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().split('T')[0];

        console.log(`💡 Gerando novo cupom [${couponCode}] ativo até o final do dia atual (${localISOTime}).`);

        const NUVEMSHOP_TOKEN = process.env.TIENDANUBE_ACCESS_TOKEN || process.env.NUVEMSHOP_ACCESS_TOKEN || '454761d47b7ce42c4d539deb3025366ac8dbe358';
        const STORE_ID = process.env.TIENDANUBE_STORE_ID || process.env.NUVEMSHOP_STORE_ID || '2767708';

        // Determina desconto baseado nas faixas de regras (array)
        let chosenDiscount = 5;
        if (coupon_rules && Array.isArray(coupon_rules)) {
          const cartTotal = parseFloat(total) || 0;
          for (const rule of coupon_rules) {
            const minV = parseFloat(rule.min) || 0;
            const maxV = parseFloat(rule.max) || Infinity;
            if (cartTotal >= minV && cartTotal <= maxV) {
              chosenDiscount = parseInt(rule.discount) || 5;
              break;
            }
          }
        }

        const validDiscount = Math.max(5, Math.min(15, chosenDiscount));

        await axios.post(`https://api.tiendanube.com/v1/${STORE_ID}/coupons`, {
          code: couponCode,
          type: 'percentage',
          value: validDiscount.toFixed(2),
          max_uses: 1,
          end_date: localISOTime // Cupom encerra virada no próximo dia
        }, {
          headers: {
            'Authentication': `bearer ${NUVEMSHOP_TOKEN}`,
            'User-Agent': 'AI-Manager (lucasxntos@gmail.com)',
            'Content-Type': 'application/json'
          }
        });

        // Substituir tag
        message = message.replace(/{{cupom}}/g, couponCode);
        message = message.replace(/{{desconto}}/g, validDiscount);
        console.log(`✅ Cupom ${couponCode} criado e embutido na mensagem com sucesso!`);
      } catch (couponErr) {
        console.error('❌ Falha ao tentar criar cupom Nuvemshop:', couponErr.response?.data || couponErr.message);
        // Fallback: se a criação falhar por algum motivo bizarro, ainda envia a msg, porém removendo a tag ou substituindo por texto limpo
        message = message.replace('{{cupom}}', '(Cupom especial temporariamente indisponível)');
      }
    }

    const N8N_WEBHOOK = 'https://n8n-webhook.adminfotoplanner.com.br/webhook/recuperar';
    
    console.log('Enviando para n8n webhook:', N8N_WEBHOOK);
    console.log('Dados:', { phone, customer_name, message: message?.substring(0,50) + '...' });

    const response = await axios.post(N8N_WEBHOOK, {
      phone,
      message,
      customer_name,
      products,
      total,
      checkout_url,
      wuzapi_url,
      wuzapi_token,
      wuzapi_user_token
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000
    });

    console.log('Resposta do n8n:', response.data);
    res.json({ success: true, data: response.data });

  } catch (err) {
    const errDetail = err.response?.data || err.message;
    console.error('Erro no proxy para n8n:', errDetail);
    res.status(500).json({ 
      success: false, 
      error: errDetail
    });
  }
});

/** POST /api/abandoned-cart/coupons/bulk-delete — Remove todos os cupons da Nuvemshop */
app.post('/api/abandoned-cart/coupons/bulk-delete', requireAuth, async (req, res) => {
  const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
  
  try {
    const client = await getApiClient(storeId);
    console.log(`[Admin] Iniciando exclusão EXAUSTIVA de cupons para a loja ${storeId}`);
    
    let totalDeleted = 0;
    let hasMore = true;
    let batchNumber = 1;

    while (hasMore) {
      console.log(`[Admin] Buscando Lote #${batchNumber} de cupons...`);
      const listRes = await client.get('/coupons', { params: { per_page: 100 } });
      const coupons = listRes.data || [];
      
      if (coupons.length === 0) {
        console.log(`[Admin] Nenhum cupom encontrado no Lote #${batchNumber}. Finalizando.`);
        hasMore = false;
        break;
      }

      console.log(`[Admin] Lote #${batchNumber}: ${coupons.length} cupons encontrados. Excluindo...`);
      
      for (const coupon of coupons) {
        try {
          await client.delete(`/coupons/${coupon.id}`);
          totalDeleted++;
          // Delay de 100ms para ser um pouco mais rápido mas ainda seguro
          await new Promise(r => setTimeout(r, 100));
        } catch (delErr) {
          console.error(`[Admin] Falha ao deletar cupom ${coupon.id}:`, delErr.response?.data || delErr.message);
        }
      }
      
      console.log(`[Admin] Lote #${batchNumber} concluído. Total até agora: ${totalDeleted}`);
      batchNumber++;
      
      // Pequena pausa entre lotes para o servidor respirar
      await new Promise(r => setTimeout(r, 500));
    }
    
    console.log(`[Admin] Sucesso total: ${totalDeleted} cupons removidos da loja ${storeId}.`);
    res.json({ success: true, message: `Processo finalizado. ${totalDeleted} cupons excluídos com sucesso.` });

  } catch (err) {
    console.error('[Admin] Erro no bulk-delete:', err.response?.data || err.message);
    res.status(500).json({ success: false, error: 'Falha na autenticação ou conexão com a Nuvemshop' });
  }
});


/** POST /api/abandoned-cart/sync-manually — Dispara o vigilante manualmente */
app.post('/api/abandoned-cart/sync-manually', requireAuth, async (req, res) => {
  try {
    console.log('[Admin] Sincronização manual solicitada.');
    // Rodamos async para responder rápido
    runProfessionalAbandonedCartRecovery().catch(e => console.error('[Vigilante-Manual] Erro:', e));
    res.json({ success: true, message: 'Sincronização iniciada com sucesso!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// ============================================================
// VIGILANTE DE CARRINHOS ABANDONADOS (AUTO-POLLING) 🤖
// ============================================================

export async function runProfessionalAbandonedCartRecovery() {
  const logMsg = `[Vigilante] Iniciando verificação de rotina: ${new Date().toLocaleString()}\n`;
  console.log(logMsg);
  const logFile = path.join(process.cwd(), 'sync_debug.log');
  fs.appendFileSync(logFile, logMsg);
  try {
    // 2. Buscar configurações ativas (Coluna real: enabled)
    const { data: activeConfigs, error: configErr } = await supabase
      .from('abandoned_cart_config')
      .select('*')
      .eq('enabled', true);

    if (configErr) {
      console.error('[Vigilante] Erro ao buscar configurações:', configErr.message);
      return;
    }

    const stores = await getStores();
    const storeIds = Object.keys(stores);

    for (const storeId of storeIds) {
      const storeData = stores[storeId];
      const token = storeData.access_token;
      
      // 1. Buscar Configuração da Loja no Supabase
      const { data: config, error: cfgErr } = await supabase
        .from('abandoned_cart_config')
        .select('*')
        .eq('store_id', storeId)
        .maybeSingle();

      if (cfgErr || !config || !config.enabled) {
        // console.log(`[Vigilante] Loja ${storeId} ignorada (desativada ou sem config).`);
        continue;
      }

      console.log(`[Vigilante] Processando loja ${storeId}...`);

      const apiRes = await axios.get(`https://api.tiendanube.com/v1/${storeId}/checkouts`, {
        params: { status: 'abandoned', per_page: 50 },
        headers: { 'Authentication': `bearer ${token}`, 'User-Agent': 'AI-Manager Vigilante' }
      });

      const checkouts = apiRes.data || [];
      console.log(`[Vigilante] API Nuvemshop respondeu com ${checkouts.length} checkouts.`);
      
      if (checkouts.length > 0) {
          console.log(`[Vigilante] Exemplo de ID recebido: ${checkouts[0].id}`);
      }
      
      const stats = `[Vigilante] Loja ${storeId}: Encontrados ${checkouts.length} checkouts abandonados.\n`;
      fs.appendFileSync('sync_debug.log', stats);
      


      for (const cart of checkouts) {
        try {
          // --- EXTRAÇÃO REFINADA DE DADOS (FALLBACKS AVANÇADOS) ---
          
          // 1. Extração de Nome (Prioridade para campos planos e depois o objeto customer)
          let name = 'Cliente';
          const possibleNames = [
            cart.contact_name,
            cart.billing_name,
            cart.shipping_name,
            cart.billing_address?.name,
            cart.shipping_address?.name,
            cart.customer?.name,
            cart.customer?.first_name ? `${cart.customer.first_name} ${cart.customer.last_name || ''}`.trim() : null
          ];

          for (const n of possibleNames) {
            if (n && typeof n === 'string' && n.toLowerCase() !== 'cliente' && n.length > 2) {
              name = n;
              break;
            }
          }

          // 2. Extração de Email
          const email = cart.contact_email || cart.email || cart.customer?.email || '';

          // 3. Extração de Telefone (Normalização 55DDD9XXXXXXXX)
          let phoneRaw = cart.contact_phone || 
                         cart.billing_phone || 
                         cart.shipping_phone || 
                         cart.billing_address?.phone || 
                         cart.shipping_address?.phone || 
                         cart.customer?.phone || 
                         '';
          
          let phone = phoneRaw.toString().replace(/\D/g, '');
          // Se tiver 11 dígitos (DDD + 9 + Número) e não começar com 55, adiciona 55
          if (phone && phone.length === 11 && !phone.startsWith('55')) {
            phone = '55' + phone;
          } else if (phone && phone.length === 10 && !phone.startsWith('55')) {
            phone = '55' + phone;
          }

          const firstName = name.split(' ')[0] || 'Cliente';
          const total = parseFloat(cart.total) || 0;
          const totalFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total);
          const checkoutUrl = cart.abandoned_checkout_url || cart.checkout_url || '';

          // 4. Detalhes dos Itens
          // ⚠️ A API da Nuvemshop retorna produtos em `products`, não em `line_items`
          const itemsRaw = cart.products || cart.line_items || [];
          const items = itemsRaw.map(item => ({
            name: item.name || 'Produto',
            quantity: item.quantity || 1,
            price: item.price,
            product_id: item.id || item.product_id,
            total_item: parseFloat(item.price || 0) * (item.quantity || 1)
          }));

          // 4.1 Coluna `items_text`: um produto por linha dentro da mesma célula
          // Formato: • Nome do Produto | Qtd: 2 | R$ 94,00
          const itemsText = items.length > 0
            ? items.map(p =>
                `• ${p.name} | Qtd: ${p.quantity} | R$ ${parseFloat(p.price || 0).toFixed(2).replace('.', ',')}`
              ).join('\n')
            : 'Produtos não informados';

          // 4.2 Versão curta para o placeholder {{produtos}} na mensagem de WhatsApp
          const productList = items.length > 0
            ? items.map(p => `• ${p.name} (x${p.quantity})`).join('\n')
            : 'Produtos selecionados';

          // --- VERIFICAÇÃO DE DUPLICIDADE (MEMÓRIA) ---
          const { data: dbCart } = await supabase
            .from('nuvemshop_checkouts')
            .select('recovery_status, coupon_code')
            .eq('id', String(cart.id))
            .maybeSingle();

          // Se já foi enviado, ignoramos para não gerar spam nem cupons extras
          if (dbCart?.recovery_status === 'sent') {
            // console.log(`[Vigilante] Carrinho ${cart.id} já enviado. Pulando.`);
            continue;
          }

          // 5. MOTOR DE CUPOES INTELIGENTE 🎟️
          let messageTemplate = config.message_template || "Olá {{nome}}, vimos que você deixou estes itens no carrinho:\n{{produtos}}\nFinalize aqui: {{link}}";
          let couponCode = dbCart?.coupon_code || ''; // REUTILIZA cupom se já existir no banco
          let validDiscount = '0%';
          let numericDiscountValue = 0;
          
          const hasCouponTag = /{{\s*(cupom|coupon)\s*}}/gi.test(messageTemplate);
          
          if (hasCouponTag || (config.coupon_rules && config.coupon_rules.length > 0)) {
            try {
              const rules = Array.isArray(config.coupon_rules) ? config.coupon_rules : [];
              const applicableRule = rules
                .filter(r => total >= (parseFloat(r.min) || 0) && total <= (parseFloat(r.max) || 999999))
                .sort((a,b) => (parseFloat(b.min) || 0) - (parseFloat(a.min) || 0))[0];

              if (applicableRule) {
                numericDiscountValue = parseInt(applicableRule.discount) || 0;
                validDiscount = `${numericDiscountValue}%`;
                
                // SÓ criamos na Nuvemshop se NÃO tivermos um cupom já registrado para este checkout
                if (!couponCode) {
                    couponCode = Math.floor(10000 + Math.random() * 90000).toString();
                    
                    const client = await getApiClient(storeId);
                    
                    // Define a vigência para hoje. Como a Nuvemshop pode interpretar "YYYY-MM-DD" como UTC e atrasar o dia para fuso Brasileiro (-3),
                    // enviaremos a string ISO completa com o timezone explícito (-03:00) para garantir que a data seja recebida corretamente.
                    const fmt = new Intl.DateTimeFormat('en-CA', { 
                        timeZone: 'America/Sao_Paulo', 
                        year: 'numeric', month: '2-digit', day: '2-digit' 
                    });
                    const brtDate = fmt.format(new Date()); // Formato: "YYYY-MM-DD" no fuso do Brasil

                    const startISO = `${brtDate}T00:00:00-03:00`;
                    const endISO = `${brtDate}T23:59:59-03:00`;

                    await client.post('/coupons', {
                      code: couponCode,
                      type: 'percentage',
                      value: String(numericDiscountValue),
                      max_uses: 1,
                      start_date: startISO,
                      end_date: endISO
                    });
                    
                    console.log(`[Vigilante] Novo cupom ${couponCode} (${validDiscount}) gerado para ${name}.`);
                    fs.appendFileSync('sync_debug.log', `[Vigilante] Novo cupom ${couponCode} para ${name}\n`);
                } else {
                    console.log(`[Vigilante] Reutilizando cupom ${couponCode} existente no banco para ${name}.`);
                }
              }
            } catch (couponErr) {
              console.error(`[Vigilante] Erro ao gerenciar cupom:`, couponErr.response?.data || couponErr.message);
            }
          }

          // 6. Montagem da Mensagem com Placeholders Precisos 🧠
          let recoveryMessage = messageTemplate
            .replace(/{{\s*?(nome|name|first_name)\s*?}}/gi, firstName || name)
            .replace(/{{\s*?(produtos|products|items)\s*?}}/gi, itemsText)
            .replace(/{{\s*?(total)\s*?}}/gi, totalFormatted)
            .replace(/{{\s*?(link|url|checkout_url)\s*?}}/gi, checkoutUrl)
            .replace(/{{\s*?(cupom|coupon)\s*?}}/gi, couponCode || "")
            .replace(/{{\s*?(desconto|discount)\s*?}}/gi, validDiscount || "");

          // Se não houver cupom, limpamos as frases de incentivo que ficaram vazias
          if (!couponCode) {
            // Remove sentenças que mencionam cupom ou desconto caso eles não existam
            recoveryMessage = recoveryMessage
              .replace(/Use o cupom.*?!/gi, "")
              .replace(/Ganhe.*\% de desconto/gi, "")
              .replace(/\n\s*\n/g, "\n\n"); // Limpa quebras de linha duplas
          }

          // Limpeza final de qualquer tag {{...}} residual
          recoveryMessage = recoveryMessage.replace(/{{.*?}}/g, '').trim();

          if (!couponCode) {
            recoveryMessage = recoveryMessage.replace(/cupom:[^ ]*/gi, '').replace(/{{cupom}}/gi, '');
          }

          const { data: existingStatus } = await supabase
            .from('nuvemshop_checkouts')
            .select('recovery_status')
            .eq('id', String(cart.id))
            .maybeSingle();

          const statusToSet = existingStatus?.recovery_status || 'pending';

          const { error: syncErr } = await supabase
            .from('nuvemshop_checkouts')
            .upsert({
              id: String(cart.id),
              store_id: String(storeId),
              customer_name: name,
              customer_first_name: firstName,
              customer_email: email,
              customer_phone: phone,
              total: total,
              total_formatted: totalFormatted,
              currency: cart.currency || 'BRL',
              checkout_url: checkoutUrl,
              items_json: itemsRaw,
              items_text: itemsText,            // ← NOVA COLUNA: produtos formatados (um por linha)
              recovery_message: recoveryMessage,
              message_body: messageTemplate,
              coupon_code: couponCode,
              coupon_value: numericDiscountValue,
              recovery_status: statusToSet,
              wuzapi_token_used: config.wuzapi_user_token || '',
              nuvemshop_created_at: cart.created_at,
              nuvemshop_updated_at: cart.updated_at,
              last_sync_at: new Date().toISOString()
            });

          if (syncErr) {
            console.error(`[Vigilante] ❌ Erro no UPSERT do carrinho ${cart.id}:`, syncErr.message);
          } else {
            console.log(`[Vigilante] ✅ SUCESSO: ${firstName} (${cart.id}) | Cupom: ${couponCode || 'SEM CUPOM'} | Desc: ${numericDiscountValue || 0}%`);
          }
        } catch (cartErr) {
          console.error(`[Vigilante] Erro no loop do carrinho:`, cartErr.message);
        }
      }
      console.log(`[Vigilante] Sincronização de checkouts concluída para a loja ${storeId}.`);
    }
  } catch (err) {
    console.error('[Vigilante] ❌ Erro Crítico:', err.message);
  }
}

// Iniciar o Vigilante a cada 1 minuto
setInterval(runProfessionalAbandonedCartRecovery, 1 * 60 * 1000);
// Executar uma vez no start (com delay de 30s para o servidor estabilizar)
setTimeout(runProfessionalAbandonedCartRecovery, 30 * 1000);

// ============================================================
// ============================================================
// Redireciona todas as outras rotas para o index.html do React (SPA)
app.get('/*any', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => console.log(`Backend AIOX v5.1 Operacional na porta ${PORT}`));


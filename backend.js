import express from 'express';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: fs.existsSync('../nuvemshop-mcp/.env') ? '../nuvemshop-mcp/.env' : '.env' });

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

function getStores() {
  if (!fs.existsSync(STORES_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(STORES_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

function saveStore(storeId, data) {
  const stores = getStores();
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
function getApiClient(storeId = DEFAULT_STORE_ID) {
  const stores = getStores();
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
app.get('/api/debug-env', (req, res) => {
  const mask = (str) => str ? `${str.substring(0, 4)}***${str.substring(str.length - 4)}` : 'MISSING';
  const stores = getStores();
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
    saveStore(user_id, { access_token });

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

// --- SIMULAR PREÇO (Frontend Instantâneo) ---
app.post('/api/simulate-price', (req, res) => {
  try {
    const { width, height } = req.body;
    const w = parseFloat(String(width).replace(',', '.'));
    const h = parseFloat(String(height).replace(',', '.'));
    if (!w || !h || w <= 0 || h <= 0) return res.status(400).json({ error: 'Medidas inválidas. Recebido: ' + width + 'x' + height });
    
    const max = Math.max(w, h);
    const min = Math.min(w, h);
    if (min > 3) return res.status(400).json({ error: 'Menor dimensão não pode ultrapassar 3,00m' });
    
    let price120 = 0;
    if (min <= 1.56) price120 = (max * 22.50) + 3.00 + 45.00;
    else price120 = (((max * 2) * 22.50) + 15.00) * 1.80;

    let price160 = 0;
    if (min <= 1.56) price160 = (max * 26.00) + 3.00 + 45.00;
    else price160 = (((max * 2) * 26.00) + 15.00) * 1.80;

    res.json({
      price120: price120.toFixed(2),
      price160: price160.toFixed(2)
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
    if (!storeId || !productId) return res.status(400).json({ error: 'Loja ou Produto não identificado.' });
    
    const client = getApiClient(storeId);
    
    // Regras Matemáticas Seguras (Backend-side)
    const w = parseFloat(String(width).replace(',', '.'));
    const h = parseFloat(String(height).replace(',', '.'));
    if (!w || !h || w <= 0 || h <= 0) return res.status(400).json({ error: 'Medidas inválidas. Recebido: ' + width + 'x' + height });
    
    const max = Math.max(w, h);
    const min = Math.min(w, h);
    if (min > 3) return res.status(400).json({ error: 'Menor dimensão não pode ultrapassar 3,00m' });
    
    const factor = (gramatura === '160g') ? 26.00 : 22.50;
    let finalPrice = 0;
    
    if (min <= 1.56) {
      finalPrice = (max * factor) + 3.00 + 45.00;
    } else {
      finalPrice = (((max * 2) * factor) + 15.00) * 1.80;
    }
    
    const measureStr = `${w.toFixed(2).replace('.', ',')}m x ${h.toFixed(2).replace('.', ',')}m`;
    const priceStr = finalPrice.toFixed(2);
    
    // 1. Busca o produto
    const prodRes = await client.get(`/products/${productId}`);
    const product = prodRes.data;
    
    // 2. Ajusta atributos (se for vazio, Nuvemshop recusa variações sem key)
    let attributes = product.attributes || [];
    if (attributes.length === 0) {
      attributes = [{ pt: "Tamanho" }, { pt: "Gramatura" }];
      await client.put(`/products/${productId}`, { attributes });
    }
    
    // 3. Montar values da nova variante mapeando inteligentemente de acordo com os nomes dos atributos
    let baseVariant = product.variants && product.variants.length > 0 ? product.variants[0] : null;
    let newValues = attributes.map((attr, idx) => {
      let attrName = (attr.pt || attr.es || attr.en || "").toLowerCase();
      
      if (attrName.includes('gramatura') || attrName.includes('tecido') || attrName.includes('material')) {
         return { pt: gramatura };
      }
      if (attrName.includes('tamanho') || attrName.includes('medida') || attrName.includes('dimens')) {
         return { pt: measureStr };
      }
      
      // Fallback posicional natural
      if (idx === 0) return { pt: measureStr };
      if (idx === 1) return { pt: gramatura };
      
      return baseVariant && baseVariant.values && baseVariant.values[idx] 
        ? baseVariant.values[idx] 
        : { pt: "-" };
    });
    
    // 4. Procura variante exata já existente cruzando os values
    const existing = product.variants.find(v => {
      if (!v.values || v.values.length !== newValues.length) return false;
      return newValues.every((nv, i) => v.values[i] && v.values[i].pt === nv.pt);
    });

    if (existing) {
       return res.json({ success: true, variant_id: existing.id, price: priceStr });
    }
    
    // 5. Limite de variantes (100) -> Limpar se bater 80
    if (product.variants.length > 80) {
       // Buscar variaveis customizadas criadas pela AI (identificadas pela regex de metros "X,XXm x Y,YYm")
       const customVariants = product.variants.filter(v => v.values && v.values.some(val => val.pt && val.pt.match(/\d+,\d+m x \d+,\d+m/)));
       if (customVariants.length > 0) {
           const oldest = customVariants.reduce((prev, curr) => prev.id < curr.id ? prev : curr);
           await client.delete(`/products/${productId}/variants/${oldest.id}`);
       }
    }
    
    // 6. Criar nova variante
    const variantPayload = {
      price: priceStr,
      stock: 999, // Virtual
      weight: baseVariant ? baseVariant.weight : 0.5,
      values: newValues
    };
    
    const createRes = await client.post(`/products/${productId}/variants`, variantPayload);
    res.json({ success: true, variant_id: createRes.data.id, price: priceStr });
    
  } catch (error) {
    console.error("[Criação de Variante] Falha:", error.response?.data || error.message);
    const apiError = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    res.status(500).json({ error: "Erro Nuvemshop: " + apiError, details: error.response?.data });
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
  const client = getApiClient(storeId);
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
  const client = getApiClient(storeId);
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
  const client = getApiClient(storeId);
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
    const client = getApiClient(storeId);
    
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
  const client = getApiClient(storeId);
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
    const client = getApiClient(storeId);
    
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
  const client = getApiClient(storeId);
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

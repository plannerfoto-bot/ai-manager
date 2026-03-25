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

const ACCESS_TOKEN = process.env.TIENDANUBE_ACCESS_TOKEN;
const STORE_ID = process.env.TIENDANUBE_STORE_ID;
const BASE_URL = process.env.TIENDANUBE_BASE_URL || "https://api.tiendanube.com/v1";

const apiClient = axios.create({
  baseURL: `${BASE_URL}/${STORE_ID}`,
  headers: {
    "Authorization": `Bearer ${ACCESS_TOKEN}`,
    "Authentication": `bearer ${ACCESS_TOKEN}`, // Mantemos para compatibilidade
    "X-Auth-Token": ACCESS_TOKEN, // Algumas versões da API usam este
    "User-Agent": "AIOX-Manager (projeto@plannee.com.br)",
    "Content-Type": "application/json",
  },
});

// Dashboard Stats
app.get('/api/stats', async (req, res) => {
  try {
    // Para contar produtos de forma eficiente em lojas grandes (10k+), 
    // pegamos o total dos headers da primeira página em vez de baixar tudo.
    const [prodRes, ordersRes] = await Promise.all([
      apiClient.get('/products', { params: { per_page: 1 } }),
      apiClient.get('/orders', { params: { per_page: 50, status: 'any' } })
    ]);
    
    const totalSales = ordersRes.data.reduce((acc, order) => acc + parseFloat(order.total || 0), 0);
    const productsCount = prodRes.headers['x-total-count'] || prodRes.data.length;

    res.json({
      productsCount: parseInt(productsCount),
      ordersCount: ordersRes.data.length,
      totalSales: totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      recentOrders: ordersRes.data.slice(0, 5)
    });
  } catch (error) {
    console.error('Erro ao processar estatísticas:', error.message);
    res.status(500).json({ error: 'Erro ao processar estatísticas' });
  }
});

// Vendas (Orders)
app.get('/api/orders', async (req, res) => {
  try {
    const response = await apiClient.get('/orders', { params: { per_page: 50, status: 'any' } });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const response = await apiClient.get(`/orders/${req.params.id}`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Produtos (Products) com Paginação e Busca
app.get('/api/products', async (req, res) => {
  try {
    const { page = 1, per_page = 24, q = '' } = req.query;
    const params = { page, per_page, sort_by: 'created-descending' };
    if (q) params.q = q;

    const response = await apiClient.get('/products', { params });
    
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
  try {
    const response = await apiClient.get(`/products/${req.params.id}`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Categorias (Para IA)
app.get('/api/categories', async (req, res) => {
  try {
    const response = await apiClient.get('/categories');
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
            const response = await apiClient.post('/products', productData);
            const newProduct = response.data;
            
            // Etapa 2: Fazer upload da imagem via endpoint secundário na API (Garante Sucesso)
            await apiClient.post(`/products/${newProduct.id}/images`, imagePayload);
            
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

// 1. ENDPOINT PÚBLICO: Onde a Loja Baixará o Código (JS Puro)
app.get('/api/script.js', (req, res) => {
  const { enabled, whatsapp } = getScriptSettings();
  
  res.setHeader('Content-Type', 'application/javascript');
  // Cache de 1 minuto para não pesar o servidor
  res.setHeader('Cache-Control', 'public, max-age=60');

  // Retorna o gerador do JS exato (Sem as tags de <script> de HTML)
  const jsContent = `
(function(){
  var CALCULATOR_ENABLED=${enabled};
  var WHATSAPP_NUMBER='${whatsapp}';
  var GRAMATURA='120g';
  if(!CALCULATOR_ENABLED)return;

  function isProductPage(){return window.location.pathname.indexOf('/produtos/')!==-1||window.location.pathname.indexOf('/products/')!==-1||!!document.querySelector('[data-product-form],[itemtype*="Product"],.js-buy-form');}
  function calc(a,l){var M=Math.max(a,l);if(M<=0)return{e:'Valores devem ser maiores que zero.'};if(M>3)return{e:'Máximo: 3,00m por dimensão.'};return a>1.56&&l>1.56?{p:((M*2)*22.5+15)*2,r:'B'}:{p:M*22.5+3+45,r:'A'};}
  function brl(v){return'R$ '+v.toFixed(2).replace('.',',');}
  function dim(v){return v.toFixed(2).replace('.',',')+'m';}

  function html(){
    var d=document.createElement('div');
    d.id='cloth-calc-widget';
    d.innerHTML='<style>#cloth-calc-widget{margin:16px 0 8px;border:1.5px solid #2563eb44;border-radius:18px;background:linear-gradient(135deg,#0f172a,#1e293b);padding:18px 20px 16px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;max-width:440px;box-shadow:0 4px 24px #2563eb18}#cloth-calc-header{display:flex;align-items:center;gap:10px;margin-bottom:14px}#cloth-calc-icon{background:#2563eb22;border-radius:10px;padding:7px;display:flex}#cloth-calc-icon svg{width:18px;height:18px;stroke:#60a5fa;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}#cloth-calc-title{font-size:14px;font-weight:800;color:#fff;margin:0}#cloth-calc-subtitle{font-size:10px;color:#60a5fa;margin:0;opacity:.75}#cloth-calc-inputs{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}.cloth-calc-field label{display:flex;align-items:center;gap:4px;font-size:10px;text-transform:uppercase;font-weight:700;color:#94a3b8;margin-bottom:5px;letter-spacing:.05em}.cloth-calc-field label svg{width:11px;height:11px;stroke:#60a5fa;fill:none;stroke-width:2;stroke-linecap:round}.cloth-calc-field input{width:100%;box-sizing:border-box;background:#0f172a;border:1.5px solid #334155;border-radius:10px;padding:9px 12px;font-size:14px;color:#fff;outline:none;transition:border-color .2s;-webkit-appearance:none}.cloth-calc-field input:focus{border-color:#2563eb99;background:#1e293b}.cloth-calc-field input::placeholder{color:#475569}#cloth-calc-btn{width:100%;padding:11px;background:#2563eb;border:none;border-radius:12px;font-size:13px;font-weight:800;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;letter-spacing:.04em;transition:background .2s,transform .15s}#cloth-calc-btn:hover{background:#1d4ed8}#cloth-calc-btn:active{transform:scale(.97)}#cloth-calc-btn svg{width:14px;height:14px;stroke:#fff;fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}#cloth-calc-result{margin-top:12px;animation:clothIn .3s ease}@keyframes clothIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}#cloth-calc-result.error{background:#450a0a44;border:1.5px solid #ef444455;border-radius:12px;padding:12px 14px;display:flex;align-items:flex-start;gap:8px}#cloth-calc-result.error svg{width:15px;height:15px;stroke:#f87171;fill:none;stroke-width:2;flex-shrink:0;margin-top:1px}#cloth-calc-result.error span{font-size:12px;color:#f87171;line-height:1.5}#cloth-calc-success{background:#052e1644;border:1.5px solid #22c55e44;border-radius:12px;padding:14px 16px}#cloth-calc-success-header{display:flex;align-items:center;gap:6px;margin-bottom:6px}#cloth-calc-success-header svg{width:14px;height:14px;stroke:#4ade80;fill:none;stroke-width:2.5}#cloth-calc-success-header span{font-size:10px;font-weight:700;text-transform:uppercase;color:#4ade80;letter-spacing:.08em}#cloth-calc-dims{font-size:11px;color:#94a3b8;margin-bottom:4px}#cloth-calc-price{font-size:32px;font-weight:900;color:#fff;letter-spacing:-.03em;line-height:1}#cloth-calc-rule{font-size:10px;color:#64748b;margin-top:4px;display:flex;align-items:center;gap:4px}#cloth-calc-rule svg{width:10px;height:10px;stroke:#64748b;fill:none;stroke-width:2}#cloth-calc-wa-btn{margin-top:12px;width:100%;padding:12px;background:linear-gradient(90deg,#16a34a,#15803d);border:none;border-radius:12px;font-size:13px;font-weight:800;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;letter-spacing:.04em;text-decoration:none;transition:opacity .2s,transform .15s}#cloth-calc-wa-btn:hover{opacity:.9}#cloth-calc-wa-btn:active{transform:scale(.97)}#cloth-calc-wa-btn svg{width:16px;height:16px;fill:#fff}#cloth-calc-hint,#cloth-calc-footer{text-align:center;font-size:10px;color:#475569;margin-top:8px}</style>'+
    '<div id="cloth-calc-header"><div id="cloth-calc-icon"><svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></div><div><p id="cloth-calc-title">Calcule sua Medida</p><p id="cloth-calc-subtitle">Gramatura '+GRAMATURA+' · Sob encomenda</p></div></div><div id="cloth-calc-inputs"><div class="cloth-calc-field"><label><svg viewBox="0 0 24 24"><line x1="5" y1="3" x2="5" y2="21"/><line x1="19" y1="3" x2="19" y2="21"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Altura (m)</label><input id="cloth-calc-alt" type="text" inputmode="decimal" placeholder="ex: 1,70"></div><div class="cloth-calc-field"><label><svg viewBox="0 0 24 24"><line x1="3" y1="5" x2="21" y2="5"/><line x1="3" y1="19" x2="21" y2="19"/><line x1="12" y1="5" x2="12" y2="19"/></svg>Largura (m)</label><input id="cloth-calc-larg" type="text" inputmode="decimal" placeholder="ex: 2,50"></div></div><button id="cloth-calc-btn"><svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>CALCULAR PREÇO</button><div id="cloth-calc-result" style="display:none"></div><p id="cloth-calc-footer">Dimensões aceitas: até 3,00m por lado</p>';
    return d;
  }

  function render(c,a,l){var el=document.getElementById('cloth-calc-result');el.style.display='block';el.className='';if(c.e){el.className='error';el.innerHTML='<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span>'+c.e+'</span>';return;}var n=(document.querySelector('h1.js-product-name,h1[itemprop="name"],.product-name h1,h1')||{textContent:'Produto sob medida'}).textContent.trim();var msg=encodeURIComponent('🖼 *Pedido de Medida Personalizada*\\n\\n📦 Produto: '+n+'\\n📐 Medida: '+dim(a)+' × '+dim(l)+'\\n🧵 Gramatura: '+GRAMATURA+'\\n💰 Valor: '+brl(c.p)+'\\n\\nGostaria de confirmar este pedido!');el.innerHTML='<div id="cloth-calc-success"><div id="cloth-calc-success-header"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg><span>Preço Calculado</span></div><p id="cloth-calc-dims">'+dim(a)+' × '+dim(l)+' · '+GRAMATURA+'</p><p id="cloth-calc-price">'+brl(c.p)+'</p><p id="cloth-calc-rule"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>'+(c.r==='A'?'Regra A — dimensão menor que 1,56m':'Regra B — ambas entre 1,56m e 3,00m')+'</p></div><a id="cloth-calc-wa-btn" href="https://wa.me/'+WHATSAPP_NUMBER+'?text='+msg+'" target="_blank" rel="noopener"><svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>SOLICITAR VIA WHATSAPP</a><p id="cloth-calc-hint">Você será direcionado ao WhatsApp.</p>';}
  function bind(){var b=document.getElementById('cloth-calc-btn');if(!b)return;b.addEventListener('click',function(){var a=parseFloat((document.getElementById('cloth-calc-alt').value||'').replace(',','.'));var l=parseFloat((document.getElementById('cloth-calc-larg').value||'').replace(',','.'));if(isNaN(a)||isNaN(l)){render({e:'Preencha altura e largura (ex: 1,70).'},0,0);return;}render(calc(a,l),a,l);});['cloth-calc-alt','cloth-calc-larg'].forEach(function(id){var el=document.getElementById(id);if(el)el.addEventListener('keydown',function(e){if(e.key==='Enter')b.click();document.getElementById('cloth-calc-result').style.display='none';});});}
  function findTarget(){var sel=['.js-product-variants','.product-variants','[data-variants]','.product__variants','.js-add-to-cart','[data-add-to-cart]','.js-buy-form','[data-product-form]','.product-buy','.product__actions','.product-form'];for(var i=0;i<sel.length;i++){var el=document.querySelector(sel[i]);if(el)return el;}return null;}
  function inject(){if(!isProductPage())return;if(document.getElementById('cloth-calc-widget'))return;var t=findTarget();if(!t)t=document.querySelector('[itemprop="price"],.product-price,.price');if(!t)return;var w=html();t.nextSibling?t.parentNode.insertBefore(w,t.nextSibling):t.parentNode.appendChild(w);bind();}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',inject):inject();
  setTimeout(inject,1500);
})();`;

  res.send(jsContent);
});

// 2. ENDPOINT INTERNO: Para o Painel Salvar as Configurações Cloud
app.get('/api/store-script-settings', (req, res) => {
  res.json(getScriptSettings());
});

app.post('/api/store-script-settings', (req, res) => {
  const { enabled, whatsapp } = req.body;
  saveScriptSettings({ enabled, whatsapp });
  res.json({ success: true });
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
    
    console.log(`[Sync] Tentando injetar script: ${scriptSrc} na loja ${STORE_ID}`);

    // 1. Limpa anterior se existir
    const getRes = await apiClient.get('/scripts');
    const scriptsList = Array.isArray(getRes.data) ? getRes.data : [];
    const myScript = scriptsList.find(s => s.name === 'Calculadora_Cloth_Sublimacao');
    if (myScript) {
       console.log("[Sync] Script antigo encontrado! Tentando deletar. ID:", myScript.id);
       try {
           await apiClient.delete('/scripts/' + myScript.id);
           console.log("[Sync] Deletado com sucesso.");
       } catch (err) {
           console.error("[Sync] Erro ao deletar o script antigo:", err.response?.data || err.message);
       }
    } else {
       console.log("[Sync] Nenhum script antigo encontrado com este nome.");
    }

    // 2. Cria referenciando a nova URL na nuvem!
    console.log("[Sync] Criando script com src:", scriptSrc);
    try {
        const response = await apiClient.post('/scripts', {
          src: scriptSrc,
          event: 'onload',
          where: 'store',
          name: 'Calculadora_Cloth_Sublimacao'
        });
        console.log("[Sync] Script criado com sucesso:", response.data.id);
        res.json({ success: true, script: response.data, scriptUrl: scriptSrc });
    } catch (err) {
        console.error("[Sync] Erro ao criar o script novo:", err.response?.data || err.message);
        throw err;
    }
  } catch (error) {
    console.error('Erro POST store-script Cloud:', error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

// Remove a versão local antiga de store-script porque vamos gerenciar via nuvem
app.delete('/api/store-script', async (req, res) => {
  try {
    const getRes = await apiClient.get('/scripts');
    const scriptsList = Array.isArray(getRes.data) ? getRes.data : [];
    const myScript = scriptsList.find(s => s.name === 'Calculadora_Cloth_Sublimacao');
    if (myScript) {
       await apiClient.delete('/scripts/' + myScript.id);
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

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Bypass self-signed SSL errors if any
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runSync() {
  console.log('🔄 Iniciando Sincronização Inicial de Dados (Produtos e Vendas dos últimos 2 meses)...');

  // 1. Obter credenciais
  let storeId = process.env.TIENDANUBE_STORE_ID;
  let accessToken = process.env.TIENDANUBE_ACCESS_TOKEN;

  try {
    const { data: stores } = await supabase.from('stores').select('*');
    if (stores && stores.length > 0) {
      storeId = String(stores[0].id);
      accessToken = stores[0].access_token;
      console.log(`📌 Usando credenciais do banco: Loja ${storeId}`);
    } else {
      console.log(`📌 Usando credenciais do .env: Loja ${storeId}`);
    }
  } catch (err) {
    console.warn('⚠️ Não foi possível obter credenciais do Supabase, usando .env.', err.message);
  }

  const client = axios.create({
    baseURL: `https://api.tiendanube.com/v1/${storeId}`,
    headers: {
      'Authentication': `bearer ${accessToken}`,
      'User-Agent': 'AIManager/1.0',
      'Content-Type': 'application/json'
    }
  });

  // ==========================================
  // A. SINCRONIZAR PRODUTOS (TODOS)
  // ==========================================
  console.log('\n📦 [1/2] Sincronizando Produtos...');
  let pPage = 1;
  let pHasMore = true;
  let productsSaved = 0;

  while (pHasMore) {
    try {
      console.log(`  -> Buscando página ${pPage} de produtos...`);
      const response = await client.get('/products', { params: { per_page: 200, page: pPage } });
      const products = response.data || [];

      if (products.length === 0) {
        pHasMore = false;
        break;
      }

      const upsertData = products.map(product => {
        const name = typeof product.name === 'object' ? (product.name.pt || product.name.es || product.name.en || '') : String(product.name || '');
        return {
          id: String(product.id),
          store_id: String(storeId),
          name: name,
          sku: product.variants?.[0]?.sku || null,
          price: parseFloat(product.variants?.[0]?.price || 0),
          tags: product.tags || null,
          created_at: product.created_at,
          updated_at: product.updated_at,
          raw_data: product
        };
      });

      const { error } = await supabase.from('nuvemshop_products').upsert(upsertData, { onConflict: 'id' });
      if (error) {
        console.error('❌ Erro ao salvar produtos no Supabase:', error);
        pHasMore = false;
        break;
      }

      productsSaved += products.length;
      console.log(`  ✅ Salvos ${products.length} produtos (Total até agora: ${productsSaved})`);

      if (products.length < 200) {
        pHasMore = false;
      } else {
        pPage++;
      }
    } catch (err) {
      console.error('❌ Erro na busca de produtos:', err.response?.data || err.message);
      pHasMore = false;
    }
  }

  // ==========================================
  // B. SINCRONIZAR PEDIDOS (ÚLTIMOS 2 MESES)
  // ==========================================
  console.log('\n🛍️ [2/2] Sincronizando Pedidos (Últimos 2 Meses)...');
  const date2MonthsAgo = new Date();
  date2MonthsAgo.setMonth(date2MonthsAgo.getMonth() - 2);
  const minDateStr = date2MonthsAgo.toISOString().split('T')[0];
  console.log(`📅 Buscando pedidos criados desde: ${minDateStr}`);

  let oPage = 1;
  let oHasMore = true;
  let ordersSaved = 0;

  while (oHasMore) {
    try {
      console.log(`  -> Buscando página ${oPage} de pedidos...`);
      const response = await client.get('/orders', { 
        params: { 
          per_page: 200, 
          page: oPage,
          created_at_min: `${minDateStr}T00:00:00-03:00`
        } 
      });
      const orders = response.data || [];

      if (orders.length === 0) {
        oHasMore = false;
        break;
      }

      const upsertData = orders.map(order => {
        return {
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
        };
      });

      const { error } = await supabase.from('nuvemshop_orders').upsert(upsertData, { onConflict: 'id' });
      if (error) {
        console.error('❌ Erro ao salvar pedidos no Supabase:', error);
        oHasMore = false;
        break;
      }

      ordersSaved += orders.length;
      console.log(`  ✅ Salvos ${orders.length} pedidos (Total até agora: ${ordersSaved})`);

      if (orders.length < 200) {
        oHasMore = false;
      } else {
        oPage++;
      }
    } catch (err) {
      console.error('❌ Erro na busca de pedidos:', err.response?.data || err.message);
      oHasMore = false;
    }
  }

  console.log('\n🎉 Sincronização Inicial Concluída com Sucesso!');
  console.log(`📊 Resumo: ${productsSaved} Produtos e ${ordersSaved} Pedidos sincronizados.`);
}

runSync();

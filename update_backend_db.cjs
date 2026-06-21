const fs = require('fs');

let backend = fs.readFileSync('backend.js', 'utf8');

// 1. ADICIONAR ROTA DE WEBHOOK GERAL
const newWebhookRoute = `
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

    console.log(\`\n🔔 [Webhook] Recebido evento "\${event}" (ID: \${id}) para a loja \${storeId}\`);

    try {
        const client = await getApiClient(storeId);

        if (event.startsWith('product/')) {
            // Buscar produto na Nuvemshop
            const response = await client.get(\`/products/\${id}\`);
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

            console.log(\`  ✅ Produto \${id} atualizado no Supabase via Webhook.\`);
            
            // Logar no histórico se for criação para manter compatibilidade com Instagram
            if (event === 'product/created') {
                await addWebhookLog({ storeId, event, productId: id, status: 'Processing', details: 'Novo produto criado. Iniciando publicação automatizada...' });
                // Dispara fluxo do instagram
                try {
                    const settings = await getMarketingSettings(storeId);
                    if (settings && settings.instagram_enabled) {
                        const publishRes = await publishProductToInstagram(product, settings, storeId);
                        await updateWebhookLog(id, 'Success', \`Publicado no Instagram: \${publishRes.id || 'OK'}\`);
                    } else {
                        await updateWebhookLog(id, 'Success', 'Automação desativada nas configurações.');
                    }
                } catch (err) {
                    await updateWebhookLog(id, 'Error', err.message);
                }
            }

        } else if (event.startsWith('order/')) {
            // Buscar pedido na Nuvemshop
            const response = await client.get(\`/orders/\${id}\`);
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

            console.log(\`  ✅ Pedido \${id} (\${order.number}) atualizado no Supabase via Webhook.\`);
            
            // Se o pedido foi pago, invalidar cache de comissões e financeiro
            if (order.payment_status === 'paid') {
                await supabase.from('api_cache').delete().eq('key', \`\${storeId}_commissions_report\`);
                await supabase.from('api_cache').delete().eq('key', \`\${storeId}_profit_stats\`);
                await supabase.from('api_cache').delete().eq('key', \`\${storeId}_stats\`);
            }
        }
    } catch (err) {
        console.error(\`❌ [Webhook Error] Erro ao processar evento \${event} (ID: \${id}):\`, err.response?.data || err.message);
    }
});
`;

// Insert general webhook route before '/api/webhooks/product-created'
if (!backend.includes('/api/webhooks/nuvemshop')) {
    backend = backend.replace("app.post('/api/webhooks/product-created', async (req, res) => {", newWebhookRoute + "\napp.post('/api/webhooks/product-created', async (req, res) => {");
}

// 2. ATUALIZAR WEBHOOKS REGISTER PARA CADASTRAR PEDIDOS E PRODUTOS NO NOVO ENDPOINT
const newWebhookRegister = `        // URL pública do AI Manager (Render)
        const webhookUrl = \`\${PUBLIC_URL}/api/webhooks/nuvemshop\`;
        console.log(\`[Webhook] Verificando existência na URL: \${webhookUrl}\`);

        // Consulta webhooks existentes
        const listRes = await axios.get(
            \`https://api.tiendanube.com/v1/\${storeId}/webhooks\`,
            { headers: { 'Authentication': \`bearer \${storeData.access_token}\`, 'User-Agent': 'AIManager/1.0' } }
        );
        const existingWebhooks = listRes.data || [];
        
        // Limpa webhooks antigos
        for (const wh of existingWebhooks) {
            if (wh.url.includes('/api/webhooks/') || wh.url === webhookUrl) {
                console.log(\`[Webhook] Removendo antigo: \${wh.id} (\${wh.event})\`);
                await axios.delete(\`https://api.tiendanube.com/v1/\${storeId}/webhooks/\${wh.id}\`, {
                    headers: { 'Authentication': \`bearer \${storeData.access_token}\`, 'User-Agent': 'AIManager/1.0' }
                });
            }
        }

        // Registra todos os eventos necessários (Produtos e Pedidos)
        const events = ['product/created', 'product/updated', 'order/created', 'order/updated', 'order/paid'];
        const results = [];

        for (const event of events) {
            console.log(\`[Webhook] Registrando novo evento: \${event}\`);
            const res = await axios.post(
                \`https://api.tiendanube.com/v1/\${storeId}/webhooks\`,
                { event, url: webhookUrl },
                { headers: { 'Authentication': \`bearer \${storeData.access_token}\`, 'User-Agent': 'AIManager/1.0', 'Content-Type': 'application/json' } }
            );
            results.push(res.data);
        }`;

const oldRegisterStart = "        // URL pública do AI Manager (Render)";
const oldRegisterEnd = "            results.push(res.data);\n        }";

const registerStartIndex = backend.indexOf(oldRegisterStart);
const registerEndIndex = backend.indexOf(oldRegisterEnd);

if (registerStartIndex !== -1 && registerEndIndex !== -1) {
    backend = backend.substring(0, registerStartIndex) + newWebhookRegister + backend.substring(registerEndIndex + oldRegisterEnd.length);
}

// 3. REESCREVER ENDPOINT DE STATS (DASHBOARD)
const statsStart = "// Dashboard Stats\napp.get('/api/stats', requireAuth, cacheMiddleware('stats', 5), async (req, res) => {";
const statsEnd = "    res.status(500).json({ error: 'Erro ao conectar com a Nuvemshop. Verifique o Token.' });\n  }\n});";

const statsStartIndex = backend.indexOf(statsStart);
const statsEndIndex = backend.indexOf(statsEnd);

const newStatsRoute = `// Dashboard Stats (Leitura do Banco Supabase)
app.get('/api/stats', requireAuth, cacheMiddleware('stats', 5), async (req, res) => {
  const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
  try {
    const [prodCountRes, ordersRes, storeRes, automationsCountRes, queueCountRes, automationLogsRes] = await Promise.all([
      supabase.from('nuvemshop_products').select('*', { count: 'exact', head: true }).eq('store_id', storeId),
      supabase.from('nuvemshop_orders').select('raw_data').eq('store_id', storeId).eq('payment_status', 'paid'),
      supabase.from('stores').select('id').eq('id', storeId).single(),
      supabase.from('automation_history').select('*', { count: 'exact', head: true }).eq('store_id', storeId),
      supabase.from('post_queue').select('*', { count: 'exact', head: true }).eq('store_id', storeId).eq('status', 'pending'),
      supabase.from('automation_history').select('*').eq('store_id', storeId).order('created_at', { ascending: false }).limit(5)
    ]);

    const paidOrders = (ordersRes.data || []).map(o => o.raw_data);
    const totalSales = paidOrders.reduce((acc, order) => {
      const total = parseFloat(order.total || 0);
      const shipping = parseFloat(order.shipping_cost_customer || 0);
      return acc + (total - shipping);
    }, 0);

    res.json({
      storeName: 'Cloth Sublimação',
      productsCount: prodCountRes.count || 0,
      ordersCount: paidOrders.length,
      totalSales: totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      recentOrders: paidOrders.slice(0, 5),
      automationLogs: (automationLogsRes.data || []).map(log => ({
        ...log,
        ts: log.created_at,
        productName: log.product_name || \`ID: \${log.product_id}\`
      })),
      automationsCount: automationsCountRes.count || 0,
      queueCount: queueCountRes.count || 0,
      customersCount: 42
    });
  } catch (error) {
    console.error('Erro ao processar estatísticas:', error.message);
    res.status(500).json({ error: 'Erro ao obter estatísticas locais.' });
  }
});`;

if (statsStartIndex !== -1 && statsEndIndex !== -1) {
    backend = backend.substring(0, statsStartIndex) + newStatsRoute + backend.substring(statsEndIndex + statsEnd.length);
}

// 4. REESCREVER PROFIT STATS (FINANCEIRO)
const profitStart = "    // Buscar pedidos PAGOS no período\n    let allOrders = [];";
const profitEnd = "      } else {\n        allOrders = allOrders.concat(ordersData);\n        if (ordersData.length < 200) oHasMore = false;\n        else oPage++;\n        if (oPage > 500) oHasMore = false;\n      }\n    }";

const profitStartIndex = backend.indexOf(profitStart);
const profitEndIndex = backend.indexOf(profitEnd);

const newProfitOrdersFetch = `    // Buscar pedidos PAGOS no período direto do Supabase
    const { data: dbOrders, error: dbError } = await supabase
      .from('nuvemshop_orders')
      .select('raw_data')
      .eq('store_id', storeId)
      .eq('payment_status', 'paid')
      .gte('created_at', \`\${startDate}T00:00:00-03:00\`)
      .lte('created_at', \`\${endDate}T23:59:59-03:00\`);

    if (dbError) throw dbError;
    const allOrders = (dbOrders || []).map(o => o.raw_data);`;

if (profitStartIndex !== -1 && profitEndIndex !== -1) {
    backend = backend.substring(0, profitStartIndex) + newProfitOrdersFetch + backend.substring(profitEndIndex + profitEnd.length);
}

// 5. REESCREVER ORDERS LIST
const ordersStart = "// Vendas (Orders)\napp.get('/api/orders', requireAuth, cacheMiddleware(";
const ordersEnd = "app.get('/api/orders/:id', requireAuth, async (req, res) => {\n  const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;\n  const client = await getApiClient(storeId);\n  try {\n    const response = await client.get(`/orders/${req.params.id}`);\n    res.json(response.data);\n  } catch (error) {\n    res.status(500).json({ error: error.message });\n  }\n});";

const ordersStartIndex = backend.indexOf(ordersStart);
const ordersEndIndex = backend.indexOf(ordersEnd);

const newOrdersRoutes = `// Vendas (Orders)
app.get('/api/orders', requireAuth, cacheMiddleware(req => 'orders_p' + (req.query.page || 1) + '_s' + (req.query.status || 'all'), 5), async (req, res) => {
  const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
  try {
    const { data: orders, error } = await supabase
      .from('nuvemshop_orders')
      .select('raw_data')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json((orders || []).map(o => o.raw_data));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/orders/:id', requireAuth, async (req, res) => {
  const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
  try {
    const { data: order, error } = await supabase
      .from('nuvemshop_orders')
      .select('raw_data')
      .eq('id', req.params.id)
      .single();

    if (error || !order) {
      // Fallback
      const client = await getApiClient(storeId);
      const response = await client.get(\`/orders/\${req.params.id}\`);
      return res.json(response.data);
    }
    res.json(order.raw_data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});`;

if (ordersStartIndex !== -1 && ordersEndIndex !== -1) {
    backend = backend.substring(0, ordersStartIndex) + newOrdersRoutes + backend.substring(ordersEndIndex + ordersEnd.length);
}

// 6. REESCREVER PRODUCTS LIST
const productsStart = "// Produtos (Products) com Paginação e Busca\napp.get('/api/products', requireAuth, cacheMiddleware(";
const productsEnd = "app.get('/api/products/:id', requireAuth, async (req, res) => {\n  const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;\n  const client = await getApiClient(storeId);\n  try {\n    const response = await client.get(`/products/${req.params.id}`);\n    res.json(response.data);\n  } catch (error) {\n    res.status(500).json({ error: error.message });\n  }\n});";

const productsStartIndex = backend.indexOf(productsStart);
const productsEndIndex = backend.indexOf(productsEnd);

const newProductsRoutes = `// Produtos (Products) com Paginação e Busca
app.get('/api/products', requireAuth, cacheMiddleware(req => 'products_p' + (req.query.page || 1), 5), async (req, res) => {
  const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
  try {
    const { page = 1, per_page = 24, q = '' } = req.query;
    
    let query = supabase
      .from('nuvemshop_products')
      .select('raw_data', { count: 'exact' })
      .eq('store_id', storeId);

    if (q) {
      query = query.ilike('name', \`%\${q}%\`);
    }

    const from = (parseInt(page) - 1) * parseInt(per_page);
    const to = from + parseInt(per_page) - 1;

    const { data: products, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    res.json({
      products: (products || []).map(p => p.raw_data),
      total: count || 0,
      page: parseInt(page),
      per_page: parseInt(per_page)
    });
  } catch (error) {
    console.error('Erro ao buscar produtos:', error.message);
    res.status(500).json({ error: 'Falha ao carregar catálogo' });
  }
});

app.get('/api/products/:id', requireAuth, async (req, res) => {
  const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
  try {
    const { data: product, error } = await supabase
      .from('nuvemshop_products')
      .select('raw_data')
      .eq('id', req.params.id)
      .single();

    if (error || !product) {
      // Fallback
      const client = await getApiClient(storeId);
      const response = await client.get(\`/products/\${req.params.id}\`);
      return res.json(response.data);
    }
    res.json(product.raw_data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});`;

if (productsStartIndex !== -1 && productsEndIndex !== -1) {
    backend = backend.substring(0, productsStartIndex) + newProductsRoutes + backend.substring(productsEndIndex + productsEnd.length);
}

// 7. REESCREVER COMMISSIONS REPORT
const commReportStart = "  try {\n    // 1. Obter produtos com a tag aline-martins";
const commReportEnd = "    res.json({\n      pendingAmount,\n      itemsCount,\n      ordersCount,\n      startDate,\n      endDate,\n      pendingOrders\n    });\n  } catch (error) {";

const commReportStartIndex = backend.indexOf(commReportStart);
const commReportEndIndex = backend.indexOf(commReportEnd);

const newCommReportLogic = `  try {
    // 1. Obter produtos com a tag aline-martins diretamente do Supabase
    const { data: alineProducts, error: prodErr } = await supabase
      .from('nuvemshop_products')
      .select('id')
      .eq('store_id', storeId)
      .ilike('tags', '%aline%');

    if (prodErr) throw prodErr;

    const alineProductIds = (alineProducts || []).map(p => String(p.id));
    if (alineProductIds.length === 0) {
      return res.json({
        pendingAmount: 0,
        itemsCount: 0,
        ordersCount: 0,
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        pendingOrders: []
      });
    }

    // 2. Buscar último pagamento
    const { data: lastPayment, error: payErr } = await supabase
      .from('commissions_history')
      .select('end_date')
      .eq('store_id', storeId)
      .order('end_date', { ascending: false })
      .limit(1)
      .single();

    let startDate = '2025-02-15T00:00:00-03:00';
    if (!payErr && lastPayment && lastPayment.end_date) {
      startDate = lastPayment.end_date;
    }

    // 3. Buscar pedidos pagos criados após a startDate direto do Supabase
    const { data: dbOrders, error: ordErr } = await supabase
      .from('nuvemshop_orders')
      .select('raw_data')
      .eq('store_id', storeId)
      .eq('payment_status', 'paid')
      .gt('created_at', startDate);

    if (ordErr) throw ordErr;
    const paidOrders = (dbOrders || []).map(o => o.raw_data);

    let pendingAmount = 0;
    let itemsCount = 0;
    let ordersCount = 0;
    const pendingOrders = [];
    const endDate = new Date().toISOString();

    for (const order of paidOrders) {
      const lineItems = order.products || order.line_items || [];
      let commissionProductsInOrder = 0;
      const matchingItems = [];

      for (const item of lineItems) {
        if (alineProductIds.includes(String(item.product_id))) {
          const qty = parseInt(item.quantity || 1);
          commissionProductsInOrder += qty;
          matchingItems.push({
            name: item.name,
            quantity: qty,
            price: parseFloat(item.price || 0)
          });
        }
      }

      if (commissionProductsInOrder > 0) {
        ordersCount++;
        itemsCount += commissionProductsInOrder;
        pendingAmount += commissionProductsInOrder * 50.00;
        pendingOrders.push({
          id: order.id,
          number: order.number,
          customer_name: order.customer?.name || 'Cliente',
          created_at: order.created_at,
          total: parseFloat(order.total || 0),
          commission: commissionProductsInOrder * 50.00,
          items: matchingItems
        });
      }
    }

    res.json({
      pendingAmount,
      itemsCount,
      ordersCount,
      startDate,
      endDate,
      pendingOrders
    });
  } catch (error) {`;

if (commReportStartIndex !== -1 && commReportEndIndex !== -1) {
    backend = backend.substring(0, commReportStartIndex) + newCommReportLogic + backend.substring(commReportEndIndex + commReportEnd.length);
}

// Write file back
fs.writeFileSync('backend.js', backend);
console.log('Backend successfully migrated to Supabase Database Reading!');

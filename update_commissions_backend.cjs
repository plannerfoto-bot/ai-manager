const fs = require('fs');

let backend = fs.readFileSync('backend.js', 'utf8');

const startStr = "app.get('/api/commissions-report', requireAuth, async (req, res) => {";
const endStr = "// IA Engine - Geração Massiva";

const startIndex = backend.indexOf(startStr);
const endIndex = backend.indexOf(endStr);

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find block");
  process.exit(1);
}

const newEndpoints = `
// ==========================================
// GERENCIADOR DE COMISSÕES ALINE MARTINS
// ==========================================

const COMMISSION_VALUE = 50.00;

// Busca comissões pendentes (após a última data paga)
app.get('/api/commissions/pending', requireAuth, async (req, res) => {
  const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
  const client = await getApiClient(storeId);
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

    // 2. Buscar todos os produtos com a tag 'Aline Martins'
    let targetProductIds = new Set();
    let pPage = 1;
    let pHasMore = true;
    while(pHasMore) {
      try {
        const pRes = await client.get('/products', { params: { q: 'aline martins', per_page: 200, page: pPage } });
        const prods = pRes.data || [];
        if (prods.length === 0) {
          pHasMore = false;
        } else {
          prods.forEach(p => {
            if (p.tags && p.tags.toLowerCase().includes('aline martins')) {
              targetProductIds.add(p.id);
            }
          });
          if (prods.length < 200) pHasMore = false;
          else pPage++;
        }
      } catch (err) {
        console.error('Erro buscar produtos:', err.message);
        pHasMore = false;
      }
    }

    if (targetProductIds.size === 0) {
      return res.json({ pendingAmount: 0, itemsCount: 0, ordersCount: 0, startDate: lastPaidAt, endDate: now, orders: [] });
    }

    // 3. Buscar pedidos criados APÓS o lastPaidAt
    let allOrders = [];
    let oPage = 1;
    let oHasMore = true;
    while (oHasMore) {
      const params = { per_page: 200, page: oPage, payment_status: 'paid' };
      if (lastPaidAt) params.created_at_min = lastPaidAt;
      
      try {
        const response = await client.get('/orders', { params });
        const orders = response.data || [];
        if (orders.length === 0) {
          oHasMore = false;
        } else {
          allOrders = allOrders.concat(orders);
          if (orders.length < 200) oHasMore = false;
          else oPage++;
        }
      } catch (err) {
         console.error('Erro buscar pedidos:', err.message);
         oHasMore = false;
      }
    }

    let reportData = [];
    let totalCommission = 0;
    let totalItems = 0;

    for (const order of allOrders) {
      if (!order.products || order.products.length === 0) continue;
      
      let collectionItemCount = 0;
      let collectionRevenue = 0;
      
      for (const item of order.products) {
        if (targetProductIds.has(item.product_id)) {
          const qty = parseInt(item.quantity || 1, 10);
          collectionItemCount += qty;
          collectionRevenue += (parseFloat(item.price || 0) * qty);
        }
      }

      if (collectionItemCount > 0) {
        const orderCommission = collectionItemCount * COMMISSION_VALUE;
        totalCommission += orderCommission;
        totalItems += collectionItemCount;

        reportData.push({
          orderId: order.id,
          orderNumber: order.number,
          customerName: order.customer ? order.customer.name : 'N/A',
          createdAt: order.created_at,
          status: order.status,
          collectionItemsSold: collectionItemCount,
          collectionRevenue: collectionRevenue,
          commissionValue: orderCommission
        });
      }
    }

    res.json({
      pendingAmount: totalCommission,
      itemsCount: totalItems,
      ordersCount: reportData.length,
      startDate: lastPaidAt,
      endDate: now,
      orders: reportData
    });
  } catch (error) {
    console.error('Error generating pending commissions:', error.message);
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

`;

const before = backend.slice(0, startIndex);
const after = backend.slice(endIndex);

fs.writeFileSync('backend.js', before + newEndpoints + after);
console.log("Backend updated!");

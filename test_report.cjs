require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const storeId = process.env.TIENDANUBE_STORE_ID || '2767708';

async function test() {
  try {
    console.log('1. Fetching products with tag aline...');
    const { data: alineProducts, error: prodErr } = await supabase
      .from('nuvemshop_products')
      .select('id')
      .eq('store_id', storeId)
      .ilike('tags', '%aline%');

    if (prodErr) throw prodErr;
    console.log(`Found ${alineProducts.length} products:`, alineProducts.map(p => p.id));

    const alineProductIds = (alineProducts || []).map(p => String(p.id));
    if (alineProductIds.length === 0) {
      console.log('No products found with tag "aline"');
      return;
    }

    console.log('2. Fetching last payment...');
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
    console.log('Start date:', startDate);

    console.log('3. Fetching orders...');
    const { data: dbOrders, error: ordErr } = await supabase
      .from('nuvemshop_orders')
      .select('raw_data')
      .eq('store_id', storeId)
      .eq('payment_status', 'paid')
      .gt('created_at', startDate);

    if (ordErr) throw ordErr;
    console.log(`Found ${dbOrders.length} paid orders since ${startDate}`);

    let pendingAmount = 0;
    let itemsCount = 0;
    let ordersCount = 0;
    const pendingOrders = [];

    const paidOrders = (dbOrders || []).map(o => o.raw_data);
    for (const order of paidOrders) {
      const lineItems = order.products || order.line_items || [];
      let commissionProductsInOrder = 0;

      for (const item of lineItems) {
        if (alineProductIds.includes(String(item.product_id))) {
          commissionProductsInOrder += parseInt(item.quantity || 1);
        }
      }

      if (commissionProductsInOrder > 0) {
        ordersCount++;
        itemsCount += commissionProductsInOrder;
        pendingAmount += commissionProductsInOrder * 50.00;
        pendingOrders.push({
          id: order.id,
          number: order.number,
          commission: commissionProductsInOrder * 50.00
        });
      }
    }

    console.log('Pending amount:', pendingAmount);
    console.log('Items count:', itemsCount);
    console.log('Orders count:', ordersCount);
    console.log('Pending orders detail:', pendingOrders);

  } catch (err) {
    console.error('❌ Error executing test:', err);
  }
}

test();

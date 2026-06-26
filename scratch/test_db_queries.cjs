require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const storeId = '2767708'; // Default store ID from backend config

async function run() {
  try {
    console.log('Testing Query 1 (Products):');
    const { data: dbProducts, error: pError } = await supabase
      .from('nuvemshop_products')
      .select('id, tags')
      .eq('store_id', storeId)
      .or('tags.ilike.%aline martins%,tags.ilike.%aline-martins%,tags.ilike.%alinemartins%');

    if (pError) {
      console.error('Query 1 Error:', pError);
    } else {
      console.log(`Query 1 Success: Found ${dbProducts.length} products`);
    }

    console.log('\nTesting Query 2 (Orders):');
    const { data: dbOrders, error: oError } = await supabase
      .from('nuvemshop_orders')
      .select('id, number, status, payment_status, customer, products, created_at')
      .eq('store_id', storeId)
      .eq('payment_status', 'paid')
      .gte('created_at', '2025-02-15T00:00:00Z')
      .order('created_at', { ascending: false });

    if (oError) {
      console.error('Query 2 Error:', oError);
    } else {
      console.log(`Query 2 Success: Found ${dbOrders.length} orders`);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
  }
}

run();

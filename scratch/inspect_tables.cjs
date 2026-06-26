require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    console.log('--- STORES ---');
    const { data: stores, error: sErr } = await supabase.from('stores').select('id, name, domain');
    if (sErr) console.error(sErr);
    else console.log(stores);

    console.log('\n--- CACHE KEYS ---');
    const { data: cache, error: cErr } = await supabase.from('api_cache').select('key, updated_at');
    if (cErr) console.error(cErr);
    else console.log(cache);
  } catch (err) {
    console.error(err);
  }
}

run();

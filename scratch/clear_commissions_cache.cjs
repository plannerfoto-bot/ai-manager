require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    console.log('Clearing commissions cache keys...');
    const { data, error } = await supabase
      .from('api_cache')
      .delete()
      .ilike('key', '%commissions_report%');

    if (error) console.error(error);
    else {
      console.log('Commissions cache keys cleared!');
    }
  } catch (err) {
    console.error(err);
  }
}

run();

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    const { data, error } = await supabase
      .from('api_cache')
      .select('*')
      .eq('key', '2767708_commissions_report')
      .single();

    if (error) console.error(error);
    else {
      console.log('Value type:', typeof data.value);
      console.log('Value:', JSON.stringify(data.value, null, 2));
    }
  } catch (err) {
    console.error(err);
  }
}

run();

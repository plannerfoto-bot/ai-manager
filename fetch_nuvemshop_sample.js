import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const storeId = process.env.TIENDANUBE_STORE_ID;
const token = process.env.TIENDANUBE_ACCESS_TOKEN;

async function fetchSample() {
  try {
    const res = await axios.get(`https://api.tiendanube.com/v1/${storeId}/products`, {
      params: { per_page: 5 },
      headers: { 
        'Authentication': `bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Shopee-Sync-Agent'
      }
    });

    fs.writeFileSync('sample_products.json', JSON.stringify(res.data, null, 2));
    console.log('Sample products saved to sample_products.json');
  } catch (err) {
    console.error('Error fetching from Nuvemshop:', err.response?.data || err.message);
  }
}

fetchSample();

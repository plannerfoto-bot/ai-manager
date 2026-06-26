require('dotenv').config();
const axios = require('axios');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const storeId = process.env.TIENDANUBE_STORE_ID || '2767708';
const token = process.env.TIENDANUBE_ACCESS_TOKEN || '454761d47b7ce42c4d539deb3025366ac8dbe358';

async function run() {
  const client = axios.create({
    baseURL: `https://api.tiendanube.com/v1/${storeId}`,
    headers: {
      'Authentication': `bearer ${token}`,
      'User-Agent': 'AIManager/1.0'
    }
  });

  try {
    const res = await client.get('/categories/39347400');
    console.log('Category details:', res.data);
  } catch (err) {
    console.error(err.message);
  }
}

run();

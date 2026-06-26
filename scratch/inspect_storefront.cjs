const axios = require('axios');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function run() {
  try {
    const res = await axios.get('https://www.fundofotograficocloth.com.br/produtos/?sort_by=created-descending', {
       headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const html = res.data;

    const index = html.indexOf('js-product-table');
    if (index !== -1) {
       console.log('Snippet around js-product-table:\n', html.substring(index - 50, index + 2000));
    }
  } catch (err) {
    console.error(err.message);
  }
}

run();

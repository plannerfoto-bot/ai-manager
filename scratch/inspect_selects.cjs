const axios = require('axios');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function run() {
  try {
    const res = await axios.get('https://www.fundofotograficocloth.com.br/', {
       headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const html = res.data;

    // Let's find any occurrences of "R$" in class attributes
    const regex = /<[^>]*class="[^"]*price[^"]*"[^>]*>/g;
    const matches = html.match(regex) || [];
    console.log('Price elements:', matches.slice(0, 10));

    // Let's find a snippet containing price values
    const matchVal = html.match(/R\$\s*\d+,\d+/g) || [];
    console.log('Price values matched:', matchVal.slice(0, 10));
    
    // Find the first price container
    if (matchVal.length > 0) {
      const idx = html.indexOf(matchVal[0]);
      console.log('Snippet around first price:\n', html.substring(idx - 150, idx + 150));
    }
  } catch (err) {
    console.error(err.message);
  }
}

run();

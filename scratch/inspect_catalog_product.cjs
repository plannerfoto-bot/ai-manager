const axios = require('axios');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function run() {
  try {
    const res = await axios.get('https://www.fundofotograficocloth.com.br/produtos/?q=AM29', {
       headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const html = res.data;

    // Find all occurrences of "am29" in lowercase
    let pos = 0;
    let occurrences = [];
    while (true) {
      const idx = html.toLowerCase().indexOf('am29', pos);
      if (idx === -1) break;
      occurrences.push(idx);
      pos = idx + 4;
    }
    console.log('Occurrences found:', occurrences);

    // Let's print snippets of the later occurrences (which are likely the product cards in the body)
    occurrences.forEach((idx, i) => {
       if (idx > 100000) {
          console.log(`\nOccurrence ${i} (Index: ${idx}):`);
          console.log(html.substring(idx - 400, idx + 600));
       }
    });
  } catch (err) {
    console.error(err.message);
  }
}

run();

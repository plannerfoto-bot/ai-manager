const https = require('https');

https.get('https://ai-manager-nuvemshop.onrender.com/api/script/v12345/true/5521964403083/script.js', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    // Procure pela variável isAlinePromoActiveOnStore no JS retornado
    const idx = data.indexOf('isAlinePromoActiveOnStore');
    if (idx !== -1) {
      console.log("Trecho encontrado:");
      console.log(data.substring(idx, idx + 100));
    } else {
      console.log("isAlinePromoActiveOnStore não encontrado.");
    }
  });
}).on('error', (err) => {
  console.error("Erro na requisição:", err.message);
});

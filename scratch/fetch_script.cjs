process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const https = require('https');
const fs = require('fs');
const path = require('path');

https.get('https://ai-manager-nuvemshop.onrender.com/api/script/v12345/true/5521964403083/script.js', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    fs.writeFileSync(path.join(__dirname, 'downloaded_script.js'), data);
    console.log("Script baixado com sucesso!");
  });
}).on('error', (err) => {
  console.error("Erro na requisição:", err.message);
});

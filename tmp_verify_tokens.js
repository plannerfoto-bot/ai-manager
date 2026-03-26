import axios from 'axios';

const tokens = [
  '454761d47b7ce42c4d539deb3025366ac8dbe358', // .env / current DB
  '2a3e3be7e1b928aec40b8de9b9bfedfc95c07f92'  // test-auth scripts
];
const storeId = '2767708';

async function verify() {
  for (const t of tokens) {
    console.log(`Testando token: ${t.substring(0, 10)}...`);
    try {
      const res = await axios.get(`https://api.tiendanube.com/v1/${storeId}/webhooks`, {
        headers: { 
          'Authentication': `bearer ${t}`,
          'User-Agent': 'AIManagerTest/1.0'
        }
      });
      console.log(`✅ SUCESSO com o token ${t.substring(0, 10)}! Status: ${res.status}`);
      process.exit(0);
    } catch (e) {
      console.log(`❌ FALHA com o token ${t.substring(0, 10)}: ${e.response?.status || e.message}`);
    }
  }
}

verify();

import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: fs.existsSync('../nuvemshop-mcp/.env') ? '../nuvemshop-mcp/.env' : '.env' });

const storeId = '2767708';
const token = process.env.NUVEMSHOP_ACCESS_TOKEN || '454761d478f17475fa42d'; // Fallback se tiver

async function test() {
  console.log(`Buscando carrinhos para a loja ${storeId}...`);
  try {
    const res = await axios.get(`https://api.tiendanube.com/v1/${storeId}/checkouts`, {
      params: { status: 'abandoned', per_page: 10 },
      headers: { 'Authentication': `bearer ${token}`, 'User-Agent': 'Test-Sync' }
    });
    console.log(`Sucesso! Encontrados ${res.data.length} carrinhos.`);
    if (res.data.length > 0) {
      console.log('Exemplo de ID:', res.data[0].id);
    }
  } catch (err) {
    console.error('Erro na API Nuvemshop:', err.response?.data || err.message);
  }
}

test();

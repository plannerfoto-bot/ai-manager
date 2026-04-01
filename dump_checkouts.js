
import axios from 'axios';
import fs from 'fs';
import path from 'path';

async function dumpCheckouts(ids) {
  const TIENDANUBE_ACCESS_TOKEN = '454761d47b7ce42c4d539deb3025366ac8dbe358';
  const TIENDANUBE_STORE_ID = '2767708';
  
  for (const id of ids) {
    try {
      const url = `https://api.tiendanube.com/v1/${TIENDANUBE_STORE_ID}/checkouts/${id}`;
      const res = await axios.get(url, {
        headers: {
          'Authentication': `bearer ${TIENDANUBE_ACCESS_TOKEN}`,
          'User-Agent': 'Vigilante (lucasxntos@gmail.com)'
        }
      });

      const filePath = path.join('C:\\Users\\Bigas\\NuvemShop - MCP - ANTIGRAVITY\\ai-manager', `checkout_${id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(res.data, null, 2));
      console.log(`Dumped ${id} to ${filePath}`);
    } catch (e) {
      console.error(`Error dumping ${id}:`, e.message);
    }
  }
}

dumpCheckouts(['1933242063', '1924114051', '1919864271', '1933405786']);

import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: fs.existsSync('../nuvemshop-mcp/.env') ? '../nuvemshop-mcp/.env' : '.env' });

const ACCESS_TOKEN = process.env.TIENDANUBE_ACCESS_TOKEN;
const STORE_ID = process.env.TIENDANUBE_STORE_ID;
const BASE_URL = process.env.TIENDANUBE_BASE_URL || "https://api.tiendanube.com/v1";

const apiClient = axios.create({
  baseURL: `${BASE_URL}/${STORE_ID}`,
  headers: {
    Authentication: `bearer ${ACCESS_TOKEN}`,
    "User-Agent": "AIOX-Manager (projeto@plannee.com.br)",
    "Content-Type": "application/json",
  },
});

async function run() {
  try {
    const getRes = await apiClient.get('/scripts');
    console.log("Existing scripts:", getRes.data.map(s => ({ id: s.id, name: s.name })));
    
    // Teste de Delete se existir
    const myScript = getRes.data.find(s => s.name === "Calculadora_Cloth_Sublimacao");
    if (myScript) {
        try {
            console.log("Deletando script antigo com ID: ", myScript.id);
            await apiClient.delete('/scripts/' + myScript.id);
            console.log("Deletado sucesso");
        } catch(e) {
            console.error("Erro deletando:", e.response ? e.response.data : e.message);
        }
    }

    // try to create one and see what happens
    console.log("Tentando criar script URL exemplo...");
    const res = await apiClient.post('/scripts', {
      src: "https://example.com/api/script.js",
      event: "onload",
      where: "store",
      name: "Calculadora_Cloth_Sublimacao"
    });
    console.log("Created:", res.data);
  } catch(e) {
    console.error("Erro geral:", e.response ? e.response.data : e.message);
  }
}
run();

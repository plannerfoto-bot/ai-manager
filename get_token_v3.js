import axios from 'axios';
import fs from 'fs';

async function getAccessToken(clientId, clientSecret, code) {
    const url = "https://www.tiendanube.com/apps/authorize/token";
    
    // Usando URLSearchParams para forçar application/x-www-form-urlencoded
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('code', code);
    params.append('grant_type', 'authorization_code');

    console.log("Enviando requisição para:", url);
    console.log("Dados:", params.toString());

    try {
        const response = await axios.post(url, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'CalculadoraCloth (felipe@clothsublimacao.com.br)'
            }
        });
        
        const result = response.data;
        if (result.access_token) {
            console.log("\n✅ SUCESSO ABSOLUTO!");
            console.log("Access Token:", result.access_token);
            console.log("Store ID:", result.user_id);
            
            const envContent = `TIENDANUBE_ACCESS_TOKEN=${result.access_token}\nTIENDANUBE_STORE_ID=${result.user_id}\nTIENDANUBE_BASE_URL=https://api.tiendanube.com/v1\nPORT=3001\n`;
            fs.writeFileSync('.env', envContent);
            
            // Também atualizar na pasta mcp
            try {
                fs.writeFileSync('../nuvemshop-mcp/.env', envContent);
                console.log("Arquivos .env atualizados em ambas as pastas!");
            } catch (e) {
                console.log("Apenas .env local atualizado.");
            }
            
            return result;
        } else {
            console.error("\n❌ Resposta inesperada:", result);
        }
    } catch (error) {
        console.error("\n❌ ERRO NA TROCA DO TOKEN:");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Dados:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

const clientId = "28353";
const clientSecret = "53fd680a9b442ac1fffea98076ee1868f17475fa42dd3a83";
const code = "4f9e1afac9af45e4f50a3d8d679ea96cb40e2073";

getAccessToken(clientId, clientSecret, code);

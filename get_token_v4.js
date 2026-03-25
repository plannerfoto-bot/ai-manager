import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';
import readline from 'readline';
import https from 'https';

// Carrega o .env local
dotenv.config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const httpsAgent = new https.Agent({ 
    rejectUnauthorized: false // Ignora erro de revogação/certificado para ativar
});

async function getAccessToken(code) {
    const clientId = process.env.NUVEMSHOP_APP_ID;
    const clientSecret = process.env.NUVEMSHOP_APP_SECRET;

    if (!clientId || !clientSecret) {
        console.error("\n❌ ERRO: NUVEMSHOP_APP_ID ou NUVEMSHOP_APP_SECRET não encontrados no .env!");
        process.exit(1);
    }

    const url = "https://www.tiendanube.com/apps/authorize/token";
    
    console.log(`\n[OAuth] Trocando código [${code}] por token...`);
    console.log(`[OAuth] Usando App ID: ${clientId}`);

    try {
        const response = await axios.post(url, {
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'authorization_code',
            code: code.trim()
        }, {
            httpsAgent,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'CalculadoraCloth (felipe@clothsublimacao.com.br)'
            }
        });
        
        const result = response.data;
        if (result.access_token) {
            console.log("\n✅ SUCESSO! TOKEN GERADO!");
            console.log("-----------------------------------------");
            console.log("Access Token:", result.access_token);
            console.log("Store ID:", result.user_id);
            console.log("-----------------------------------------");
            
            const envLines = [
                `TIENDANUBE_ACCESS_TOKEN=${result.access_token}`,
                `TIENDANUBE_STORE_ID=${result.user_id}`,
                `TIENDANUBE_BASE_URL=https://api.tiendanube.com/v1`,
                `NUVEMSHOP_APP_ID=${clientId}`,
                `NUVEMSHOP_APP_SECRET=${clientSecret}`,
                `PUBLIC_URL=https://ai-manager-nuvemshop.onrender.com`,
                `PORT=3001`
            ];
            
            const envContent = envLines.join('\n') + '\n';
            fs.writeFileSync('.env', envContent);
            
            try {
                fs.writeFileSync('../nuvemshop-mcp/.env', envContent);
                console.log("[OAuth] Arquivos .env sincronizados!");
            } catch(e) {}

            console.log("\n🚀 TUDO PRONTO! A CALCULADORA AGORA TEM ACESSO!");
            process.exit(0);
        }
    } catch (error) {
        console.error("\n❌ FALHA NA TROCA:");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Dados:", JSON.stringify(error.response.data, null, 2));
            if (error.response.data.error === 'invalid_grant') {
                console.log("\n⚠️ O código expirou ou já foi usado. Gere um NOVO código no link!");
            }
        } else {
            console.error("Erro Técnico:", error.message);
            console.log("\n⚠️ Verifique sua conexão ou se algum antivírus está bloqueando o acesso.");
        }
        process.exit(1);
    }
}

console.log("\n--- ATIVADOR DE CALCULADORA CLOTH ---");
console.log("(Modo de Compatibilidade de Rede Ativo)");
rl.question('Cole o Código de Autorização aqui (e dê ENTER): ', (code) => {
    if (!code) {
        console.log("Você não colou nada. Tente de novo.");
        process.exit(1);
    }
    getAccessToken(code);
});

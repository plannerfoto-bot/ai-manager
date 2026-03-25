import axios from 'axios';
import https from 'https';

const storeId = "2767708";
const token = "454761d47b7ce42c4d539deb3025366ac8dbe358";

const httpsAgent = new https.Agent({ 
    rejectUnauthorized: false 
});

async function run() {
    const client = axios.create({
        baseURL: `https://api.tiendanube.com/v1/${storeId}`,
        headers: {
            'Authentication': `bearer ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'CalculadoraCloth (felipe@clothsublimacao.com.br)'
        },
        httpsAgent
    });

    try {
        console.log("Consultando scripts existentes...");
        const response = await client.get('/scripts');
        
        // Trata diferentes formatos de lista da Nuvemshop
        let list = [];
        if (Array.isArray(response.data)) {
            list = response.data;
        } else if (response.data && Array.isArray(response.data.result)) {
            list = response.data.result;
        }

        console.log(`Encontrados ${list.length} scripts.`);

        for(const s of list) {
            if(s.src && s.src.includes('script.js')) {
                console.log(`Deletando script antigo ID: ${s.id}`);
                await client.delete(`/scripts/${s.id}`).catch(e => console.log("Erro ao deletar:", e.message));
            }
        }

        console.log("Injetando NOVO script...");
        const payload = {
            src: "https://ai-manager-nuvemshop.onrender.com/api/script.js",
            event: "onload",
            where: "store"
        };
        
        const installRes = await client.post("/scripts", payload);
        console.log("✅ SUCESSO! Script ID:", installRes.data.id);
        console.log("URL do Script:", installRes.data.src);
    } catch (error) {
        console.error("❌ ERRO NA OPERAÇÃO:");
        if (error.response) {
            console.error(JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

run();

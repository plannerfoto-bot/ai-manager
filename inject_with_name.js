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
            'Content-Type': 'application/json'
        },
        httpsAgent
    });

    try {
        console.log("Injetando NOVO script com NAME...");
        const payload = {
            name: "Calculadora de Medidas",
            src: "https://ai-manager-nuvemshop.onrender.com/api/script.js",
            event: "onload",
            where: "store"
        };
        
        const response = await client.post("/scripts", payload);
        console.log("✅ SUCESSO! Script ID:", response.data.id);
    } catch (error) {
        console.error("❌ ERRO NA INJEÇÃO:");
        console.error(JSON.stringify(error.response?.data || error.message, null, 2));
    }
}

run();

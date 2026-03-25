import axios from 'axios';
import https from 'https';

const storeId = "2767708";
const scriptId = "5554";
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
        console.log(`Ativando Script ${scriptId} com string JSON...`);
        const payload = {
            query_params: JSON.stringify({ v: "1.0.0" }), // Deve ser string JSON
            event: "onfirstinteraction",
            location: "store"
        };
        
        const response = await client.put(`/scripts/${scriptId}`, payload);
        console.log("✅ SUCESSO AO ATIVAR!");
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error("❌ ERRO AO ATIVAR:");
        if (error.response) {
            console.error(JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

run();

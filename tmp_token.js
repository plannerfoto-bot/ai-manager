import axios from 'axios';
import https from 'https';

const data = {
  client_id: "28353",
  client_secret: "53fd680a9b442ac1fffea98076ee1868f17475fa42dd3a83",
  grant_type: "authorization_code",
  code: "405a5f990f93ebd051f8b5487cfc7d8ddb211af2"
};

const httpsAgent = new https.Agent({ 
    rejectUnauthorized: false 
});

async function run() {
    try {
        console.log("Enviando POST para Nuvemshop...");
        const response = await axios.post("https://www.tiendanube.com/apps/authorize/token", data, {
            httpsAgent,
            headers: { 'Content-Type': 'application/json' }
        });
        console.log("RESULTADO_SUCESSO:" + JSON.stringify(response.data));
    } catch (error) {
        console.log("RESULTADO_ERRO:" + JSON.stringify(error.response?.data || error.message));
    }
}

run();

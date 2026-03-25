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
        const response = await client.get('/scripts');
        console.log("Scripts Atuais:", JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error(error.message);
    }
}

run();

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const storeId = process.env.TIENDANUBE_STORE_ID;
const token = process.env.TIENDANUBE_ACCESS_TOKEN;

async function listCategories() {
    try {
        console.log('🔍 Listando categorias da Nuvemshop...');
        const response = await axios.get(`https://api.tiendanube.com/v1/${storeId}/categories`, {
            headers: { 'Authentication': `bearer ${token}`, 'User-Agent': 'Shopee-Sync' }
        });
        
        response.data.forEach(cat => {
            console.log(`ID: ${cat.id} | Nome: ${cat.name.pt}`);
        });
    } catch (error) {
        console.error('❌ Erro:', error.response?.data || error.message);
    }
}

listCategories();

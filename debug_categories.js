import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const storeId = process.env.TIENDANUBE_STORE_ID;
const token = process.env.TIENDANUBE_ACCESS_TOKEN;

async function debugProducts() {
    try {
        console.log('🔍 Debugando categorias dos produtos...');
        const response = await axios.get(`https://api.tiendanube.com/v1/${storeId}/products`, {
            params: { page: 1, per_page: 5 },
            headers: { 'Authentication': `bearer ${token}`, 'User-Agent': 'Shopee-Sync' }
        });
        
        response.data.forEach(p => {
            console.log(`Produto: ${p.name.pt}`);
            console.log(`Categorias vinculadas:`, JSON.stringify(p.categories.map(c => ({ id: c.id, nome: c.name.pt }))));
            console.log('---');
        });
    } catch (error) {
        console.log('Erro no debug');
    }
}

debugProducts();

import axios from 'axios';

const TOKEN = '454761d47b7ce42c4d539deb3025366ac8dbe358';
const STORE_ID = '2767708';

const client = axios.create({
  baseURL: `https://api.tiendanube.com/v1/${STORE_ID}`,
  headers: {
    'Authentication': `bearer ${TOKEN}`,
    'Content-Type': 'application/json',
    'User-Agent': `AI-Manager-Bot (${STORE_ID})`
  }
});

async function test() {
  try {
    // 1. Pega 1 produto
    const res = await client.get('/products?per_page=1');
    const product = res.data[0];
    console.log("TESTANDO PRODUTO ID:", product.id);
    
    // 2. Mock do frontend payload
    const width = "3,5";
    const height = "3";
    const gramatura = "120g";
   
    const w = parseFloat(String(width).replace(',', '.'));
    const h = parseFloat(String(height).replace(',', '.'));
    const variantName = `${w.toFixed(2).replace('.', ',')}m x ${h.toFixed(2).replace('.', ',')}m - ${gramatura}`;
    
    // 3. Montar attributes
    let attributes = product.attributes || [];
    if (attributes.length === 0) {
      console.log("Produto nao tinha attributes, inserindo 'Medida Personalizada'");
      attributes = [{ pt: "Medida Personalizada" }];
      await client.put(`/products/${product.id}`, { attributes });
      // Pegar atualizado
      const recres = await client.get(`/products/${product.id}`);
      attributes = recres.data.attributes;
      product.variants = recres.data.variants;
    }
    
    // 4. Montar newValues
    let baseVariant = product.variants && product.variants.length > 0 ? product.variants[0] : null;
    let newValues = attributes.map((attr, idx) => {
      if (idx === 0) return { pt: variantName };
      return baseVariant && baseVariant.values && baseVariant.values[idx] 
        ? baseVariant.values[idx] 
        : { pt: "-" };
    });
    
    console.log("VALORES DA VARIANTE A SER ENVIADA:", JSON.stringify(newValues));
    
    const variantPayload = {
      price: "100.00",
      stock: 999,
      weight: baseVariant ? baseVariant.weight : 0.5,
      values: newValues
    };
    
    const postRes = await client.post(`/products/${product.id}/variants`, variantPayload);
    console.log("Deu certo!", postRes.data.id);
    
    // cleanup
    await client.delete(`/products/${product.id}/variants/${postRes.data.id}`);

  } catch (err) {
    console.log("ERRO REAL DA NUVEMSHOP:");
    console.log(JSON.stringify(err.response?.data, null, 2));
  }
}
test();

const axios = require('axios');
require('dotenv').config({ path: '../nuvemshop-mcp/.env' });
const apiClient = axios.create({
  baseURL: \`https://api.tiendanube.com/v1/\${process.env.TIENDANUBE_STORE_ID}\`,
  headers: {
    Authentication: \`bearer \${process.env.TIENDANUBE_ACCESS_TOKEN}\`
  }
});

async function run() {
  try {
    const res = await apiClient.post('/scripts', {
      content: '<script>console.log("Test MCP");</script>',
      event: 'onload',
      where: 'store',
      name: 'Calculadora Oculta Teste'
    });
    console.log("Success:", res.data);
    
    // Now delete it
    const id = res.data.id;
    await apiClient.delete(\`/scripts/\${id}\`);
    console.log("Deleted", id);
  } catch (err) {
    console.error("Error:", err.response ? err.response.data : err.message);
  }
}
run();

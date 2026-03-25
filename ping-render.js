import axios from 'axios';

async function pingRender() {
  try {
    const payload = {
      productId: 153407709, // id real
      width: "1,5",
      height: "1,5",
      gramatura: "120g"
    };

    console.log("Chamando a API do Render...");
    const res = await axios.post('https://ai-manager-nuvemshop.onrender.com/api/create-variant', payload, {
      headers: {
        'x-store-id': '2767708'
      }
    });

    console.log("SUCESSO:", res.data);
  } catch(e) {
    console.error("ERRO:", e.response?.data || e.message);
  }
}

pingRender();

import axios from 'axios';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

async function checkOrderStatus() {
  const TIENDANUBE_ACCESS_TOKEN = '454761d47b7ce42c4d539deb3025366ac8dbe358';
  const TIENDANUBE_STORE_ID = '2767708';
  
  let allOrders = [];
  let page = 1;
  
  while (page < 10) {
    const url = `https://api.tiendanube.com/v1/${TIENDANUBE_STORE_ID}/orders?page=${page}&per_page=50`;
    const res = await axios.get(url, {
      headers: {
        'Authentication': `bearer ${TIENDANUBE_ACCESS_TOKEN}`,
        'User-Agent': 'Vigilante (lucasxntos@gmail.com)'
      }
    });
    
    const data = res.data;
    if (data.length === 0) break;
    allOrders.push(...data);
    page++;
  }
  
  const targetOrders = allOrders.filter(o => {
    const n = parseInt(o.number, 10);
    return n >= 4413 && n <= 4428;
  }).sort((a, b) => parseInt(a.number, 10) - parseInt(b.number, 10));
  
  for (const o of targetOrders) {
    console.log(`Pedido #${o.number} - Status: ${o.status}`);
  }
}

checkOrderStatus().catch(console.error);

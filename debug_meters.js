import axios from 'axios';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const BOBINA_LARGURA = 1.57;

function detectGramatura(variantName) {
  if (!variantName) return null;
  const name = variantName.toLowerCase();
  if (name.includes('160g') || name.includes('160gr')) return '160g';
  if (name.includes('120g') || name.includes('120gr')) return '120g';
  return null;
}

function detectDimensions(variantName) {
  if (!variantName) return null;
  const cleanName = variantName.toLowerCase().replace(/,/g, '.');
  const regex = /(\d+(?:\.\d+)?)\s*(?:m|cm|mt)?\s*[xX*]\s*(\d+(?:\.\d+)?)\s*(?:m|cm|mt)?/i;
  const match = cleanName.match(regex);
  if (!match) return null;
  let d1 = parseFloat(match[1]);
  let d2 = parseFloat(match[2]);
  if (d1 > 10) d1 /= 100;
  if (d2 > 10) d2 /= 100;
  if (isNaN(d1) || isNaN(d2)) return null;
  return [d1, d2];
}

function calcLinearMeters(d1, d2) {
  if (d1 > 3.14) {
    return Math.ceil(d2 / BOBINA_LARGURA) * d1;
  }
  const optionA = Math.ceil(d1 / BOBINA_LARGURA) * d2;
  const optionB = Math.ceil(d2 / BOBINA_LARGURA) * d1;
  return Math.min(optionA, optionB);
}

function analyzeLineItem(item) {
  const price = parseFloat(item.price || 0);
  const qty = parseInt(item.quantity || 1);
  if (price <= 0) return null;

  const variantName = item.variant_values
    ? (Array.isArray(item.variant_values) ? item.variant_values.join(' / ') : item.variant_values)
    : (item.name || '');

  const dims = detectDimensions(variantName) || detectDimensions(item.name || '');
  if (!dims) return null;

  const gram = detectGramatura(variantName) || detectGramatura(item.name || '') || '160g';
  const [d1, d2] = dims;

  const inSpecialRange = (d) => d >= 1.70 && d <= 1.75;
  const isSpecial = (inSpecialRange(d1) || inSpecialRange(d2));
  
  let meters120g = 0;
  let meters160g = 0;

  if (isSpecial && gram === '120g') {
    // Especial range bypass linear logic
  } else {
    if (gram === '120g') meters120g = calcLinearMeters(d1, d2);
    if (gram === '160g') meters160g = calcLinearMeters(d1, d2);
  }

  return {
    name: item.name,
    variantName,
    gram,
    dims: [d1, d2],
    qty,
    meters120g: meters120g * qty,
    meters160g: meters160g * qty,
  };
}

async function debugMeters() {
  const TIENDANUBE_ACCESS_TOKEN = '454761d47b7ce42c4d539deb3025366ac8dbe358';
  const TIENDANUBE_STORE_ID = '2767708';
  
  let allOrders = [];
  let page = 1;
  
  // we can search directly or paginate
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
    return n >= 4413 && n <= 4429;
  }).sort((a, b) => parseInt(a.number, 10) - parseInt(b.number, 10));
  
  let total120 = 0;
  let total160 = 0;
  
  for (const o of targetOrders) {
    console.log(`--- PEDIDO #${o.number} ---`);
    for (const item of o.products) {
      const res = analyzeLineItem(item);
      if (res) {
        console.log(`  Produto: ${res.name}`);
        console.log(`    Variante: ${res.variantName}`);
        console.log(`    Gramatura detectada: ${res.gram}`);
        console.log(`    Dimensoes: ${res.dims[0]}m x ${res.dims[1]}m`);
        console.log(`    Qtd: ${res.qty}`);
        console.log(`    Metragem 120g: ${res.meters120g.toFixed(2)}m | 160g: ${res.meters160g.toFixed(2)}m`);
        
        total120 += res.meters120g;
        total160 += res.meters160g;
      } else {
         console.log(`  Produto: ${item.name} -> IGNORADO (Sem dimensoes validas)`);
      }
    }
  }
  
  console.log(`\n============================`);
  console.log(`TOTAL 120g: ${total120.toFixed(2)}m`);
  console.log(`TOTAL 160g: ${total160.toFixed(2)}m`);
}

debugMeters().catch(console.error);

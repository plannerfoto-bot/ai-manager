import axios from 'axios';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const BOBINA_LARGURA = 1.57;

class SkylinePacker {
  constructor(binWidth) {
    this.binWidth = binWidth;
    this.skyline = [{x: 0, y: 0, w: binWidth}];
  }

  pack(width, height) {
    // avoid floating point issues by rounding to 3 decimals
    width = Math.round(width * 1000) / 1000;
    height = Math.round(height * 1000) / 1000;

    let bestY = Infinity;
    let bestX = -1;

    for (let i = 0; i < this.skyline.length; i++) {
      let segment = this.skyline[i];
      let x = segment.x;
      
      if (Math.round((x + width)*1000)/1000 > this.binWidth) continue;

      let maxY = segment.y;
      let j = i;
      let currentX = x;
      while (Math.round(currentX * 1000)/1000 < Math.round((x + width)*1000)/1000 && j < this.skyline.length) {
        let seg = this.skyline[j];
        if (seg.y > maxY) maxY = seg.y;
        currentX += seg.w;
        j++;
      }

      if (maxY < bestY) {
        bestY = maxY;
        bestX = x;
      }
    }

    if (bestX === -1) return 0;

    let newSegment = {x: bestX, y: bestY + height, w: width};
    let newSkyline = [];
    let inserted = false;

    for (let i = 0; i < this.skyline.length; i++) {
      let seg = this.skyline[i];
      
      if (Math.round((seg.x + seg.w)*1000)/1000 <= Math.round(bestX*1000)/1000) {
        newSkyline.push(seg);
      }
      else if (Math.round(seg.x*1000)/1000 >= Math.round((bestX + width)*1000)/1000) {
        if (!inserted) {
          newSkyline.push(newSegment);
          inserted = true;
        }
        newSkyline.push(seg);
      }
      else {
        if (Math.round(seg.x*1000)/1000 < Math.round(bestX*1000)/1000) {
          newSkyline.push({x: seg.x, y: seg.y, w: bestX - seg.x});
        }
        if (!inserted) {
          newSkyline.push(newSegment);
          inserted = true;
        }
        if (Math.round((seg.x + seg.w)*1000)/1000 > Math.round((bestX + width)*1000)/1000) {
          newSkyline.push({x: bestX + width, y: seg.y, w: (seg.x + seg.w) - (bestX + width)});
        }
      }
    }
    
    if (!inserted) newSkyline.push(newSegment);
    
    this.skyline = [];
    for (let seg of newSkyline) {
      if (this.skyline.length > 0 && Math.round(this.skyline[this.skyline.length - 1].y*1000)/1000 === Math.round(seg.y*1000)/1000) {
        this.skyline[this.skyline.length - 1].w += seg.w;
      } else {
        this.skyline.push(seg);
      }
    }

    return bestY + height;
  }

  getMaxHeight() {
    return Math.max(...this.skyline.map(s => s.y));
  }
}

function detectGramatura(variantName) {
  if (!variantName) return null;
  const name = variantName.toLowerCase();
  if (name.includes('160g') || name.includes('160gr')) return '160g';
  if (name.includes('120g') || name.includes('120gr')) return '120g';
  return null;
}

function parseDimensions(str) {
  const match = str.match(/(\d+)[,.](\d+)\s*[xX]\s*(\d+)[,.](\d+)/);
  if (!match) return null;
  const d1 = parseFloat(`${match[1]}.${match[2]}`);
  const d2 = parseFloat(`${match[3]}.${match[4]}`);
  return { d1, d2 };
}

function getBestStrips(d1, d2, quantity) {
  let strips = [];
  
  let optionA_strips = [];
  let wA = d1, hA = d2;
  let countA = Math.ceil(wA / BOBINA_LARGURA);
  for(let i=0; i<countA; i++) {
     let w = (i === countA - 1 && (wA % BOBINA_LARGURA !== 0)) ? (wA % BOBINA_LARGURA) : BOBINA_LARGURA;
     optionA_strips.push({w: w, h: hA});
  }
  let totalHeightA = countA * hA;

  let optionB_strips = [];
  let wB = d2, hB = d1;
  let countB = Math.ceil(wB / BOBINA_LARGURA);
  for(let i=0; i<countB; i++) {
     let w = (i === countB - 1 && (wB % BOBINA_LARGURA !== 0)) ? (wB % BOBINA_LARGURA) : BOBINA_LARGURA;
     optionB_strips.push({w: w, h: hB});
  }
  let totalHeightB = countB * hB;

  let chosenStrips = [];
  if (d1 > 3.14) {
    chosenStrips = optionB_strips; // force horizontal seam -> d1 is height of strip
  } else {
    chosenStrips = totalHeightA <= totalHeightB ? optionA_strips : optionB_strips;
  }

  // Multiply by quantity
  for (let q = 0; q < quantity; q++) {
    for (let s of chosenStrips) strips.push(s);
  }
  
  return strips;
}

async function run() {
  const token = "83bd0ce5139fb2bc8704207904dfb38ed6a378d3";
  const userId = "3884878";
  const res = await axios.get(`https://api.nuvemshop.com.br/v1/${userId}/orders`, {
    headers: {
      'Authentication': `bearer ${token}`,
      'User-Agent': 'PlannerFoto (contato@plannerfoto.com.br)'
    },
    params: { per_page: 50 }
  });
  
  const allOrders = res.data;
  const targetOrders = allOrders.filter(o => {
    const n = parseInt(o.number, 10);
    return n >= 4413 && n <= 4429 && o.payment_status === 'paid';
  }).sort((a, b) => parseInt(a.number, 10) - parseInt(b.number, 10));
  
  let total120 = 0;
  let total160 = 0;
  
  for (const o of targetOrders) {
    console.log(`--- PEDIDO #${o.number} ---`);
    let strips120 = [];
    let strips160 = [];

    for (const item of o.products) {
      let g = detectGramatura(item.variant?.name) || detectGramatura(item.name) || '160g';
      let dims = parseDimensions(item.variant?.name || '') || parseDimensions(item.name);
      if (!dims) continue;
      
      const q = parseInt(item.quantity, 10);
      const strips = getBestStrips(dims.d1, dims.d2, q);
      
      console.log(`  Produto: ${item.name}`);
      console.log(`    Dim: ${dims.d1}x${dims.d2} | Qtd: ${q} | Gramatura: ${g}`);
      
      if (g === '120g') strips120.push(...strips);
      else strips160.push(...strips);
    }
    
    // Sort and pack 120g
    strips120.sort((a, b) => b.h - a.h || b.w - a.w);
    let packer120 = new SkylinePacker(BOBINA_LARGURA);
    for (let s of strips120) packer120.pack(s.w, s.h);
    const m120 = packer120.getMaxHeight();
    
    // Sort and pack 160g
    strips160.sort((a, b) => b.h - a.h || b.w - a.w);
    let packer160 = new SkylinePacker(BOBINA_LARGURA);
    for (let s of strips160) packer160.pack(s.w, s.h);
    const m160 = packer160.getMaxHeight();
    
    total120 += m120;
    total160 += m160;
    
    console.log(`  > Metragem Pedido 120g: ${m120.toFixed(2)}m`);
    console.log(`  > Metragem Pedido 160g: ${m160.toFixed(2)}m`);
  }
  
  console.log("============================");
  console.log(`TOTAL 120g: ${total120.toFixed(2)}m`);
  console.log(`TOTAL 160g: ${total160.toFixed(2)}m`);
}

run().catch(err => console.error(err));

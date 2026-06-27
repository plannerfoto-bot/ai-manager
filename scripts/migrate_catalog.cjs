require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Tabelas de preço de 120g para produtos Aline Martins
const ALINE_120G_PRICES = {
  "1,50x2,00": 144.00,
  "1,50x2,20": 149.00,
  "2,50x2,00": 265.00,
  "3,00x2,00": 303.00,
  "3,00x2,50": 325.00
};

// Auxiliar para atrasar chamadas e evitar Rate Limiting da API Nuvemshop
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log('🚀 [Migração] Iniciando migração em lote com processamento instantâneo por página (Mais novos primeiro)...');

  let storeId = process.env.TIENDANUBE_STORE_ID;
  let accessToken = process.env.TIENDANUBE_ACCESS_TOKEN;

  try {
    const { data: stores } = await supabase.from('stores').select('*');
    if (stores && stores.length > 0) {
      storeId = String(stores[0].id);
      accessToken = stores[0].access_token;
      console.log(`📌 Credenciais obtidas: Loja ${storeId}`);
    } else {
      console.log(`📌 Usando credenciais locais do .env: Loja ${storeId}`);
    }
  } catch (err) {
    console.warn('⚠️ Erro ao acessar o Supabase, usando variáveis do .env:', err.message);
  }

  if (!storeId || !accessToken) {
    console.error('❌ Erro: TIENDANUBE_STORE_ID ou ACCESS_TOKEN não configurados.');
    process.exit(1);
  }

  const client = axios.create({
    baseURL: `https://api.tiendanube.com/v1/${storeId}`,
    headers: {
      'Authentication': `bearer ${accessToken}`,
      'User-Agent': 'AIManager/1.0',
      'Content-Type': 'application/json'
    }
  });

  // 1. Fazer uma requisição leve de teste para determinar a ordenação e total de produtos
  console.log('📦 Analisando estrutura de ordenação da API Nuvemshop...');
  let totalProducts = 0;
  let firstPage = [];
  try {
    const testRes = await client.get('/products', { params: { per_page: 200, page: 1 } });
    firstPage = testRes.data || [];
    totalProducts = parseInt(testRes.headers['x-total-count'] || '0', 10);
    console.log(`📊 Total de produtos no catálogo: ${totalProducts}`);
  } catch (err) {
    console.error('❌ Erro na consulta de teste inicial:', err.message);
    process.exit(1);
  }

  if (firstPage.length === 0) {
    console.log('✅ Catálogo vazio ou nenhum produto encontrado. Migração encerrada.');
    return;
  }

  // Descobrir se a página 1 traz os mais novos ou mais antigos
  // Se o ID do primeiro produto for menor que o do último, a ordem é crescente (antigos primeiro)
  const isCrescente = firstPage[0].id < firstPage[firstPage.length - 1].id;
  const totalPages = Math.ceil(totalProducts / 200);

  console.log(`ℹ️ A API Nuvemshop entrega produtos em ordem ${isCrescente ? 'CRESCENTE (Antigos na página 1)' : 'DECRESCENTE (Novos na página 1)'}.`);
  console.log(`ℹ️ Total de páginas de produtos: ${totalPages}`);

  // Gerar a fila de páginas a buscar para garantir que os mais novos venham primeiro
  const pagesQueue = [];
  if (isCrescente) {
    // Se a ordem for crescente (antigos na pág 1), os mais novos estão na última página.
    // Buscaremos de trás para frente (totalPages até 1)
    for (let p = totalPages; p >= 1; p--) pagesQueue.push(p);
  } else {
    // Se a ordem for decrescente (novos na pág 1), buscaremos do 1 até o totalPages
    for (let p = 1; p <= totalPages; p++) pagesQueue.push(p);
  }

  console.log(`🚀 Iniciando processamento das páginas na ordem: [${pagesQueue.join(', ')}]`);

  let processedCount = 0;

  // 2. Loop por cada página na ordem definida
  for (const pageNum of pagesQueue) {
    console.log(`\n📄 [Página ${pageNum}] Buscando lote de produtos...`);
    let pageProducts = [];
    try {
      const pageRes = await client.get('/products', { params: { per_page: 200, page: pageNum } });
      pageProducts = pageRes.data || [];
      // Se a ordem for crescente (antigos primeiro), os mais novos daquela página estão no final.
      // Invertemos a página individual para processar o mais novo do lote primeiro!
      if (isCrescente) {
        pageProducts.reverse();
      }
    } catch (err) {
      console.error(`❌ Falha ao carregar página ${pageNum}. Pulando lote.`, err.message);
      continue;
    }

    console.log(`✅ Lote carregado: ${pageProducts.length} produtos para processar.`);

    // 3. Processar imediatamente os produtos deste lote
    for (const product of pageProducts) {
      processedCount++;
      const name = product.name ? (product.name.pt || Object.values(product.name)[0]) : `ID: ${product.id}`;
      const tags = (product.tags || '').toLowerCase();
      const hasAlineTag = tags.includes('aline-martins');

      console.log(`🔄 [Global: ${processedCount}/${totalProducts}] Processando: "${name}" (ID: ${product.id})`);

      try {
        let attributes = product.attributes || [];
        let layoutAttrIdx = attributes.findIndex(attr => {
          const pt = (attr.pt || '').toLowerCase();
          return pt.includes('layout') || pt.includes('cenario') || pt.includes('cenário') || pt.includes('formato');
        });

        if (attributes.length === 0) {
          attributes = [{ pt: 'Tamanho' }, { pt: 'Gramatura' }, { pt: 'Layout do Cenário' }];
          await client.put(`/products/${product.id}`, { attributes });
          console.log(`   🎨 Atributos criados: Tamanho, Gramatura, Layout do Cenário`);
          layoutAttrIdx = 2;
          await sleep(500);
        } else if (layoutAttrIdx === -1) {
          attributes.push({ pt: 'Layout do Cenário' });
          await client.put(`/products/${product.id}`, { attributes });
          console.log(`   🎨 Atributo "Layout do Cenário" adicionado ao produto.`);
          layoutAttrIdx = attributes.length - 1;
          await sleep(500);
        }

        // Recarrega o produto para obter a estrutura fresca
        const freshRes = await client.get(`/products/${product.id}`);
        const freshProduct = freshRes.data;
        const baseVariant = freshProduct.variants?.[0] || null;
        if (!baseVariant) {
          console.log(`   ⚠️ Produto sem variantes básicas. Pulando.`);
          continue;
        }

        const buildValues = (measure, gram, layoutVal) => attributes.map((attr, idx) => {
          const attrName = (attr.pt || attr.es || attr.en || '').toLowerCase();
          if (attrName.includes('gramatura') || attrName.includes('tecido') || attrName.includes('material')) return { pt: gram };
          if (attrName.includes('tamanho') || attrName.includes('medida') || attrName.includes('dimens')) return { pt: measure };
          if (idx === layoutAttrIdx) return { pt: layoutVal };
          if (idx === 0) return { pt: measure };
          if (idx === 1) return { pt: gram };
          return (baseVariant && baseVariant.values && baseVariant.values[idx]) ? baseVariant.values[idx] : { pt: '-' };
        });

        const variants = freshProduct.variants || [];

        // Identifica sufixo
        let gramSuffix = 'g';
        outer: for (const v of variants) {
          for (const val of v.values || []) {
            const pt = (val.pt || '').toLowerCase();
            if (pt.includes('120gr') || pt.includes('160gr')) { gramSuffix = 'gr'; break outer; }
          }
        }

        // Atualiza as variantes existentes do produto
        for (const variant of variants) {
          const vals = variant.values || [];
          if (vals.length > layoutAttrIdx && vals[layoutAttrIdx] && (vals[layoutAttrIdx].pt.includes('Parede') || vals[layoutAttrIdx].pt.includes('Chão'))) {
            continue; 
          }

          let sizeVal = '1,50x2,00';
          let gramVal = '160' + gramSuffix;

          attributes.forEach((attr, idx) => {
            if (idx === layoutAttrIdx) return;
            const attrName = (attr.pt || '').toLowerCase();
            const valPt = vals[idx] ? vals[idx].pt : '';
            if (attrName.includes('gramatura') || attrName.includes('tecido')) {
              gramVal = valPt;
            } else if (attrName.includes('tamanho') || attrName.includes('medida')) {
              sizeVal = valPt;
            } else if (idx === 0) {
              sizeVal = valPt;
            } else if (idx === 1) {
              gramVal = valPt;
            }
          });

          // Atualiza para Só Parede
          const updatedValues = buildValues(sizeVal, gramVal, 'Só Parede');
          await client.put(`/products/${product.id}/variants/${variant.id}`, {
            values: updatedValues
          });
          console.log(`     ✅ Variante ${variant.id} (${sizeVal} / ${gramVal}) atualizada para "Só Parede".`);
          await sleep(500);

          // Cria a irmã gêmea de Parede e Chão mantendo o estoque intacto
          const siblingValues = buildValues(sizeVal, gramVal, 'Parede e Chão');
          const siblingPayload = {
            price: variant.price,
            promotional_price: variant.promotional_price || null,
            stock: variant.stock, // Mantém exatamente o estoque atual
            weight: variant.weight || 0.5,
            sku: variant.sku ? `${variant.sku}-PC` : null,
            values: siblingValues
          };
          await client.post(`/products/${product.id}/variants`, siblingPayload);
          console.log(`     ➕ Variante criada para "Parede e Chão" (${sizeVal} / ${gramVal}).`);
          await sleep(500);
        }

        // Se for Aline Martins, garante gramatura 120g com estoque infinito (stock: null)
        if (hasAlineTag) {
          console.log(`   🎀 [Aline Martins] Cadastrando opções de tecido 120g...`);
          const sizesToCreate = Object.keys(ALINE_120G_PRICES);

          for (const size of sizesToCreate) {
            const price120 = ALINE_120G_PRICES[size];

            const has120gVariant = freshProduct.variants.some(v => {
              const sizeMatch = v.values.some(val => val.pt.replace(/\s+/g, '') === size);
              const gramMatch = v.values.some(val => val.pt.toLowerCase().includes('120'));
              return sizeMatch && gramMatch;
            });

            if (!has120gVariant) {
              const gramLabel = '120' + gramSuffix;

              // 120g Só Parede - estoque infinito
              const valsSP = buildValues(size, gramLabel, 'Só Parede');
              const payloadSP = {
                price: price120.toFixed(2),
                stock: null, // infinito
                weight: baseVariant ? baseVariant.weight : 0.5,
                sku: baseVariant.sku ? `AM-${size.replace('x', '')}-120-SP` : null,
                values: valsSP
              };
              await client.post(`/products/${product.id}/variants`, payloadSP);
              console.log(`     ➕ Tecido 120g criado: ${size} / Só Parede (R$ ${price120.toFixed(2)})`);
              await sleep(500);

              // 120g Parede e Chão - estoque infinito
              const valsPC = buildValues(size, gramLabel, 'Parede e Chão');
              const payloadPC = {
                price: price120.toFixed(2),
                stock: null, // infinito
                weight: baseVariant ? baseVariant.weight : 0.5,
                sku: baseVariant.sku ? `AM-${size.replace('x', '')}-120-PC` : null,
                values: valsPC
              };
              await client.post(`/products/${product.id}/variants`, payloadPC);
              console.log(`     ➕ Tecido 120g criado: ${size} / Parede e Chão (R$ ${price120.toFixed(2)})`);
              await sleep(500);
            }
          }

          // Reordenar as variantes: 120g primeiro, depois 160g
          console.log(`   🔢 [Aline Martins] Reordenando variantes para colocar 120g antes de 160g...`);
          const freshResFinal = await client.get(`/products/${product.id}`);
          const finalVariants = freshResFinal.data.variants || [];

          const sortedVariants = [...finalVariants].sort((a, b) => {
            const getGram = (v) => {
              const val = v.values.find((val, idx) => {
                const attrName = (attributes[idx]?.pt || '').toLowerCase();
                return attrName.includes('gramatura') || attrName.includes('tecido') || attrName.includes('material');
              });
              return val ? (val.pt || '').toLowerCase() : '';
            };
            const gramA = getGram(a);
            const gramB = getGram(b);
            const is120A = gramA.includes('120');
            const is120B = gramB.includes('120');
            if (is120A && !is120B) return -1;
            if (!is120A && is120B) return 1;
            return 0; // mantém a ordem relativa
          });

          for (let i = 0; i < sortedVariants.length; i++) {
            const v = sortedVariants[i];
            const newPos = i + 1;
            if (v.position !== newPos) {
              await client.put(`/products/${product.id}/variants/${v.id}`, {
                position: newPos
              });
              console.log(`     🔢 Posição da variante ${v.id} (${v.values.map(val => val.pt).join(' / ')}) atualizada para ${newPos}.`);
              await sleep(300);
            }
          }
        }

      } catch (productError) {
        console.error(`❌ Falha ao migrar produto "${name}":`, productError.response?.data || productError.message);
      }
    }
  }

  console.log('\n🎉 [Migração] Processo finalizado com sucesso para todo o catálogo!');
}

main();

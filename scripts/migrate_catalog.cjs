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
  console.log('🚀 [Migração] Iniciando migração em lote dos produtos para a variação "Layout do Cenário"...');

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

  // 1. Obter todos os produtos da loja
  let products = [];
  let page = 1;
  let hasMore = true;

  console.log('📦 Buscando produtos do catálogo Nuvemshop...');
  while (hasMore) {
    try {
      const res = await client.get('/products', { params: { per_page: 200, page: page } });
      const list = res.data || [];
      if (list.length === 0) {
        hasMore = false;
      } else {
        products.push(...list);
        if (list.length < 200) hasMore = false;
        else page++;
      }
    } catch (err) {
      console.error(`❌ Erro ao buscar página ${page} de produtos:`, err.message);
      hasMore = false;
    }
  }

  console.log(`✅ Total de produtos encontrados: ${products.length}`);

  // Inverte a lista de produtos para processar os criados recentemente primeiro (mais novos)
  products.reverse();
  console.log('🔄 Lista de produtos invertida para processar do mais novo para o mais antigo.');

  for (let pIdx = 0; pIdx < products.length; pIdx++) {
    const product = products[pIdx];
    const name = product.name ? (product.name.pt || Object.values(product.name)[0]) : `ID: ${product.id}`;
    const tags = (product.tags || '').toLowerCase();
    const hasAlineTag = tags.includes('aline-martins');

    console.log(`\n🔄 [${pIdx + 1}/${products.length}] Processando produto: "${name}" (ID: ${product.id})`);

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

      // Recarrega o produto para pegar a estrutura fresca
      const freshRes = await client.get(`/products/${product.id}`);
      const freshProduct = freshRes.data;
      const baseVariant = freshProduct.variants?.[0] || null;
      if (!baseVariant) {
        console.log(`   ⚠️ Produto sem variantes básicas cadastrado. Pulando.`);
        continue;
      }

      // Função utilitária para mapear valores das propriedades
      const buildValues = (measure, gram, layoutVal) => attributes.map((attr, idx) => {
        const attrName = (attr.pt || attr.es || attr.en || '').toLowerCase();
        if (attrName.includes('gramatura') || attrName.includes('tecido') || attrName.includes('material')) return { pt: gram };
        if (attrName.includes('tamanho') || attrName.includes('medida') || attrName.includes('dimens')) return { pt: measure };
        if (idx === layoutAttrIdx) return { pt: layoutVal };
        if (idx === 0) return { pt: measure };
        if (idx === 1) return { pt: gram };
        return (baseVariant && baseVariant.values && baseVariant.values[idx]) ? baseVariant.values[idx] : { pt: '-' };
      });

      // 3. Atualizar variantes existentes para "Só Parede" e duplicar para "Parede e Chão"
      const variants = freshProduct.variants || [];
      const originalVariantCount = variants.length;

      console.log(`   📦 Produto possui ${originalVariantCount} variantes atuais.`);

      // Identifica o sufixo de gramatura (g ou gr)
      let gramSuffix = 'g';
      outer: for (const v of variants) {
        for (const val of v.values || []) {
          const pt = (val.pt || '').toLowerCase();
          if (pt.includes('120gr') || pt.includes('160gr')) { gramSuffix = 'gr'; break outer; }
        }
      }

      // Varre as variantes existentes
      for (const variant of variants) {
        const vals = variant.values || [];
        // Se a variante já tem todos os 3 valores (incluindo o layout), não precisamos re-atualizar
        if (vals.length > layoutAttrIdx && vals[layoutAttrIdx] && (vals[layoutAttrIdx].pt.includes('Parede') || vals[layoutAttrIdx].pt.includes('Chão'))) {
          continue; 
        }

        // Obtém tamanho e gramatura atuais da variante
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

        // 3a. Atualizar variante existente para "Só Parede"
        const updatedValues = buildValues(sizeVal, gramVal, 'Só Parede');
        await client.put(`/products/${product.id}/variants/${variant.id}`, {
          values: updatedValues
        });
        console.log(`     ✅ Variante ${variant.id} (${sizeVal} / ${gramVal}) atualizada para "Só Parede".`);
        await sleep(500);

        // 3b. Criar variante gêmea para "Parede e Chão"
        const siblingValues = buildValues(sizeVal, gramVal, 'Parede e Chão');
        const siblingPayload = {
          price: variant.price,
          promotional_price: variant.promotional_price || null,
          stock: variant.stock,
          weight: variant.weight || 0.5,
          sku: variant.sku ? `${variant.sku}-PC` : null,
          values: siblingValues
        };
        await client.post(`/products/${product.id}/variants`, siblingPayload);
        console.log(`     ➕ Variante criada para "Parede e Chão" (${sizeVal} / ${gramVal}).`);
        await sleep(500);
      }

      // 4. Se for produto da Coleção Aline Martins, adicionar gramatura 120g nas opções padrão (Só Parede e Parede e Chão)
      if (hasAlineTag) {
        console.log(`   🎀 [Aline Martins] Cadastrando opções de tecido 120g...`);
        const sizesToCreate = Object.keys(ALINE_120G_PRICES);

        for (const size of sizesToCreate) {
          const price120 = ALINE_120G_PRICES[size];

          // Verifica se já existe variante de 120g cadastrada para esse tamanho
          const has120gVariant = freshProduct.variants.some(v => {
            const sizeMatch = v.values.some(val => val.pt.replace(/\s+/g, '') === size);
            const gramMatch = v.values.some(val => val.pt.toLowerCase().includes('120'));
            return sizeMatch && gramMatch;
          });

          if (!has120gVariant) {
            const gramLabel = '120' + gramSuffix;

            // Cria variante 120g - Só Parede
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

            // Cria variante 120g - Parede e Chão
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
          } else {
            console.log(`     ℹ️ Tecido 120g para o tamanho ${size} já existe. Pulando.`);
          }
        }
      }

    } catch (productError) {
      console.error(`❌ Falha ao migrar produto "${name}":`, productError.response?.data || productError.message);
    }
  }

  console.log('\n🎉 [Migração] Processo finalizado com sucesso para todo o catálogo!');
}

main();

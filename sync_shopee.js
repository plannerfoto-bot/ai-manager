import XLSX from 'xlsx';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const storeId = process.env.TIENDANUBE_STORE_ID;
const token = process.env.TIENDANUBE_ACCESS_TOKEN;
const shopeeCategory = 101265; 
const BATCH_SIZE = 40; // Reduzido para evitar erro de 10MB da Shopee devido à carga de imagens e descrições

// IDs das categorias específicas solicitadas
const targetCategoryIds = [17075040, 36397656, 36956485]; // FESTA JUNINA, COPA DO MUNDO, DIA DAS MÃES

// Expressões regulares para garantir que o filtro pegue tudo, mesmo se o ID falhar
const regexFestaJunina = /junina|arraia|pula a fogueira|chita|são joão|sao joao/i;
const regexCopa = /copa do mundo|brasil|seleção|selecao/i;
const regexDiaDasMaes = /dia das mães|dia das maes|mães|maes/i;

const templatePath = 'erro4.xlsx';

function optimizeTitle(productName) {
    let cleanName = productName.replace(/Fundo Fotográfico/gi, '').trim();
    let optimized = `Fundo Fotográfico ${cleanName} Painel de Festa Tecido Decoração`;
    return optimized.substring(0, 120); 
}

function generateRichDescription(productName) {
    return `📸 BEM-VINDO À FUNDO FOTOGRÁFICO CLOTH! 📸

O melhor material para fotografia e eventos! Este produto une a versatilidade de um Fundo Fotográfico Profissional com a praticidade de um Painel de Festa.

✨ DIFERENCIAIS DO NOSSO PRODUTO ✨
✅ MATERIAL: Tecido 100% Poliéster Premium (Poliwear).
✅ NÃO REFLETE LUZ: Acabamento fosco ideal para fotos e filmagens (sem brilho de flash).
✅ ALTA RESOLUÇÃO: Estampa vívida com cores reais e profundidade.
✅ DURABILIDADE: Pode ser lavado, passado e reutilizado várias vezes.
✅ LOGÍSTICA: Leve (aprox. 500g), fácil de transportar e não amassa facilmente.

🛠️ FICHA TÉCNICA
• Produto: ${productName}
• Categoria: Painel de Festa / Fundo Fotográfico
• Gramatura: Alta Densidade
• Origem: Brasil (Fabricação Própria)

💡 DICA DE USO: Ideal para estúdios fotográficos, festas de aniversário, Smash the Cake e eventos corporativos.

⚠️ Atenção: As cores podem variar levemente dependendo da configuração do seu monitor.`;
}

function calculatePrice(nuvemshopPrice) {
    const price = parseFloat(nuvemshopPrice);
    if (isNaN(price)) return 0;
    const finalPrice = (price * 1.25) + 4.00; 
    return parseFloat(finalPrice.toFixed(2));
}

async function fetchSazonalProducts() {
    let allProducts = [];
    let page = 1;
    console.log(`🔍 Iniciando busca completa HÍBRIDA (IDs + Palavras-Chave)...`);
    
    while (true) {
        try {
            const response = await axios.get(`https://api.tiendanube.com/v1/${storeId}/products`, {
                params: { page, per_page: 200 }, 
                headers: { 'Authentication': `bearer ${token}`, 'User-Agent': 'Shopee-Sync' }
            });
            
            if (response.data.length === 0) {
                console.log('🏁 Fim do catálogo atingido.');
                break;
            }
            
            const filtered = response.data.filter(p => {
                const name = p.name.pt || "";
                
                // Exclusões V14: Ignorar "Adriana Arouck" ou categoria "Exclusivos" (16891194 e 16891731)
                const isExcluded = /adriana arouck/i.test(name) || p.categories.some(cat => cat.id === 16891194 || cat.id === 16891731);
                if (isExcluded) return false;

                const matchesId = p.categories.some(cat => targetCategoryIds.includes(cat.id));
                const matchesRegex = regexFestaJunina.test(name) || regexCopa.test(name) || regexDiaDasMaes.test(name);
                return matchesId || matchesRegex;
            });
            
            allProducts = allProducts.concat(filtered);
            console.log(`Página ${page}: Processados ${response.data.length} produtos. Filtro sazonal: +${filtered.length} (Total: ${allProducts.length})`);
            
            page++;
            await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) { 
            console.log(`Erro na página ${page}, interrompendo...`);
            break; 
        }
    }
    return allProducts;
}

async function generateShopeeExcelBatch(products, batchIndex) {
    const outputPath = `Shopee_Sazonal_Festa_Copa_Maes_PARTE_${batchIndex + 1}.xlsx`;
    const workbook = XLSX.readFile(templatePath);
    const worksheet = workbook.Sheets['Modelo'];

    const techHeader = [];
    techHeader[51] = "ps_brand|0|0";
    techHeader[52] = "ps_origin|0|0";
    techHeader[53] = "et_title_material|0|0";
    techHeader[54] = "et_title_pattern|0|0";
    techHeader[55] = "et_title_occasion|0|0";
    XLSX.utils.sheet_add_aoa(worksheet, [techHeader], { origin: "AZ1" });

    const dataRows = [];

    products.forEach((p) => {
        const optimizedTitle = optimizeTitle(p.name.pt);
        const richDesc = generateRichDescription(p.name.pt);
        const parentSku = p.handle.pt || `NS-${p.id}`;
        const firstImage = p.images[0]?.src || "";

        p.variants.forEach((v, vIndex) => {
            const shopeePrice = calculatePrice(v.price);
            const variantName = v.values.map(val => val.pt).join(' - ');
            const shopeeSku = v.sku || `${parentSku}-${vIndex}`;
            const variantImageObj = p.images.find(img => img.id === v.image_id);
            const variantImageUrl = variantImageObj ? variantImageObj.src : firstImage;

            // Extraindo atributos logísticos da Variação com Fallback (V14)
            const variantWeight = parseFloat(v.weight) || 0.5; // Tamanho do pacote: 0.500g (kg)
            const variantDepth = parseFloat(v.depth) || 25;
            const variantWidth = parseFloat(v.width) || 25;
            const variantHeight = parseFloat(v.height) || 10;

            const rowData = new Array(60).fill("");
            
            rowData[0] = shopeeCategory; 
            rowData[1] = optimizedTitle; 
            rowData[2] = richDesc; 
            rowData[3] = parentSku; 
            rowData[4] = `INT-${p.id}`; 
            rowData[5] = "Medidas"; 
            rowData[6] = variantName; 
            rowData[7] = variantImageUrl; 
            rowData[10] = shopeePrice; 
            rowData[11] = 999; 
            rowData[12] = shopeeSku; 
            rowData[13] = ""; 
            rowData[14] = ""; 
            rowData[15] = ""; // Item sem GTIN
            rowData[17] = firstImage; 
            for (let i = 1; i < 9; i++) {
                if (p.images[i]) rowData[17 + i] = p.images[i].src;
            }
            rowData[26] = variantWeight; // ps_weight
            rowData[27] = variantDepth;  // ps_length
            rowData[28] = variantWidth;  // ps_width
            rowData[29] = variantHeight; // ps_height
            rowData[30] = "";   
            rowData[31] = 6;  // Sob encomenda: 6 dias  
            rowData[32] = "63079090"; 
            rowData[33] = "5102"; 
            rowData[34] = "6102"; 
            rowData[35] = "0"; 
            rowData[36] = "102"; 
            rowData[38] = "UN"; 
            rowData[51] = "Nenhuma";   
            rowData[52] = "Brasil";    // País de origem
            rowData[53] = "Polieste";  // Material: Polieste
            rowData[54] = "Estampado"; // Estampa: Estampado
            rowData[55] = "Festa";     // Ocasião: Festa
            
            dataRows.push(rowData);
        });
    });

    XLSX.utils.sheet_add_aoa(worksheet, dataRows, { origin: "A5" });
    XLSX.writeFile(workbook, outputPath);
    console.log(`✅ Parte ${batchIndex + 1} gerada com ${products.length} itens pai: ${outputPath}`);
}

async function startSync() {
    try {
        const products = await fetchSazonalProducts(); 
        if (products.length === 0) {
            console.log('⚠️ Nenhum produto encontrado.');
            return;
        }

        console.log(`📦 Dividindo ${products.length} produtos em lotes de ${BATCH_SIZE}...`);
        
        for (let i = 0; i < products.length; i += BATCH_SIZE) {
            const batch = products.slice(i, i + BATCH_SIZE);
            await generateShopeeExcelBatch(batch, Math.floor(i / BATCH_SIZE));
        }

        console.log(`\n🎉 Todas as partes foram geradas com sucesso!`);
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

startSync();

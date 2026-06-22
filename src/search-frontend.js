document.addEventListener("DOMContentLoaded", function() {
  const isSearchPage = window.location.pathname.includes('/search') || window.location.pathname.includes('/busca');
  
  if (isSearchPage) {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');

    if (query && query.trim() !== '') {
      console.log("[Busca Inteligente] Interceptando busca por:", query);

      const baseUrl = typeof __PUBLIC_URL__ !== 'undefined' ? __PUBLIC_URL__ : 'https://ai-manager-nuvemshop.onrender.com';

      fetch(`${baseUrl}/api/public/search-products?q=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
          if (data.success && data.products.length > 0) {
            console.log(`[Busca Inteligente] Encontrados ${data.products.length} produtos.`);
            
            const selectors = ['.js-product-grid', '.product-grid', '.row-grid', '.js-product-grid-container', '.grid-row'];
            let gridContainer = null;
            
            for (const selector of selectors) {
              const el = document.querySelector(selector);
              if (el) {
                gridContainer = el;
                break;
              }
            }

            if (!gridContainer) {
              const productItems = document.querySelectorAll('.product-item, .js-item-product');
              if (productItems.length > 0) {
                gridContainer = productItems[0].parentElement;
              }
            }

            if (gridContainer) {
              let newHTML = '<div class="row row-grid" style="display: flex; flex-wrap: wrap; width: 100%;">';
              
              data.products.forEach(product => {
                const formattedPrice = parseFloat(product.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                
                newHTML += `
                  <div class="col-6 col-md-4 col-lg-3 mb-4" style="padding: 10px; box-sizing: border-box;">
                    <div class="product-item" style="border: 1px solid #eee; padding: 15px; border-radius: 8px; text-align: center; height: 100%; display: flex; flex-direction: column; justify-content: space-between; background: #fff; transition: box-shadow 0.2s;">
                      <a href="${product.url}" style="text-decoration: none; color: inherit; display: block; height: 100%;">
                        <div style="position: relative; padding-bottom: 100%; height: 0; overflow: hidden; border-radius: 6px; margin-bottom: 12px;">
                          <img src="${product.image}" alt="${product.name}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;">
                        </div>
                        <h3 class="product-title" style="font-size: 14px; line-height: 1.4; margin: 8px 0; font-weight: 500; height: 40px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; color: #333;">
                          ${product.name}
                        </h3>
                        <p class="product-sku" style="font-size: 11px; color: #999; margin-bottom: 8px;">SKU: ${product.sku || 'N/A'}</p>
                        <p class="product-price" style="font-size: 16px; font-weight: bold; color: #007bff; margin: 5px 0;">
                          ${formattedPrice}
                        </p>
                      </a>
                    </div>
                  </div>
                `;
              });
              
              newHTML += '</div>';
              gridContainer.innerHTML = newHTML;

              const pagination = document.querySelector('.pagination, .js-pagination');
              if (pagination) pagination.style.display = 'none';
            }
          }
        })
        .catch(err => console.error("[Busca Inteligente] Erro:", err));
    }
  }
});
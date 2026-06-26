(function() {
  var FRETE_ENABLED = __ENABLED__;
  if (!FRETE_ENABLED) return;

  function brl(v) {
    return 'R$ ' + parseFloat(v).toFixed(2).replace('.', ',');
  }

  // Estilos globais para a barra glassmorphism
  if (!document.getElementById('ai-frete-styles')) {
    var style = document.createElement('style');
    style.id = 'ai-frete-styles';
    style.innerHTML = `
      @keyframes aiShimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(200%); }
      }
      .ai-frete-glass {
        background: rgba(255, 255, 255, 0.6);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border: 1px solid rgba(229, 231, 235, 0.8);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 12px;
        font-family: inherit;
        text-align: center;
      }
      .ai-frete-bar-bg {
        width: 100%;
        height: 8px;
        background-color: #e5e7eb;
        border-radius: 10px;
        overflow: hidden;
        margin-top: 10px;
        position: relative;
        box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
      }
      .ai-frete-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #168ed7, #38bdf8); /* Azul da Nuvemshop */
        border-radius: 10px;
        transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
      }
      .ai-frete-bar-fill::after {
        content: "";
        position: absolute;
        top: 0; left: 0; width: 100%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
        animation: aiShimmer 2s infinite;
      }
      .ai-frete-suggestion {
        font-size: 13px;
        color: #0f172a;
        margin-top: 12px;
        display: inline-block;
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        padding: 8px 14px;
        border-radius: 8px;
        font-weight: 500;
        line-height: 1.4;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      }
      .ai-frete-suggestion strong {
        color: #1d4ed8;
        font-weight: 800;
      }
    `;
    document.head.appendChild(style);
  }

  function getShippingGoal(zipcode) {
    var zip = parseInt(zipcode.replace(/\D/g, ''), 10);
    if (isNaN(zip)) return null;
    
    var zipStr = zipcode.replace(/\D/g, '');
    if (zipStr.length < 8) return null;
    
    var p = parseInt(zipStr.substring(0, 5), 10);

    // Regiões exatamente como solicitado:
    // Sudeste = > 300
    if (p >= 1000 && p <= 39999) return { region: 'Sudeste', goal: 300 };
    // Sul / Centro-Oeste = > 350
    if ((p >= 80000 && p <= 99999) || (p >= 70000 && p <= 76999) || (p >= 78000 && p <= 79999)) return { region: 'Sul/CO', goal: 350 };
    // Nordeste = > 450
    if (p >= 40000 && p <= 65999) return { region: 'Nordeste', goal: 450 };
    // Norte = > 650
    if ((p >= 66000 && p <= 69999) || (p >= 77000 && p <= 77999) || (p >= 69000 && p <= 69999)) return { region: 'Norte', goal: 650 };
    
    return null;
  }

  function getCartSubtotal() {
    var subtotal = 0;
    
    // ATUALIZAÇÃO CRÍTICA: Pegar apenas o Subtotal para ignorar o frete na conta!
    // Ex: .js-cart-subtotal ou elementos que contêm 'subtotal' no texto.
    var subEls = document.querySelectorAll('.js-cart-subtotal, [data-store="cart-subtotal"]');
    for (var i = 0; i < subEls.length; i++) {
      var match = (subEls[i].innerText || '').match(/[\d.,]+/);
      if (match) {
        subtotal = parseFloat(match[0].replace(/\./g, '').replace(',', '.'));
        break;
      }
    }

    if (subtotal === 0 && window.LS && window.LS.cart && window.LS.cart.subtotal) {
      if (typeof window.LS.cart.subtotal === 'number') {
        subtotal = window.LS.cart.subtotal > 100000 ? window.LS.cart.subtotal / 100 : window.LS.cart.subtotal;
      } else if (typeof window.LS.cart.subtotal === 'string') {
        var strMatch = window.LS.cart.subtotal.match(/[\d.,]+/);
        if (strMatch) subtotal = parseFloat(strMatch[0].replace(/\./g, '').replace(',', '.'));
      }
    }

    // Fallback: se não achou subtotal de jeito nenhum, usa o total menos frete, 
    // mas na Nuvemshop o .js-cart-subtotal quase sempre existe.
    return isNaN(subtotal) ? 0 : subtotal;
  }

  function getItemQty(el) {
    // 1. Prioridade absoluta para inputs específicos de quantidade
    var qtyInput = el.querySelector('input.js-cart-item-qty, input[name*="quantity"], input[name*="qty"]');
    if (qtyInput) {
      var val = parseInt(qtyInput.value, 10);
      if (!isNaN(val) && val > 0) return val;
    }
    
    // 2. Qualquer input de texto ou numérico que possa ser a quantidade
    var inputs = el.querySelectorAll('input[type="number"], input[type="text"]');
    for (var i = 0; i < inputs.length; i++) {
      var val = parseInt(inputs[i].value, 10);
      if (!isNaN(val) && val > 0) return val;
    }

    // 3. Elementos textuais com classes de quantidade
    var qtyText = el.querySelector('.js-cart-item-qty, .cart-item-quantity, .js-cart-qty, .qty, .quantity');
    if (qtyText) {
      var valStr = qtyText.innerText || qtyText.textContent || '';
      var valMatch = valStr.match(/\d+/);
      if (valMatch) {
        var val = parseInt(valMatch[0], 10);
        if (!isNaN(val) && val > 0) return val;
      }
    }

    // 4. Procurar no próprio container de quantidade se houver
    var qtyContainer = el.querySelector('.js-qty, .qty-container, .quantity-container, .js-quantity, .js-cart-item-qty-container');
    if (qtyContainer) {
      var valStr = qtyContainer.innerText || qtyContainer.textContent || '';
      var valMatch = valStr.match(/\d+/);
      if (valMatch) {
        var val = parseInt(valMatch[0], 10);
        if (!isNaN(val) && val > 0) return val;
      }
    }

    // 5. Fallback para varrer todos os spans/divs pequenos do item buscando um número pequeno solto que possa ser a quantidade
    var childs = el.querySelectorAll('span, div');
    for (var i = 0; i < childs.length; i++) {
      var txt = (childs[i].innerText || childs[i].textContent || '').trim();
      if (/^\d+$/.test(txt)) {
        var val = parseInt(txt, 10);
        if (val > 0 && val < 100) { // Quantidade razoável no carrinho
          return val;
        }
      }
    }

    return 1;
  }

  function getCartItems() {
    var cartItemElements = document.querySelectorAll('.js-cart-item, .cart-item');
    if (cartItemElements.length > 0) {
      var totalQty = 0;
      cartItemElements.forEach(function(el) {
        totalQty += getItemQty(el);
      });
      return totalQty;
    }

    var count = -1;
    var countEl = document.querySelector('.js-cart-count, .js-cart-widget-amount, [data-cart-count]');
    if (countEl) {
      var match = countEl.innerText.match(/\d+/);
      if (match) count = parseInt(match[0], 10);
    }
    if (count === -1 && window.LS && window.LS.cart && window.LS.cart.items) {
      count = window.LS.cart.items.length;
    }
    return count;
  }

  var isAlinePromoActiveOnStore = __PROMOCAO_ALINE_ATIVA__;

  function countAlineItemsInCart() {
    var cartItemElements = document.querySelectorAll('.js-cart-item, .cart-item');
    var count = 0;

    if (cartItemElements.length > 0) {
      cartItemElements.forEach(function(el) {
        var text = (el.innerText || '').toLowerCase();
        if (text.indexOf('aline martins') !== -1) {
          count += getItemQty(el);
        }
      });
      
      // Atualiza o estado persistente de sessão
      if (count > 0) {
        sessionStorage.setItem('cc_cart_has_aline', 'true');
        sessionStorage.setItem('cc_cart_aline_qty', count);
      } else {
        sessionStorage.removeItem('cc_cart_has_aline');
        sessionStorage.removeItem('cc_cart_aline_qty');
      }
      return count;
    }

    // Se o DOM do carrinho estiver temporariamente vazio (ex: transição Ajax/Loading)
    // Se o subtotal ainda for maior que zero, confiamos no estado salvo no sessionStorage
    var subtotal = getCartSubtotal();
    if (subtotal > 0 && sessionStorage.getItem('cc_cart_has_aline') === 'true') {
      var savedQty = parseInt(sessionStorage.getItem('cc_cart_aline_qty'), 10) || 1;
      return savedQty;
    }

    // Fallback do objeto global
    var countFallback = 0;
    if (window.LS && window.LS.cart && Array.isArray(window.LS.cart.items)) {
      window.LS.cart.items.forEach(function(item) {
        var name = (item.name || '').toLowerCase();
        var sku = (item.sku || '').toLowerCase();
        if (name.indexOf('aline martins') !== -1 || sku.indexOf('aline martins') !== -1) {
          countFallback += parseInt(item.quantity || 1, 10);
        }
      });
    }

    if (countFallback > 0) {
      sessionStorage.setItem('cc_cart_has_aline', 'true');
      sessionStorage.setItem('cc_cart_aline_qty', countFallback);
      return countFallback;
    }

    return 0;
  }

  function countNonAlineItemsInCart() {
    var cartItemElements = document.querySelectorAll('.js-cart-item, .cart-item');
    var totalQty = 0;

    if (cartItemElements.length > 0) {
      cartItemElements.forEach(function(el) {
        var text = (el.innerText || '').toLowerCase();
        if (text.indexOf('aline martins') === -1) {
          totalQty += getItemQty(el);
        }
      });
      
      if (totalQty > 0) {
        sessionStorage.setItem('cc_cart_non_aline_qty', totalQty);
      } else {
        sessionStorage.removeItem('cc_cart_non_aline_qty');
      }
      return totalQty;
    }

    var subtotal = getCartSubtotal();
    if (subtotal > 0 && sessionStorage.getItem('cc_cart_non_aline_qty')) {
      var savedQty = parseInt(sessionStorage.getItem('cc_cart_non_aline_qty'), 10) || 0;
      return savedQty;
    }

    var totalQtyFallback = 0;
    if (window.LS && window.LS.cart && Array.isArray(window.LS.cart.items)) {
      window.LS.cart.items.forEach(function(item) {
        var name = (item.name || '').toLowerCase();
        var sku = (item.sku || '').toLowerCase();
        if (!(name.indexOf('aline martins') !== -1 || sku.indexOf('aline martins') !== -1)) {
          totalQtyFallback += parseInt(item.quantity || 1, 10);
        }
      });
    }
    return totalQtyFallback;
  }



  function parseCartValue(val) {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') {
      return val > 100000 ? val / 100 : val;
    }
    if (typeof val === 'string') {
      var match = val.match(/[\d.,]+/);
      if (match) {
        var clean = match[0];
        if (clean.indexOf('.') !== -1 && clean.indexOf(',') !== -1) {
          clean = clean.replace(/\./g, '').replace(',', '.');
        } else if (clean.indexOf(',') !== -1) {
          clean = clean.replace(',', '.');
        }
        var parsed = parseFloat(clean);
        return isNaN(parsed) ? 0 : (parsed > 100000 ? parsed / 100 : parsed);
      }
    }
    return 0;
  }

  function shouldHideFrete() {
    // 1. Tenta verificar primeiro no DOM se há elementos de desconto visíveis com valor > 0
    var discountSelectors = [
      '.js-cart-discount',
      '.cart-discount',
      '.js-cart-coupon-discount',
      '.coupon-discount'
    ];
    var discountEls = document.querySelectorAll(discountSelectors.join(','));
    for (var i = 0; i < discountEls.length; i++) {
      var el = discountEls[i];
      if (el.offsetParent === null) continue;
      var style = window.getComputedStyle ? window.getComputedStyle(el) : null;
      if (style && style.display === 'none') continue;
      
      var txt = el.innerText || '';
      var numbers = txt.replace(/\D/g, '');
      var val = parseInt(numbers, 10) || 0;
      if (val > 0) {
        var alineQty = countAlineItemsInCart();
        if (isAlinePromoActiveOnStore && alineQty > 0) {
          return false;
        }
        return true;
      }
    }

    // 2. Fallback para o objeto global caso o DOM não tenha elementos de desconto ativos
    if (window.LS && window.LS.cart) {
      var promoDiscount = 0;
      if (window.LS.cart.promotional_discount) {
        if (typeof window.LS.cart.promotional_discount === 'object') {
          promoDiscount = parseCartValue(window.LS.cart.promotional_discount.total_discount_amount);
        } else {
          promoDiscount = parseCartValue(window.LS.cart.promotional_discount);
        }
      }
      
      var couponDiscount = 0;
      if (window.LS.cart.coupon_discount) {
        if (typeof window.LS.cart.coupon_discount === 'object') {
          couponDiscount = parseCartValue(window.LS.cart.coupon_discount.total_discount_amount);
        } else {
          couponDiscount = parseCartValue(window.LS.cart.coupon_discount);
        }
      }

      var sub = parseCartValue(window.LS.cart.subtotal);
      var tot = parseCartValue(window.LS.cart.total);
      
      if (promoDiscount > 0 || couponDiscount > 0 || (tot > 0 && tot < sub - 1)) {
        var alineQty = countAlineItemsInCart();
        if (isAlinePromoActiveOnStore && alineQty > 0) {
          return false;
        }
        return true;
      }
    }

    return false;
  }

  function renderBar() {
    var banner = document.getElementById('ai-frete-cart-bar');
    if (getCartItems() <= 0) {
      if (banner) banner.style.display = 'none';
      return;
    }

    var targetContainer = document.querySelector('#ajax-cart-details .js-cart-subtotal, #ajax-cart-details [data-store="cart-subtotal"], .js-ajax-cart-list .js-cart-subtotal, .cart-subtotal');
    if (!targetContainer) targetContainer = document.querySelector('[data-store="cart-subtotal"], .js-cart-subtotal');
    if (!targetContainer) {
      if (banner) banner.style.display = 'none';
      return; 
    }

    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'ai-frete-cart-bar';
      banner.className = 'ai-frete-glass';
      
      var textContainer = document.createElement('div');
      textContainer.id = 'ai-frete-text';
      textContainer.style.cssText = 'font-size: 13px; color: #1f2937;';

      var progressBg = document.createElement('div');
      progressBg.className = 'ai-frete-bar-bg';
      
      var progressFill = document.createElement('div');
      progressFill.id = 'ai-frete-fill';
      progressFill.className = 'ai-frete-bar-fill';
      progressFill.style.width = '0%';
      
      var suggestionNode = document.createElement('div');
      suggestionNode.id = 'ai-frete-suggestion';
      suggestionNode.className = 'ai-frete-suggestion';
      suggestionNode.style.display = 'none';

      progressBg.appendChild(progressFill);
      banner.appendChild(textContainer);
      banner.appendChild(progressBg);
      banner.appendChild(suggestionNode);

      targetContainer.parentNode.insertBefore(banner, targetContainer);
    }

    updateLogic();
  }

  function updateLogic() {
    var textNode = document.getElementById('ai-frete-text');
    var progressFill = document.getElementById('ai-frete-fill');
    var suggestionNode = document.getElementById('ai-frete-suggestion');
    var banner = document.getElementById('ai-frete-cart-bar');
    if (!textNode || !progressFill || !banner) return;

    if (shouldHideFrete()) {
      banner.style.display = 'none';
      return;
    } else {
      banner.style.display = 'block';
    }

    var alineQty = countAlineItemsInCart();

    // Se a promoção estiver ativa na loja E houver itens da Aline no carrinho
    if (isAlinePromoActiveOnStore && alineQty > 0) {
      var percent = 0;
      var textHTML = '';
      var suggestionHTML = '';
      var barColor = 'linear-gradient(90deg, #ec4899, #f43f5e)'; // Rosa vibrante Aline Martins
      var nonAlineQty = countNonAlineItemsInCart();
      
      if (alineQty === 1) {
        percent = 25;
        textHTML = 'Adicione mais <strong>1 fundo</strong> da coleção Aline Martins para liberar <strong>5% de desconto</strong>!';
        if (nonAlineQty > 0) {
          suggestionHTML = '💡 <strong>Desconto Progressivo Ativo:</strong> Como você adicionou um fundo da coleção Aline Martins, o frete grátis foi substituído pelo nosso desconto progressivo exclusivo! Adicione mais <strong>1 item Aline Martins</strong> para ativar <strong>5% de desconto</strong> (ou adicione mais itens para o desconto ser ainda maior, chegando a até <strong>15% OFF</strong> nos itens da coleção)!';
        } else {
          suggestionHTML = '💡 <strong>Dica de Ouro:</strong> Com mais 1 fundo da Aline no carrinho, você já ganha 5% de desconto (e adicionando mais itens o desconto pode ser ainda maior, chegando a até 15% OFF)!';
        }
      } else if (alineQty === 2) {
        percent = 50;
        textHTML = '🎉 Você desbloqueou <strong>5% de desconto</strong>! Adicione mais <strong>1</strong> para liberar <strong>10% OFF</strong>!';
        if (nonAlineQty > 0) {
          suggestionHTML = '🎉 <strong>Desconto Progressivo Ativo:</strong> Você adicionou itens da Coleção Aline Martins e ativou <strong>5% OFF</strong> neles! Adicione mais <strong>1 item Aline Martins</strong> para subir o desconto para <strong>10% OFF</strong>!';
        } else {
          suggestionHTML = '💡 <strong>Dica:</strong> Vale muito a pena levar mais 1! Com 3 itens o desconto sobe para 10%!';
        }
      } else if (alineQty === 3) {
        percent = 75;
        textHTML = '🎉 Você desbloqueou <strong>10% de desconto</strong>! Adicione mais <strong>1</strong> para liberar <strong>15% OFF</strong>!';
        if (nonAlineQty > 0) {
          suggestionHTML = '🎉 <strong>Desconto Progressivo Ativo:</strong> Você já garantiu <strong>10% OFF</strong> nos itens Aline Martins! Adicione mais <strong>1 item Aline Martins</strong> para garantir o desconto máximo de <strong>15% OFF</strong>!';
        } else {
          suggestionHTML = '💡 <strong>Dica de Ouro:</strong> Adicione o 4º fundo da Aline no carrinho para o desconto máximo de 15%!';
        }
      } else {
        percent = 100;
        textHTML = '🎉 Parabéns! Você conquistou o desconto máximo de <strong>15% de desconto</strong> na coleção Aline Martins!';
        barColor = 'linear-gradient(90deg, #10b981, #34d399)'; // Verde sucesso
        if (nonAlineQty > 0) {
          suggestionHTML = '🎉 <strong>Desconto Progressivo Ativo:</strong> Parabéns! Você conquistou o desconto máximo de <strong>15% OFF</strong> nos seus itens da Coleção Aline Martins!';
        } else {
          suggestionHTML = '';
        }
      }

      textNode.innerHTML = textHTML;
      progressFill.style.width = percent + '%';
      progressFill.style.background = barColor;
      
      if (suggestionHTML) {
        suggestionNode.innerHTML = suggestionHTML;
        suggestionNode.style.display = 'inline-block';
      } else {
        suggestionNode.style.display = 'none';
      }
      return;
    }


    var cartSubtotal = getCartSubtotal();
    var zipcode = sessionStorage.getItem('cc_shipping_zipcode') || '';
    var rule = getShippingGoal(zipcode);

    if (!rule) {
      // Estado 1: Sem CEP
      var maxGoal = 650; 
      var defaultPercent = Math.min(100, Math.max(5, (cartSubtotal / maxGoal) * 100)); 
      
      textNode.innerHTML = 'Preencha o CEP para ver a meta de <strong>Frete Grátis</strong>';
      progressFill.style.width = defaultPercent + '%';
      progressFill.style.background = 'linear-gradient(90deg, #9ca3af, #d1d5db)'; // Cinza quando não tem cep
      suggestionNode.style.display = 'none';
      
    } else {
      // Estado 2: Com CEP
      var faltam = rule.goal - cartSubtotal;
      var percent = Math.min(100, Math.max(0, (cartSubtotal / rule.goal) * 100));

      if (faltam > 0) {
        textNode.innerHTML = 'Faltam apenas <strong>' + brl(faltam) + '</strong> para <strong>Frete Grátis</strong>!';
        progressFill.style.width = percent + '%';
        progressFill.style.background = 'linear-gradient(90deg, #168ed7, #38bdf8)'; // Azul
        
        // Sugestões inteligentes de itens
        var precoNormal = 94.00;
        var precoAline = 156.00; // O mais barato da coleção Aline Martins
        var dicaHTML = '';
        
        // --- NOVA LÓGICA DA CALCULADORA DINÂMICA ---
        // A fórmula do backend para tecido 120g com altura padrão 1.50 é: (largura * 22.50) + 48.00
        var larguraIdeal = (faltam - 48) / 22.50;
        if (larguraIdeal < 1.0) larguraIdeal = 1.0; // Assume mínimo de 1 metro
        larguraIdeal = Math.ceil(larguraIdeal * 10) / 10; // Arredonda para 1 casa decimal
        var precoCalculado = (larguraIdeal * 22.50) + 48.00;
        
        if (faltam <= precoCalculado && precoCalculado <= precoNormal) {
          dicaHTML = '💡 <strong>Dica de Ouro:</strong> Crie um fundo sob medida! ' +
                     'Se você digitar <strong>1,50m x ' + larguraIdeal.toFixed(2).replace('.', ',') + 'm</strong> ' +
                     'na calculadora do produto, ele sairá por apenas <strong>' + brl(precoCalculado) + '</strong> e já libera seu frete grátis!';
        } else if (faltam <= precoNormal) {
          dicaHTML = '💡 <strong>Dica de Ouro:</strong> Adicione apenas <strong>1 fundo menorzinho (ex: a partir de R$ 94)</strong> e o frete fica por nossa conta!';
        } else if (faltam <= precoAline) {
          dicaHTML = '💡 <strong>Dica:</strong> Falta pouco! Adicionando <strong>1 Aline Martins</strong> ou <strong>2 tradicionais</strong> você já ganha Frete Grátis!';
        } else {
          var qtdNormal = Math.ceil(faltam / precoNormal);
          var qtdAline = Math.ceil(faltam / precoAline);
          dicaHTML = '💡 <strong>Dica:</strong> Adicione mais <strong>' + qtdNormal + ' fundo(s) tradicional(is)</strong> ou <strong>' + qtdAline + ' Aline Martins</strong> para garantir o frete!';
        }
        
        suggestionNode.innerHTML = dicaHTML;
        suggestionNode.style.display = 'inline-block';

      } else {
        textNode.innerHTML = '🎉 Você conquistou o <strong>Frete Grátis</strong> para a região ' + rule.region + '!';
        progressFill.style.width = '100%';
        progressFill.style.background = 'linear-gradient(90deg, #10b981, #34d399)'; // Verde
        suggestionNode.style.display = 'none';
      }
    }
  }

  function bindNativeZipcode() {
    var inputs = document.querySelectorAll('input[name="zipcode"], input[name="postal_code"], #shipping-zipcode');
    inputs.forEach(function(input) {
      if (input.dataset.freteBound) return;
      input.dataset.freteBound = 'true';
      
      if (input.value && input.value.replace(/\D/g, '').length >= 8) {
        sessionStorage.setItem('cc_shipping_zipcode', input.value.replace(/\D/g, ''));
      }

      input.addEventListener('input', function(e) {
        var val = e.target.value.replace(/\D/g, '');
        if (val.length >= 8) {
          sessionStorage.setItem('cc_shipping_zipcode', val.substring(0,8));
          updateLogic();
        } else if (val.length === 0) {
          sessionStorage.removeItem('cc_shipping_zipcode');
          updateLogic();
        }
      });
    });
  }

  function init() {
    renderBar();
    bindNativeZipcode();

    var origFetch = window.fetch;
    window.fetch = function() {
      return origFetch.apply(this, arguments).then(function(res) {
        if (res.url.indexOf('shipping') !== -1 || res.url.indexOf('cart') !== -1 || res.url.indexOf('checkout') !== -1) {
          setTimeout(function() { renderBar(); bindNativeZipcode(); }, 600);
          setTimeout(function() { renderBar(); bindNativeZipcode(); }, 1500); 
        }
        return res;
      });
    };

    if (window.XMLHttpRequest) {
      var origOpen = window.XMLHttpRequest.prototype.open;
      window.XMLHttpRequest.prototype.open = function() {
        this.addEventListener('load', function() {
          if (this.responseURL && (this.responseURL.indexOf('cart') !== -1 || this.responseURL.indexOf('shipping') !== -1)) {
            setTimeout(function() { renderBar(); bindNativeZipcode(); }, 600);
            setTimeout(function() { renderBar(); bindNativeZipcode(); }, 1500);
          }
        });
        origOpen.apply(this, arguments);
      };
    }
    
    var cartContainer = document.querySelector('#ajax-cart-details, .js-ajax-cart-list') || document.body;
    var cartObserver = new MutationObserver(function(mutations) {
      var isOurMutation = false;
      for (var i = 0; i < mutations.length; i++) {
        var added = mutations[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          if (added[j].id === 'ai-frete-cart-bar' || (added[j].querySelector && added[j].querySelector('#ai-frete-cart-bar'))) {
            isOurMutation = true;
            break;
          }
        }
        if (isOurMutation) break;
      }
      if (!isOurMutation) {
        renderBar();
        bindNativeZipcode();
      }
    });
    cartObserver.observe(cartContainer, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

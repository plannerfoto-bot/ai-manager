(function() {
  // Configurações
  var FRETE_ENABLED = __ENABLED__;
  if (!FRETE_ENABLED) return;

  function brl(v) {
    return 'R$ ' + parseFloat(v).toFixed(2).replace('.', ',');
  }

  // Tabela de frete por região
  function getShippingGoal(zipcode) {
    var zip = parseInt(zipcode.replace(/\D/g, ''), 10);
    if (isNaN(zip)) return null;
    
    var zipStr = zipcode.replace(/\D/g, '');
    if (zipStr.length < 8) return null; // CEP incompleto
    
    var p = parseInt(zipStr.substring(0, 5), 10); // Primeiros 5 dígitos

    // Sudeste: SP (01000-19999), RJ (20000-28999), ES (29000-29999), MG (30000-39999)
    if (p >= 1000 && p <= 39999) return { region: 'Sudeste', goal: 300 };
    
    // Sul / Centro-Oeste
    if ((p >= 80000 && p <= 99999) || (p >= 70000 && p <= 76999) || (p >= 78000 && p <= 79999)) return { region: 'Sul/CO', goal: 350 };
    
    // Nordeste
    if (p >= 40000 && p <= 65999) return { region: 'Nordeste', goal: 450 };
    
    // Norte
    if ((p >= 66000 && p <= 69999) || (p >= 77000 && p <= 77999) || (p >= 69000 && p <= 69999)) return { region: 'Norte', goal: 650 };
    
    return null; // Caso não mapeado, cai no default
  }

  function getCartTotal() {
    var total = 0;
    // Pega do DOM (geralmente mais atualizado visualmente)
    var cartTotalEl = document.querySelector('.js-cart-total, .cart-total, [data-cart-total]');
    if (cartTotalEl) {
      var text = cartTotalEl.innerText || '';
      var match = text.match(/[\d.,]+/);
      if (match) {
        total = parseFloat(match[0].replace(/\./g, '').replace(',', '.'));
      }
    }
    // Fallback LS
    if (total === 0 && window.LS && window.LS.cart && window.LS.cart.total) {
      if (typeof window.LS.cart.total === 'number') {
        total = window.LS.cart.total > 100000 ? window.LS.cart.total / 100 : window.LS.cart.total;
      } else if (typeof window.LS.cart.total === 'string') {
        var strMatch = window.LS.cart.total.match(/[\d.,]+/);
        if (strMatch) total = parseFloat(strMatch[0].replace(/\./g, '').replace(',', '.'));
      }
    }
    return isNaN(total) ? 0 : total;
  }

  function getCartItems() {
    // Evita injetar em carrinho vazio
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

  function renderBar() {
    // Não renderiza se não tem itens
    if (getCartItems() === 0) return;

    // Tenta encontrar o container do subtotal/calculadora no carrinho lateral
    var targetContainer = document.querySelector('#ajax-cart-details .js-cart-subtotal, #ajax-cart-details [data-store="cart-subtotal"], .js-ajax-cart-list .js-cart-subtotal, .cart-subtotal');
    
    if (!targetContainer) {
      // Tenta ser menos restritivo se não achar os principais
      targetContainer = document.querySelector('[data-store="cart-subtotal"], .js-cart-subtotal');
    }

    if (!targetContainer) return; // Não achou onde colocar

    var banner = document.getElementById('ai-frete-cart-bar');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'ai-frete-cart-bar';
      // Visual do print: minimalista, fundo branco/transparente, texto discreto
      banner.style.cssText = 'width: 100%; padding: 15px 0 10px 0; display: flex; flex-direction: column; gap: 8px; font-family: inherit; margin-bottom: 10px; border-bottom: 1px solid #eee;';
      
      var progressBg = document.createElement('div');
      progressBg.style.cssText = 'width: 100%; height: 6px; background-color: #e5e7eb; border-radius: 4px; overflow: hidden;';
      
      var progressFill = document.createElement('div');
      progressFill.id = 'ai-frete-fill';
      progressFill.style.cssText = 'width: 0%; height: 100%; background-color: #e88665; border-radius: 4px; transition: width 0.5s ease-out;'; // Cor de abóbora/laranja do print
      
      var textContainer = document.createElement('div');
      textContainer.id = 'ai-frete-text';
      textContainer.style.cssText = 'font-size: 13px; color: #4b5563; text-align: center;';

      progressBg.appendChild(progressFill);
      banner.appendChild(progressBg);
      banner.appendChild(textContainer);

      // Insere logo ANTES do subtotal/frete
      targetContainer.parentNode.insertBefore(banner, targetContainer);
    }

    updateLogic();
  }

  function updateLogic() {
    var textNode = document.getElementById('ai-frete-text');
    var progressFill = document.getElementById('ai-frete-fill');
    if (!textNode || !progressFill) return;

    var cartTotal = getCartTotal();
    var zipcode = sessionStorage.getItem('cc_shipping_zipcode') || '';
    var rule = getShippingGoal(zipcode);

    if (!rule) {
      // Estado 1: Sem CEP (ou CEP inválido)
      // Mostra uma mensagem convidando o cliente a digitar no campo nativo abaixo
      var maxGoal = 650; 
      var defaultPercent = Math.min(100, Math.max(5, (cartTotal / maxGoal) * 100)); // Pelo menos 5% pra mostrar a corzinha
      
      textNode.innerHTML = 'Preencha o CEP abaixo para ver a meta de <strong>Frete Grátis</strong>';
      progressFill.style.width = defaultPercent + '%';
      progressFill.style.backgroundColor = '#e88665'; // Laranja do print
      
    } else {
      // Estado 2: CEP Identificado nativamente
      var faltam = rule.goal - cartTotal;
      var percent = Math.min(100, Math.max(0, (cartTotal / rule.goal) * 100));

      if (faltam > 0) {
        textNode.innerHTML = 'Faltam apenas <strong>' + brl(faltam) + '</strong> para Frete Grátis!';
        progressFill.style.width = percent + '%';
        progressFill.style.backgroundColor = '#e88665'; // Laranja
      } else {
        textNode.innerHTML = '🎉 Parabéns! Você atingiu o <strong>Frete Grátis</strong>!';
        progressFill.style.width = '100%';
        progressFill.style.backgroundColor = '#10b981'; // Verde sucesso
      }
    }
  }

  // Intercepta a digitação nos campos NATIVOS da Nuvemshop (nenhum campo novo é criado)
  function bindNativeZipcode() {
    var inputs = document.querySelectorAll('input[name="zipcode"], input[name="postal_code"], #shipping-zipcode');
    inputs.forEach(function(input) {
      if (input.dataset.freteBound) return;
      input.dataset.freteBound = 'true';
      
      // Salva o valor inicial caso já tenha
      if (input.value && input.value.replace(/\D/g, '').length >= 8) {
        sessionStorage.setItem('cc_shipping_zipcode', input.value.replace(/\D/g, ''));
      }

      input.addEventListener('input', function(e) {
        var val = e.target.value.replace(/\D/g, '');
        if (val.length === 8) {
          sessionStorage.setItem('cc_shipping_zipcode', val);
          updateLogic();
        } else if (val.length === 0) {
          // Se o cliente apagar, volta pro estado padrão
          sessionStorage.removeItem('cc_shipping_zipcode');
          updateLogic();
        }
      });
    });
  }

  // Como o carrinho é recarregado via AJAX, precisamos ficar de olho e re-renderizar
  function init() {
    renderBar();
    bindNativeZipcode();

    // Hook no Fetch API (Nuvemshop usa muito)
    var origFetch = window.fetch;
    window.fetch = function() {
      return origFetch.apply(this, arguments).then(function(res) {
        if (res.url.indexOf('shipping') !== -1 || res.url.indexOf('cart') !== -1 || res.url.indexOf('checkout') !== -1) {
          setTimeout(function() {
            renderBar();
            bindNativeZipcode();
          }, 600); // Dá um tempo pro DOM do carrinho atualizar
          setTimeout(function() { renderBar(); bindNativeZipcode(); }, 1500); // Fallback
        }
        return res;
      });
    };

    // Hook no XHR (Nuvemshop mais antigas ou jQuery)
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
    
    // Pequeno observer focado apenas no painel do carrinho para reagir à abertura
    var cartContainer = document.querySelector('#ajax-cart-details, .js-ajax-cart-list') || document.body;
    var cartObserver = new MutationObserver(function() {
      // Quando o carrinho sofre mutações fortes (ex: itens carregados)
      if (!document.getElementById('ai-frete-cart-bar') && getCartItems() > 0) {
        renderBar();
        bindNativeZipcode();
      }
    });
    // Otimizado: observando um nó menor e não reagindo aos filhos se não necessário
    cartObserver.observe(cartContainer, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

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
    
    // Tratamento para garantir 8 dígitos
    var zipStr = zipcode.replace(/\D/g, '');
    if (zipStr.length < 8) return null; // CEP incompleto
    
    var p = parseInt(zipStr.substring(0, 5), 10); // Primeiros 5 dígitos

    // Sudeste: SP (01000-19999), RJ (20000-28999), ES (29000-29999), MG (30000-39999)
    if (p >= 1000 && p <= 39999) return { region: 'Sudeste', goal: 300 };
    
    // Sul: PR (80000-87999), SC (88000-89999), RS (90000-99999)
    // Centro-Oeste: MS (79000-79999), MT (78000-78899), GO (72800-76999), DF (70000-73399)
    if ((p >= 80000 && p <= 99999) || (p >= 70000 && p <= 76999) || (p >= 78000 && p <= 79999)) return { region: 'Sul / Centro-Oeste', goal: 350 };
    
    // Nordeste: BA (40000-48999), SE (49000-49999), PE (50000-56999), AL (57000-57999), PB (58000-58999), RN (59000-59999), CE (60000-63999), PI (64000-64999), MA (65000-65999)
    if (p >= 40000 && p <= 65999) return { region: 'Nordeste', goal: 450 };
    
    // Norte: AM, PA, etc (66000-69999, 77000-77999) e outros
    if ((p >= 66000 && p <= 69999) || (p >= 77000 && p <= 77999) || (p >= 69000 && p <= 69999)) return { region: 'Norte', goal: 650 };
    
    // Fallback genérico caso não mapeado
    return null;
  }

  function injectBanner() {
    var banner = document.getElementById('ai-frete-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'ai-frete-banner';
      banner.style.cssText = 'position:fixed;top:0;left:0;width:100%;background:linear-gradient(90deg, #1e293b, #0f172a);color:#fff;text-align:center;font-family:sans-serif;font-size:13px;font-weight:600;z-index:999999;box-shadow:0 2px 10px rgba(0,0,0,0.3);transform:translateY(-100%);transition:transform 0.4s ease;display:flex;align-items:center;justify-content:center;flex-direction:column;';
      
      var inner = document.createElement('div');
      inner.id = 'ai-frete-inner';
      inner.style.cssText = 'padding:10px 15px;width:100%;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;gap:6px;max-width:600px;';
      banner.appendChild(inner);

      var progressBarContainer = document.createElement('div');
      progressBarContainer.style.cssText = 'width:100%;background:#334155;height:6px;border-radius:4px;overflow:hidden;position:relative;margin-top:2px;';
      
      var progressBarFill = document.createElement('div');
      progressBarFill.id = 'ai-frete-progress';
      progressBarFill.style.cssText = 'width:0%;height:100%;background:#3b82f6;border-radius:4px;transition:width 0.5s ease, background 0.3s ease;';
      progressBarContainer.appendChild(progressBarFill);
      
      inner.appendChild(progressBarContainer);

      document.body.appendChild(banner);
    }
    return banner;
  }

  function updateBanner() {
    var cartTotal = 0;
    var cartItems = -1; // -1 significa desconhecido

    // 1. Tenta descobrir se o carrinho está vazio olhando o contador do cabeçalho
    var countEl = document.querySelector('.js-cart-count, .js-cart-widget-amount, #cart-count, [data-cart-count]');
    if (countEl) {
      var countMatch = countEl.innerText.match(/\d+/);
      if (countMatch) cartItems = parseInt(countMatch[0], 10);
    }
    
    // Se ainda não achou, olha o LS
    if (cartItems === -1 && window.LS && window.LS.cart && window.LS.cart.items) {
      cartItems = window.LS.cart.items.length;
    }

    var banner = injectBanner();
    
    // Se o carrinho estiver vazio (0 itens), arranca o banner da tela
    if (cartItems === 0) {
      banner.style.transform = 'translateY(-100%)';
      document.body.style.paddingTop = '0px';
      return;
    }

    // Tenta ler elementos do DOM primeiro (é mais confiável visualmente)
    var cartTotalEl = document.querySelector('.js-cart-total, .cart-total, [data-cart-total]');
    if (cartTotalEl) {
      var text = cartTotalEl.innerText || '';
      var match = text.match(/[\d.,]+/);
      if (match) {
        cartTotal = parseFloat(match[0].replace(/\./g, '').replace(',', '.'));
        cartItems = 1;
      }
    } 
    
    // Fallback para LS.cart se o DOM falhar
    if ((isNaN(cartTotal) || cartTotal <= 0) && window.LS && window.LS.cart) {
      if (typeof window.LS.cart.total === 'number') {
        // As vezes Nuvemshop dá em centavos, as vezes direto. Se for absurdamente alto, dividimos.
        cartTotal = window.LS.cart.total;
        if (cartTotal > 100000 && text && text.indexOf(cartTotal) === -1) {
          cartTotal = cartTotal / 100;
        }
      } else if (typeof window.LS.cart.total === 'string') {
        var strMatch = window.LS.cart.total.match(/[\d.,]+/);
        if (strMatch) cartTotal = parseFloat(strMatch[0].replace(/\./g, '').replace(',', '.'));
      }
      cartItems = window.LS.cart.items ? window.LS.cart.items.length : 1;
    }

    // Se a lógica do DOM falhou em ler o total mas sabemos que tem itens, 
    // ou se o fallback do LS não trouxe um total numérico
    if (isNaN(cartTotal) || cartTotal <= 0) {
      cartTotal = 0;
    }

    var inner = document.getElementById('ai-frete-inner');
    var progress = document.getElementById('ai-frete-progress');

    // Remove qualquer mensagem antiga
    var textNode = inner.querySelector('.ai-frete-text');
    if (!textNode) {
      textNode = document.createElement('div');
      textNode.className = 'ai-frete-text';
      inner.insertBefore(textNode, inner.firstChild);
    }

    if (!rule) {
      // Estado 1: Tem item no carrinho, mas não sabemos o CEP
      textNode.innerHTML = '📦 Adicione itens ou calcule o frete para descobrir a meta de <strong>Frete Grátis</strong> da sua região!';
      progress.style.width = '100%';
      progress.style.background = '#64748b'; // Neutro
      banner.style.transform = 'translateY(0)';
      // Se body não tem margem topo para acomodar, adicionamos
      if (document.body.style.paddingTop !== '50px') {
        document.body.style.paddingTop = '50px';
      }
      return;
    }

    // Estado 2: Sabemos a região e o carrinho
    var faltam = rule.goal - cartTotal;
    var percent = Math.min(100, Math.max(0, (cartTotal / rule.goal) * 100));

    if (faltam > 0) {
      textNode.innerHTML = 'Faltam apenas <strong style="color:#60a5fa;">' + brl(faltam) + '</strong> para <strong>Frete Grátis</strong> na região ' + rule.region + '!';
      progress.style.width = percent + '%';
      progress.style.background = '#3b82f6';
    } else {
      textNode.innerHTML = '🎉 Parabéns! Você atingiu o valor de <strong>Frete Grátis</strong> para ' + rule.region + '!';
      progress.style.width = '100%';
      progress.style.background = '#22c55e'; // Verde sucesso
    }

    banner.style.transform = 'translateY(0)';
    if (document.body.style.paddingTop !== '50px') {
      document.body.style.paddingTop = '50px';
    }
  }

  // Monitorar digitação de CEP
  function bindZipcodeListeners() {
    var inputs = document.querySelectorAll('input[name="zipcode"], input[name="postal_code"], #shipping-zipcode');
    inputs.forEach(function(input) {
      if (input.dataset.freteBound) return;
      input.dataset.freteBound = 'true';
      
      input.addEventListener('input', function(e) {
        var val = e.target.value.replace(/\D/g, '');
        if (val.length >= 8) {
          sessionStorage.setItem('cc_shipping_zipcode', val);
          updateBanner();
        }
      });
      
      // Se o campo já estiver preenchido ao carregar a página
      var val = input.value.replace(/\D/g, '');
      if (val.length >= 8) {
        sessionStorage.setItem('cc_shipping_zipcode', val);
      }
    });
  }

  // Inicialização e Observadores
  function init() {
    bindZipcodeListeners();
    updateBanner();

    // Observa mudanças na DOM com Debounce para evitar travamentos
    var debounceTimer;
    var observer = new MutationObserver(function(mutations) {
      // Ignora as mudanças que o próprio banner faz para evitar loop infinito
      var ignore = false;
      for (var i = 0; i < mutations.length; i++) {
        var t = mutations[i].target;
        if (t.id === 'ai-frete-banner' || (t.closest && t.closest('#ai-frete-banner'))) {
          ignore = true;
          break;
        }
      }
      if (ignore) return;

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function() {
        bindZipcodeListeners();
        updateBanner();
      }, 600); // Roda apenas a cada 600ms após a última mudança
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Se o cliente calcular o frete e houver chamada AJAX via fetch
    var origFetch = window.fetch;
    window.fetch = function() {
      return origFetch.apply(this, arguments).then(function(res) {
        if (res.url.indexOf('shipping') !== -1 || res.url.indexOf('cart') !== -1) {
          setTimeout(updateBanner, 500);
          setTimeout(updateBanner, 1500); // Garante que lê após o DOM atualizar
        }
        return res;
      });
    };

    // A Nuvemshop usa muito jQuery (XHR) para adicionar/remover do carrinho
    if (window.XMLHttpRequest) {
      var origOpen = window.XMLHttpRequest.prototype.open;
      window.XMLHttpRequest.prototype.open = function() {
        this.addEventListener('load', function() {
          if (this.responseURL && (this.responseURL.indexOf('cart') !== -1 || this.responseURL.indexOf('shipping') !== -1)) {
            setTimeout(updateBanner, 500);
            setTimeout(updateBanner, 1500); // Garante que lê após o DOM atualizar
          }
        });
        origOpen.apply(this, arguments);
      };
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

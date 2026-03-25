(function(){
  var CALCULATOR_ENABLED = __ENABLED__;
  var API_BASE_URL = '__PUBLIC_URL__';

  function isProductPage(){
    return window.location.pathname.indexOf('/produtos/') !== -1 || 
           window.location.pathname.indexOf('/products/') !== -1 || 
           !!document.querySelector('[data-product-form]');
  }

  function getProductImage(){
    var meta = document.querySelector('meta[property="og:image"]');
    return meta ? meta.content : '';
  }

  function brl(v){ return 'R$ ' + parseFloat(v).toFixed(2).replace('.', ','); }
  function dim(v){ return parseFloat(v).toFixed(2).replace('.', ',') + 'm'; }

  function html(){
    var d = document.createElement('div');
    d.id = 'cloth-calc-widget';
    d.innerHTML = '<style>#cloth-calc-widget{margin:16px 0 8px;border:1.5px solid #2563eb44;border-radius:18px;background:linear-gradient(135deg,#0f172a,#1e293b);padding:18px 20px 16px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;max-width:440px;box-shadow:0 4px 24px #2563eb18}#cloth-calc-header{display:flex;align-items:center;gap:10px;margin-bottom:14px}#cloth-calc-icon{background:#2563eb22;border-radius:10px;padding:7px;display:flex}#cloth-calc-icon svg{width:18px;height:18px;stroke:#60a5fa;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}#cloth-calc-title{font-size:14px;font-weight:800;color:#fff;margin:0}#cloth-calc-subtitle{font-size:10px;color:#60a5fa;margin:0;opacity:.75}#cloth-calc-inputs{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px}.cloth-calc-field label{display:flex;align-items:center;gap:4px;font-size:10px;text-transform:uppercase;font-weight:700;color:#94a3b8;margin-bottom:5px;letter-spacing:.05em}.cloth-calc-field label svg{width:11px;height:11px;stroke:#60a5fa;fill:none;stroke-width:2;stroke-linecap:round}.cloth-calc-field input{width:100%;box-sizing:border-box;background:#0f172a;border:1.5px solid #334155;border-radius:10px;padding:9px 12px;font-size:14px;color:#fff;outline:none;transition:border-color .2s;-webkit-appearance:none}.cloth-calc-field input:focus{border-color:#2563eb99;background:#1e293b}.cloth-calc-field input::placeholder{color:#475569}#cloth-calc-grams{display:flex;gap:8px;margin-bottom:14px}#cloth-calc-grams label{flex:1;background:#0f172a;border:1.5px solid #334155;border-radius:8px;padding:8px;text-align:center;font-size:12px;color:#94a3b8;font-weight:700;cursor:pointer;transition:all .2s}#cloth-calc-grams input{display:none}#cloth-calc-grams input:checked+label{background:#2563eb22;border-color:#2563eb;color:#60a5fa}#cloth-calc-btn{width:100%;padding:11px;background:#2563eb;border:none;border-radius:12px;font-size:13px;font-weight:800;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;letter-spacing:.04em;transition:background .2s,transform .15s}#cloth-calc-btn:hover{background:#1d4ed8}#cloth-calc-btn:active{transform:scale(.97)}#cloth-calc-btn:disabled{opacity:0.6;cursor:not-allowed}#cloth-calc-btn svg{width:14px;height:14px;stroke:#fff;fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}#cloth-calc-result{margin-top:12px;animation:clothIn .3s ease}@keyframes clothIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}#cloth-calc-result.error{background:#450a0a44;border:1.5px solid #ef444455;border-radius:12px;padding:12px 14px;display:flex;align-items:flex-start;gap:8px}#cloth-calc-result.error svg{width:15px;height:15px;stroke:#f87171;fill:none;stroke-width:2;flex-shrink:0;margin-top:1px}#cloth-calc-result.error span{font-size:12px;color:#f87171;line-height:1.5}#cloth-calc-success{background:#052e1644;border:1.5px solid #22c55e44;border-radius:12px;padding:14px 16px}#cloth-calc-price{font-size:28px;font-weight:900;color:#fff;letter-spacing:-.03em;line-height:1;margin-bottom:10px}#cloth-calc-buy-btn{width:100%;padding:12px;background:linear-gradient(90deg,#16a34a,#15803d);border:none;border-radius:12px;font-size:13px;font-weight:800;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 12px #16a34a44;transition:opacity .2s,transform .15s}#cloth-calc-buy-btn:hover{opacity:.9}#cloth-calc-buy-btn:active{transform:scale(.97)}#cloth-calc-footer{text-align:center;font-size:10px;color:#475569;margin-top:8px}#cloth-calc-preview{margin-top:10px;text-align:center}</style>' +
    '<div id="cloth-calc-header"><div id="cloth-calc-icon"><svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></div><div><p id="cloth-calc-title">Painel Personalizado</p><p id="cloth-calc-subtitle">Digite as medidas e confira o enquadramento</p></div></div>' +
    '<div id="cloth-calc-inputs"><div class="cloth-calc-field"><label><svg viewBox="0 0 24 24"><line x1="5" y1="3" x2="5" y2="21"/><line x1="19" y1="3" x2="19" y2="21"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Altura (m)</label><input id="cloth-calc-alt" type="text" inputmode="decimal" placeholder="ex: 1,70"></div><div class="cloth-calc-field"><label><svg viewBox="0 0 24 24"><line x1="3" y1="5" x2="21" y2="5"/><line x1="3" y1="19" x2="21" y2="19"/><line x1="12" y1="5" x2="12" y2="19"/></svg>Largura (m)</label><input id="cloth-calc-larg" type="text" inputmode="decimal" placeholder="ex: 2,50"></div></div>' +
    '<div id="cloth-calc-grams">' +
      '<input type="radio" id="gram120" name="cc-gram" value="120g" checked><label for="gram120">Tecido 120g</label>' +
      '<input type="radio" id="gram160" name="cc-gram" value="160g"><label for="gram160">Tecido 160g</label>' +
    '</div>' +
    '<button id="cloth-calc-btn"><svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>CALCULAR VALOR</button>' +
    '<div id="cloth-calc-result" style="display:none"></div>' +
    '<p id="cloth-calc-footer">Dimensões mínimas variadas, menor lado até 3,00m</p>';
    return d;
  }

  function renderError(e) {
    var el = document.getElementById('cloth-calc-result');
    el.style.display = 'block';
    el.className = 'error';
    el.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span>'+e+'</span>';
  }

  function renderSuccess(price, variantId, a, l, g) {
    var el = document.getElementById('cloth-calc-result');
    el.style.display = 'block';
    el.className = '';
    
    var imgSrc = getProductImage();
    var previewHtml = '';
    if (imgSrc) {
      previewHtml = '<div id="cloth-calc-preview">' +
        '<img src="'+imgSrc+'" style="width:100%; max-height:140px; aspect-ratio:'+l+'/'+a+'; object-fit:fill; border:2px dashed #334155; border-radius:6px;" />' +
        '<div style="font-size:10px; color:#64748b; margin-top:6px;">Preview de Enquadramento ('+dim(l)+' L x '+dim(a)+' A)</div>' +
      '</div>';
    }

    el.innerHTML = '<div id="cloth-calc-success">' +
      '<p style="font-size:10px; color:#4ade80; text-transform:uppercase; font-weight:700; margin-bottom:4px; letter-spacing:0.05em;">Medida Pronta para Compra</p>' +
      '<p id="cloth-calc-price">'+brl(price)+'</p>' +
      previewHtml +
      '<button id="cloth-calc-buy-btn" data-variant="'+variantId+'"><svg viewBox="0 0 24 24" width="16" height="16" style="stroke:white;fill:none;stroke-width:2;"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>COMPRAR AGORA</button>' +
    '</div>';

    document.getElementById('cloth-calc-buy-btn').addEventListener('click', function(){
      addToCart(variantId);
    });
  }

  function addToCart(variantId) {
    var form = document.querySelector('form[data-product-form]') || document.querySelector('form[action*="/comprar"]');
    var actionUrl = form && form.action ? form.action : '/comprar';

    // Cria form fantasma para garantir POST limpo, livre do LS.variants do tema
    var ghost = document.createElement('form');
    ghost.method = 'POST';
    ghost.action = actionUrl;
    ghost.style.display = 'none';

    // Para variações Nuvemshop, usar 'add_to_cart'
    var input1 = document.createElement('input');
    input1.type = 'hidden';
    input1.name = 'add_to_cart';
    input1.value = variantId;
    ghost.appendChild(input1);

    var input2 = document.createElement('input');
    input2.type = 'hidden';
    input2.name = 'variant_id'; 
    input2.value = variantId;
    ghost.appendChild(input2);

    var input3 = document.createElement('input');
    input3.type = 'hidden';
    input3.name = 'quantity'; 
    input3.value = '1';
    ghost.appendChild(input3);

    document.body.appendChild(ghost);
    ghost.submit(); // Submissão nativa pro backend da Nuvemshop
  }

  function bind(){
    var b = document.getElementById('cloth-calc-btn');
    if(!b) return;

    b.addEventListener('click', function(){
      var a = parseFloat((document.getElementById('cloth-calc-alt').value || '').replace(',', '.'));
      var l = parseFloat((document.getElementById('cloth-calc-larg').value || '').replace(',', '.'));
      var g = document.querySelector('input[name="cc-gram"]:checked').value;
      
      if(isNaN(a) || isNaN(l)){
        renderError('Preencha altura e largura validos.');
        return;
      }

      b.disabled = true;
      var originalText = b.innerHTML;
      b.innerHTML = '<span style="opacity: 0.8;">Calculando...</span>';

      // Chamar API
      var storeId = (window.LS && LS.store && LS.store.id) ? LS.store.id : '';
      var productId = (window.LS && LS.product && LS.product.id) ? LS.product.id : '';
      
      // Fallback pra productId na URL ou meta se LS falhar
      if (!productId) {
         var meta = document.querySelector('meta[property="product:id"]');
         if(meta) productId = meta.content;
      }

      fetch(API_BASE_URL + '/api/create-variant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-store-id': storeId
        },
        body: JSON.stringify({
          productId: productId,
          width: l,
          height: a,
          gramatura: g
        })
      })
      .then(res => res.json())
      .then(data => {
        b.disabled = false;
        b.innerHTML = originalText;
        if(data.error) throw new Error(data.error);
        renderSuccess(data.price, data.variant_id, a, l, g);
      })
      .catch(err => {
        b.disabled = false;
        b.innerHTML = originalText;
        renderError(err.message || 'Erro ao comunicar com provedor.');
      });
    });

    ['cloth-calc-alt', 'cloth-calc-larg'].forEach(function(id){
      var el = document.getElementById(id);
      if(el) el.addEventListener('keydown', function(e){
        if(e.key === 'Enter') b.click();
      });
    });

    // Event de distorção fluida (auto-preview enquanto digita, se o preview já estiver aparente)
    // Mas o preview so aparece depois do calcular por hora.
  }

  if(!isProductPage()) return;

  function findTarget(){
    var c = document.querySelector('.js-product-buy-container') || document.querySelector('.product-buy-container');
    if (c) return { el: c, act: 'before' };

    var f = document.querySelector('#product_form') || document.querySelector('[data-product-form]') || document.querySelector('.js-product-form');
    var b = document.querySelector('.js-addtocart') || (f ? f.querySelector('button') : null);

    if (b) {
      var curr = b;
      while (curr.parentElement && curr.parentElement.tagName !== 'FORM' && curr.parentElement.tagName !== 'BODY') {
        var p = curr.parentElement;
        if (p.querySelector('img') || p.clientHeight > 250 || p.hasAttribute('data-product-form')) break;
        if (window.getComputedStyle(p).position === 'fixed') break;
        curr = p;
      }
      return { el: curr, act: 'before', wrap: true };
    }

    if (f) return { el: f, act: 'prepend' };
    return null;
  }

  function inject(){
    var w=document.getElementById('cloth-calc-widget');
    if(!CALCULATOR_ENABLED){ if(w) w.remove(); return; }
    if(w) return;
    var t=findTarget();
    if(!t) return;
    var node=html();
    if (t.wrap) {
      node.style.display = 'block';
      node.style.width = '100%';
      node.style.flexBasis = '100%';
      node.style.clear = 'both';
      node.style.marginBottom = '15px';
    }
    if(t.act==='before' && t.el.parentNode){
      t.el.parentNode.insertBefore(node,t.el);
    }else{
      t.el.prepend ? t.el.prepend(node) : t.el.appendChild(node);
    }
    bind();
  }

  document.readyState==='loading' ? document.addEventListener('DOMContentLoaded',inject) : inject();
  setInterval(inject,2500);
})();

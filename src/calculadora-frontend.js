(function(){
  var CALCULATOR_ENABLED = __ENABLED__;
  var API_BASE_URL = '__PUBLIC_URL__';
  // ⚙️ Número do WhatsApp para cotação de medidas especiais
  var WHATSAPP_NUMBER = '__WHATSAPP__';

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
    d.innerHTML = '<style>#cloth-calc-widget{margin:16px 0 8px;border:1.5px solid #2563eb44;border-radius:18px;background:linear-gradient(135deg,#0f172a,#1e293b);padding:18px 20px 16px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;max-width:440px;box-shadow:0 4px 24px #2563eb18}#cloth-calc-header{display:flex;align-items:center;gap:10px;margin-bottom:14px}#cloth-calc-icon{background:#2563eb22;border-radius:10px;padding:7px;display:flex}#cloth-calc-icon svg{width:18px;height:18px;stroke:#60a5fa;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}#cloth-calc-title{font-size:14px;font-weight:800;color:#fff;margin:0}#cloth-calc-subtitle{font-size:10px;color:#60a5fa;margin:0;opacity:.75}#cloth-calc-inputs{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px}.cloth-calc-field label{display:flex;align-items:center;gap:4px;font-size:10px;text-transform:uppercase;font-weight:700;color:#94a3b8;margin-bottom:5px;letter-spacing:.05em}.cloth-calc-field label svg{width:11px;height:11px;stroke:#60a5fa;fill:none;stroke-width:2;stroke-linecap:round}.cloth-calc-field input{width:100%;box-sizing:border-box;background:#0f172a;border:1.5px solid #334155;border-radius:10px;padding:9px 12px;font-size:14px;color:#fff;outline:none;transition:border-color .2s;-webkit-appearance:none}.cloth-calc-field input:focus{border-color:#2563eb99;background:#1e293b}.cloth-calc-field input::placeholder{color:#475569}#cloth-calc-btn{width:100%;padding:11px;background:#2563eb;border:none;border-radius:12px;font-size:13px;font-weight:800;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;letter-spacing:.04em;transition:background .2s,transform .15s;margin-bottom:8px}#cloth-calc-btn:hover{background:#1d4ed8}#cloth-calc-btn:active{transform:scale(.97)}#cloth-calc-btn:disabled{opacity:0.6;cursor:not-allowed}#cloth-calc-btn svg{width:14px;height:14px;stroke:#fff;fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}#cloth-calc-result{margin-top:12px;animation:clothIn .3s ease}@keyframes clothIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}#cloth-calc-result.error{background:#450a0a44;border:1.5px solid #ef444455;border-radius:12px;padding:12px 14px;display:flex;align-items:flex-start;gap:8px}#cloth-calc-result.error svg{width:15px;height:15px;stroke:#f87171;fill:none;stroke-width:2;flex-shrink:0;margin-top:1px}#cloth-calc-result.error span{font-size:12px;color:#f87171;line-height:1.5}#cloth-calc-success{background:#052e1644;border:1.5px solid #22c55e44;border-radius:12px;padding:14px 16px}#cloth-calc-preview{margin-bottom:12px;text-align:center}.cc-preview-box{display:flex;align-items:center;justify-content:center;width:100%;height:140px;overflow:hidden;border:2px dashed #334155;border-radius:6px;background:#0f172a}.cc-preview-box img{max-width:100%;max-height:100%;object-fit:cover}.cc-badge-seamless{display:inline-flex;align-items:center;gap:5px;background:#0369a122;border:1px solid #0ea5e944;border-radius:8px;padding:6px 10px;font-size:11px;color:#38bdf8;font-weight:700;margin-bottom:10px}.cc-badge-seamless svg{width:12px;height:12px;stroke:#38bdf8;fill:none;stroke-width:2}.cc-info-ratio{display:flex;align-items:center;gap:6px;background:#33415544;padding:8px 10px;border-radius:8px;font-size:11px;color:#94a3b8;margin-bottom:12px;line-height:1.3;border-left:3px solid #60a5fa}#cloth-calc-footer{text-align:center;font-size:10px;color:#475569;margin-top:8px}@keyframes cc-blink{0%{outline:2px solid transparent;box-shadow:0 0 0 0 rgba(37,99,235,0);transform:scale(1)}50%{outline:4px solid #3b82f6;box-shadow:0 0 20px 8px rgba(59,130,246,0.6);transform:scale(1.05)}100%{outline:2px solid transparent;box-shadow:0 0 0 0 rgba(37,99,235,0);transform:scale(1)}}@keyframes cc-arrow-move{0%{transform:translateY(-15px);opacity:0}50%{opacity:1}100%{transform:translateY(2px);opacity:0}}.cc-blink-effect{animation:cc-blink 0.8s ease-in-out infinite;border-radius:8px;scroll-margin-top:140px;position:relative!important;z-index:900!important}.cc-arrow-indicator{position:absolute;width:30px;height:30px;fill:#ef4444;z-index:1001;pointer-events:none;animation:cc-arrow-move 1s infinite;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))}</style>' +
    '<div id="cloth-calc-header"><div id="cloth-calc-icon"><svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></div><div><p id="cloth-calc-title">Medidas Personalizadas</p><p id="cloth-calc-subtitle">Digite as medidas e confira o enquadramento</p></div></div>' +
    '<div id="cloth-calc-inputs"><div class="cloth-calc-field"><label><svg viewBox="0 0 24 24"><line x1="5" y1="3" x2="5" y2="21"/><line x1="19" y1="3" x2="19" y2="21"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Altura (m)</label><input id="cloth-calc-alt" type="text" inputmode="decimal" placeholder="0,00"></div><div class="cloth-calc-field"><label><svg viewBox="0 0 24 24"><line x1="3" y1="5" x2="21" y2="5"/><line x1="3" y1="19" x2="21" y2="19"/><line x1="12" y1="5" x2="12" y2="19"/></svg>Largura (m)</label><input id="cloth-calc-larg" type="text" inputmode="decimal" placeholder="0,00"></div></div>' +
    '<button type="button" id="cloth-calc-btn"><svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>SIMULAR PREÇOS</button>' +
    '<div id="cloth-calc-result"></div>' +
    '<p id="cloth-calc-footer">Dimensões mínimas variadas, menor lado até 3,00m</p>';
    
    var container = document.querySelector('.js-product-form') || document.querySelector('form[data-node="product-form"]') || document.body;
    var target = container.querySelector('.js-product-variants') || container.querySelector('.product-variants') || container;
    target.parentNode.insertBefore(d, target.nextSibling);

    var btn = d.querySelector('#cloth-calc-btn');
    var inputAlt = d.querySelector('#cloth-calc-alt');
    var inputLarg = d.querySelector('#cloth-calc-larg');

    // Previne o Enter de adicionar ao carrinho e redireciona para a Simulação
    var handleEnter = function(e){
      if(e.key === 'Enter'){
        e.preventDefault();
        e.stopPropagation();
        btn.click();
      }
    };
    inputAlt.addEventListener('keydown', handleEnter);
    inputLarg.addEventListener('keydown', handleEnter);
    return d;
  }

  function getOriginalOrientation() {
    var mainImg = document.querySelector('.js-product-active-image, .js-product-main-image, #product_image, .js-main-image-src, .product-image img, [data-main-product-image], .js-product-slide-link img');
    if (mainImg && mainImg.naturalWidth > 0 && mainImg.naturalHeight > 0) {
      return mainImg.naturalWidth > mainImg.naturalHeight ? 'landscape' : 'portrait';
    }

    var variants = document.querySelectorAll('.js-variant-option, .variant-option, label, .js-instock-variant');
    var foundLandscape = 0;
    var foundPortrait = 0;
    for (var i = 0; i < variants.length; i++) {
      var t = variants[i].innerText;
      var match = t.match(/(\d+,\d+)\s*[xX]\s*(\d+,\d+)/);
      if (match) {
        var w = parseFloat(match[1].replace(',', '.'));
        var h = parseFloat(match[2].replace(',', '.'));
        if (w > h) foundLandscape++;
        else if (h > w) foundPortrait++;
      }
    }
    if (foundLandscape > foundPortrait) return 'landscape';
    if (foundPortrait > foundLandscape) return 'portrait';
    return 'unknown';
  }

  function renderError(e) {
    // Se for erro de dimensão excedida, redireciona para WhatsApp
    var isDimensionError = e && (e.indexOf('3,00') !== -1 || e.indexOf('ultrapassar') !== -1 || e.indexOf('dimensao') !== -1 || e.indexOf('dimensão') !== -1);
    if (isDimensionError) {
      renderWhatsApp();
      return;
    }

    // Se for aviso de medida padrão já existente
    var isStandardInfo = e && e.indexOf('disponível nas opções padrão') !== -1;
    if (isStandardInfo) {
       var resultEl = document.getElementById('cloth-calc-result');
       resultEl.style.display = 'block';
       resultEl.className = ''; 
       resultEl.innerHTML = '<div style="background:#0f172a;border:1.5px solid #60a5fa66;border-radius:12px;padding:12px 14px;display:flex;align-items:flex-start;gap:10px;">' +
         '<svg viewBox="0 0 24 24" width="18" height="18" style="stroke:#60a5fa;fill:none;stroke-width:2.5;flex-shrink:0;margin-top:1px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>' +
         '<span style="font-size:12px;color:#cbd5e1;line-height:1.5;">'+e+'</span>' +
       '</div>';
       return;
    }

    var el = document.getElementById('cloth-calc-result');
    el.style.display = 'block';
    el.className = 'error';
    el.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span>'+e+'</span>';
  }

  function renderWhatsApp() {
    var el = document.getElementById('cloth-calc-result');
    el.style.display = 'block';
    el.className = '';
    var a = parseFloat((document.getElementById('cloth-calc-alt').value || '').replace(',', '.'));
    var l = parseFloat((document.getElementById('cloth-calc-larg').value || '').replace(',', '.'));
    var msg = encodeURIComponent('Olá! Tenho interesse em uma medida especial de ' + (isNaN(l)?'?':l.toFixed(2).replace('.',',')) + 'm x ' + (isNaN(a)?'?':a.toFixed(2).replace('.',',')) + 'm. Gostaria de solicitar uma cotação.');
    var waUrl = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + msg;
    el.innerHTML = '<div style="background:#052e1644;border:1.5px solid #22c55e44;border-radius:12px;padding:16px;">' +
      '<div style="display:flex;align-items:flex-start;gap:10px;">' +
        '<svg viewBox="0 0 24 24" width="20" height="20" style="stroke:#facc15;fill:none;stroke-width:2;flex-shrink:0;margin-top:2px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' +
        '<div style="flex:1;">' +
          '<p style="color:#fde68a;font-size:13px;font-weight:700;margin:0 0 4px;">Medida especial detectada!</p>' +
          '<p style="color:#94a3b8;font-size:12px;margin:0 0 12px;line-height:1.6;">Esta medida está fora do padrão do nosso simulador. Entre em contato pelo WhatsApp para receber uma <strong style="color:#fff;">cotação personalizada</strong>.</p>' +
          '<a href="' + waUrl + '" target="_blank" style="display:inline-flex;align-items:center;gap:8px;background:#16a34a;color:#fff;text-decoration:none;border-radius:10px;padding:10px 16px;font-size:13px;font-weight:800;">' +
            '<svg viewBox="0 0 24 24" width="16" height="16" style="fill:#fff;"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>' +
            'Solicitar Cotação no WhatsApp' +
          '</a>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function renderSuccess(p120, p160, a, l, measureType) {
    var el = document.getElementById('cloth-calc-result');
    el.style.display = 'block';
    el.className = '';
    
    var imgSrc = getProductImage();
    
    
    var previewHtml = '';
    if (imgSrc) {
      // Calcula o tamanho do box respeitando a proporção L:A da medida
      // Limita ao máximo de 240px de largura ou 140px de altura
      var maxW = 240, maxH = 140;
      var ratio = l / a; // largura/altura
      var boxW, boxH;
      if (ratio >= 1) {
        // Mais largo que alto: ancora na largura máxima
        boxW = maxW;
        boxH = Math.round(maxW / ratio);
        if (boxH > maxH) { boxH = maxH; boxW = Math.round(maxH * ratio); }
      } else {
        // Mais alto que largo: ancora na altura máxima
        boxH = maxH;
        boxW = Math.round(maxH * ratio);
        if (boxW > maxW) { boxW = maxW; boxH = Math.round(maxW / ratio); }
      }
      previewHtml = '<div id="cloth-calc-preview">' +
        '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:' + maxH + 'px;">' +
          '<img src="' + imgSrc + '" style="width:' + boxW + 'px;height:' + boxH + 'px;object-fit:fill;border:2px dashed #334155;border-radius:6px;" />' +
        '</div>' +
        '<div style="font-size:10px;color:#64748b;margin-top:6px;">Preview do corte (' + dim(l) + ' L x ' + dim(a) + ' A)</div>' +
      '</div>';
    }

    // --- Bloco de escolha de tecido ---
    var isSpecial = measureType === 'special_seamless';
    var tecidoHtml = '<div style="display:flex;gap:10px;margin-top:8px;">';

    if (isSpecial && (p120 || p160)) {
      var specialPrice = p120 || p160;
      var specialGram = p120 ? '120g' : '160g';
      // Medida especial: sem emenda
      tecidoHtml =
        '<div class="cc-badge-seamless">' +
          '<svg viewBox="0 0 24 24"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>' +
          'Esta medida é SEM EMENDA – disponível apenas em TECIDO ' + specialGram +
        '</div>' +
        '<div style="display:flex;gap:10px;margin-top:8px;">' +
          '<div style="flex:1;background:#0f172a;border:1.5px solid #0ea5e966;border-radius:10px;padding:12px;text-align:center;">' +
            '<div style="font-size:11px;color:#38bdf8;font-weight:700;margin-bottom:4px;">TECIDO ' + specialGram + '</div>' +
            '<div style="font-size:9px;color:#64748b;margin-bottom:6px;">✨ Sem Emenda</div>' +
            '<div style="font-size:20px;color:#fff;font-weight:900;margin-bottom:10px;letter-spacing:-0.5px;">' + brl(specialPrice) + '</div>' +
            '<button class="cc-buy-btn" data-gram="' + specialGram + '" style="width:100%;padding:10px;background:linear-gradient(135deg,#0284c7,#0ea5e9);color:#fff;border:none;border-radius:8px;font-weight:800;font-size:12px;cursor:pointer;transition:0.2s;">GERAR OPÇÃO</button>' +
          '</div>' +
        '</div>';
    } else {
      // Medida padrão ou quando p120 está indisponível
      if (p120) {
        tecidoHtml += 
          '<div style="flex:1;background:#0f172a;border:1px solid #334155;border-radius:10px;padding:12px;text-align:center;">' +
            '<div style="font-size:11px;color:#94a3b8;font-weight:700;margin-bottom:4px;">TECIDO 120g</div>' +
            '<div style="font-size:20px;color:#fff;font-weight:900;margin-bottom:10px;letter-spacing:-0.5px;">' + brl(p120) + '</div>' +
            '<button class="cc-buy-btn" data-gram="120g" style="width:100%;padding:10px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-weight:800;font-size:12px;cursor:pointer;transition:0.2s;">GERAR OPÇÃO</button>' +
          '</div>';
      }
      if (p160) {
        tecidoHtml += 
          '<div style="flex:1;background:#0f172a;border:1px solid #334155;border-radius:10px;padding:12px;text-align:center;">' +
            '<div style="font-size:11px;color:#94a3b8;font-weight:700;margin-bottom:4px;">TECIDO 160g</div>' +
            '<div style="font-size:20px;color:#fff;font-weight:900;margin-bottom:10px;letter-spacing:-0.5px;">' + brl(p160) + '</div>' +
            '<button class="cc-buy-btn" data-gram="160g" style="width:100%;padding:10px;background:#16a34a;color:#fff;border:none;border-radius:8px;font-weight:800;font-size:12px;cursor:pointer;transition:0.2s;">GERAR OPÇÃO</button>' +
          '</div>';
      }
      tecidoHtml += '</div>';

      if (!p120 && !p160) {
        tecidoHtml = '<div style="color:#ef4444;text-align:center;padding:10px;">Nenhuma opção de tecido disponível para esta medida.</div>';
      }
    }

    el.innerHTML = '<div id="cloth-calc-success">' +
      '<p style="font-size:10px;color:#4ade80;text-transform:uppercase;font-weight:700;margin-bottom:8px;letter-spacing:0.05em;">Medidas aprovadas! Escolha o tecido:</p>' +
      previewHtml +
      tecidoHtml +
    '</div>';

    var btns = document.querySelectorAll('.cc-buy-btn');
    for(var i=0; i<btns.length; i++) {
        btns[i].addEventListener('click', function(e) {
            var currentBtn = e.currentTarget || this;
            var gram = currentBtn.getAttribute('data-gram');
            handleBuyClick(gram, l, a, currentBtn);
        });
    }
  }

  function handleBuyClick(gramatura, width, height, btn) {
    btn.disabled = true;
    var ogHtml = btn.innerHTML;
    btn.innerHTML = 'Gerando...';

    var storeId = (window.LS && LS.store && LS.store.id) ? LS.store.id : '';
    var productId = (window.LS && LS.product && LS.product.id) ? LS.product.id : '';
    if (!productId) { var meta = document.querySelector('meta[property="product:id"]'); if(meta) productId = meta.content; }
    
    // Captura o layout selecionado no tema do produto
    var layout = getSelectedLayout();

    fetch(API_BASE_URL + '/api/create-variant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-store-id': storeId },
        body: JSON.stringify({ productId: productId, width: width, height: height, gramatura: gramatura, layout: layout })
    })
    .then(res => res.json())
    .then(data => {
        if(data.error) { alert(data.error); btn.disabled=false; btn.innerHTML=ogHtml; return; }
        
        var resultDiv = document.getElementById('cloth-calc-result');
        resultDiv.innerHTML = '<div style="background:#052e1644;border:1.5px solid #22c55e44;border-radius:12px;padding:16px;text-align:center;animation:clothIn 0.3s ease;">' +
           '<svg viewBox="0 0 24 24" width="36" height="36" style="stroke:#4ade80;fill:none;stroke-width:2;margin-bottom:12px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' +
           '<h3 style="color:#fff;font-size:16px;margin:0 0 8px;">Opção Criada!</h3>' +
           '<p style="color:#94a3b8;font-size:12px;margin:0 0 12px;line-height:1.5;">A página será atualizada agora.<br/><strong style="color:#60a5fa;">Fique de olho no menu de medidas</strong> que irá piscar para você selecionar.</p>' +
           '<div style="font-size:11px;color:#60a5fa;opacity:0.8;">Atualizando...</div>' +
        '</div>';
        
        sessionStorage.setItem('cc_just_created', 'true');
        sessionStorage.setItem('cc_last_l', width.toFixed(2).replace('.', ','));
        sessionStorage.setItem('cc_last_a', height.toFixed(2).replace('.', ','));

        setTimeout(function(){
            window.location.reload();
        }, 4000);
    })
    .catch(err => {
        alert('Erro ao criar variação na loja.');
        btn.disabled = false;
        btn.innerHTML = ogHtml;
    });
  }
  function bind(){
    var b = document.getElementById('cloth-calc-btn');
    if(!b) return;

    function getAvailableProductSizes() {
      var sizes = [];
      var sel = '.js-variant-option, .js-insta-variant, .variant-option, label, .js-product-variant-option, [data-variant-option]';
      document.querySelectorAll(sel).forEach(function(el) {
        // Ignora itens que nós mesmos ocultamos (como o "WhatsApp") ou que estão vazios
        if (el.offsetParent === null) return; 
        
        var text = (el.innerText || el.getAttribute('title') || "").replace(/,/g, '.');
        var nums = text.match(/\d+(\.\d+)?/g);
        
        // Se não achou no texto, tenta nos inputs internos (comum em alguns temas)
        if (!nums || nums.length < 2) {
           var radio = el.querySelector('input[type="radio"], input[type="checkbox"]');
           if (radio && radio.value) {
             text = radio.value.replace(/,/g, '.');
             nums = text.match(/\d+(\.\d+)?/g);
           }
        }

        if (nums && nums.length >= 2) {
          sizes.push({ w: parseFloat(nums[0]), h: parseFloat(nums[1]) });
        }
      });
      return sizes;
    }

    function isStandardSize(w, h) {
      // 1. Padrões Absolutos do Ateliê (Segurança)
      var std = [[1.5, 2.0], [1.5, 2.2], [2.5, 2.0], [3.0, 2.0], [3.0, 2.5]];
      var sw = w.toFixed(2), sh = h.toFixed(2);
      for(var i=0; i<std.length; i++) {
        var s1 = std[i][0].toFixed(2), s2 = std[i][1].toFixed(2);
        if((sw === s1 && sh === s2) || (sw === s2 && sh === s1)) return true;
      }

      // 2. Detecção Dinâmica (Tamanhos já cadastrados neste produto específico)
      var available = getAvailableProductSizes();
      for(var j=0; j<available.length; j++) {
        var aw = available[j].w.toFixed(2);
        var ah = available[j].h.toFixed(2);
        // Bloqueia se a combinação de medidas for idêntica (independente da ordem L/A)
        if((sw === aw && sh === ah) || (sw === ah && sh === aw)) return true;
      }
      return false;
    }

    b.addEventListener('click', function(e){
      e.preventDefault();
      var a = parseFloat((document.getElementById('cloth-calc-alt').value || '').replace(',', '.'));
      var l = parseFloat((document.getElementById('cloth-calc-larg').value || '').replace(',', '.'));
      
      if(isNaN(a) || isNaN(l)){
        renderError('Preencha altura e largura válidos.');
        return;
      }

      if(isStandardSize(l, a)) {
        renderError('Esta medida já está disponível nas opções do produto. Selecione a opção correspondente acima para prosseguir com a compra.');
        return;
      }

      var proceedWithSimulation = function(simL, simA) {
        b.disabled = true;
        var originalText = b.innerHTML;
        b.innerHTML = '<span style="opacity: 0.8;">Simulando...</span>';

        // Atualiza visualmente os inputs para mostrar que inverteu
        document.getElementById('cloth-calc-larg').value = simL.toFixed(2).replace('.', ',');
        document.getElementById('cloth-calc-alt').value = simA.toFixed(2).replace('.', ',');

        var storeId = (window.LS && LS.store && LS.store.id) ? LS.store.id : '';
        var productId = (window.LS && LS.product && LS.product.id) ? LS.product.id : '';
        if (!productId) { var meta = document.querySelector('meta[property="product:id"]'); if(meta) productId = meta.content; }

        fetch(API_BASE_URL + '/api/simulate-price', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-store-id': storeId
          },
          body: JSON.stringify({
            width: simL,
            height: simA,
            productId: productId
          })
        })
        .then(res => res.json())
        .then(data => {
          b.disabled = false;
          b.innerHTML = originalText;
          if(data.error) throw new Error(data.error);
          renderSuccess(data.price120, data.price160, simA, simL, data.measureType);
          
          try { updateImageRatio(simL, simA); } catch(ev){}
        })
        .catch(err => {
          b.disabled = false;
          b.innerHTML = originalText;
          renderError(err.message || 'Erro ao simular preços.');
        });
      };

      var isEnvieSuaArte = window.location.pathname.indexOf('/fundo-fotografico-envie-sua-arte') !== -1;
      var original = getOriginalOrientation();
      var current = l > a ? 'landscape' : 'portrait';
      
      if (!isEnvieSuaArte && original !== 'unknown' && original !== current) {
        var el = document.getElementById('cloth-calc-result');
        var msg = original === 'landscape' ? 
          'Para manter a proporção original da imagem (Horizontal), as medidas precisam ser invertidas para <strong>' + a.toFixed(2).replace('.', ',') + 'm Largura x ' + l.toFixed(2).replace('.', ',') + 'm Altura</strong>.' :
          'Para manter a proporção original da imagem (Vertical), as medidas precisam ser invertidas para <strong>' + a.toFixed(2).replace('.', ',') + 'm Largura x ' + l.toFixed(2).replace('.', ',') + 'm Altura</strong>.';

        el.innerHTML = '<div style="background:#1e293b;border:1px solid #f59e0b;border-radius:12px;padding:20px;text-align:center;animation:clothIn 0.3s ease;">' +
          '<svg viewBox="0 0 24 24" width="40" height="40" style="stroke:#f59e0b;fill:none;stroke-width:2;margin-bottom:12px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' +
          '<h3 style="color:#f59e0b;font-size:16px;margin:0 0 8px;">Aviso de Proporção</h3>' +
          '<p style="color:#cbd5e1;font-size:13px;line-height:1.5;margin-bottom:16px;">' + msg + '</p>' +
          '<button type="button" id="btn-agree-ratio" style="background:#f59e0b;color:#1e293b;border:none;border-radius:8px;padding:12px 20px;font-weight:700;font-size:13px;cursor:pointer;width:100%;transition:opacity 0.2s;">Simular com medidas invertidas</button>' +
        '</div>';
        
        var agreeBtn = document.getElementById('btn-agree-ratio');
        agreeBtn.addEventListener('click', function(ev) {
          ev.preventDefault();
          agreeBtn.innerHTML = 'Simulando...';
          agreeBtn.style.opacity = '0.7';
          proceedWithSimulation(a, l); // inverte l e a
        });
        return;
      }

      proceedWithSimulation(l, a);
    });

    ['cloth-calc-alt', 'cloth-calc-larg'].forEach(function(id){
      var el = document.getElementById(id);
      if(!el) return;

      // Máscara de Metros (ex: 123 -> 1,23)
      el.addEventListener('input', function(e){
        var v = e.target.value.replace(/\D/g, '');
        if (v.length > 4) v = v.slice(0, 4); 
        
        var n = parseInt(v, 10);
        if (isNaN(n) || n === 0) {
          e.target.value = '';
          return;
        }
        v = n.toString();

        if (v.length === 1) v = '0,0' + v;
        else if (v.length === 2) v = '0,' + v;
        else {
          v = v.slice(0, v.length - 2) + ',' + v.slice(v.length - 2);
        }
        
        e.target.value = v;
      });

      el.addEventListener('keydown', function(e){
        if(e.key === 'Enter') b.click();
      });
    });
  }

  function highlightVariants(){
    if(sessionStorage.getItem('cc_just_created') === 'true'){
      sessionStorage.removeItem('cc_just_created');
      var l = sessionStorage.getItem('cc_last_l');
      var a = sessionStorage.getItem('cc_last_a');
      sessionStorage.removeItem('cc_last_l');
      sessionStorage.removeItem('cc_last_a');

      if(!l || !a) return;

      var items = document.querySelectorAll('.js-product-variants label, .js-product-variants span, .product-variants label, .product-variants span, .js-variant-option, .variant-option, .js-insta-variant');
      var found = null;

      for(var i=0; i<items.length; i++){
        var text = (items[i].innerText || items[i].getAttribute('title') || '').trim();
        if(text.indexOf(l) !== -1 && text.indexOf(a) !== -1){
           found = items[i];
           break;
        }
      }

      if(found){
        found.classList.add('cc-blink-effect');
        found.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Cria a seta vermelha indicadora
        var arrow = document.createElement('div');
        arrow.className = 'cc-arrow-indicator';
        arrow.style.position = 'fixed';
        arrow.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 21l-12-18h24z"/></svg>';
        document.body.appendChild(arrow);
        
        var updateArrowPos = function(){
            if(!found) return;
            var r = found.getBoundingClientRect();
            arrow.style.left = (r.left + r.width/2 - 15) + 'px';
            arrow.style.top = (r.top - 40) + 'px';
        };

        updateArrowPos();
        window.addEventListener('scroll', updateArrowPos);
        window.addEventListener('resize', updateArrowPos);

        setTimeout(function(){
          if(found) found.classList.remove('cc-blink-effect');
          if(arrow.parentNode) arrow.parentNode.removeChild(arrow);
          window.removeEventListener('scroll', updateArrowPos);
          window.removeEventListener('resize', updateArrowPos);
        }, 12000);
      } else {
        var v = document.querySelector('.js-product-variants') || document.querySelector('.product-variants');
        if(v) {
          v.classList.add('cc-blink-effect');
          v.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(function(){ v.classList.remove('cc-blink-effect'); }, 6000);
        }
      }
    }
  }

  if(!isProductPage()) return;
  
  // Executa o destaque se necessário
  highlightVariants();

  function findTarget(){
    var c = document.querySelector('.js-product-buy-container, .product-buy-container, .js-variant-container, .variant-container');
    if (c) return { el: c, act: 'before' };

    var f = document.querySelector('#product_form, .js-product-form, [data-product-form]');
    var b = document.querySelector('.js-addtocart, .js-main-add-to-cart, .btn-add-to-cart');

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

  function updateImageRatio(w, h) {
    if (!w || !h) return;
    var mainImg = document.querySelector('.js-product-active-image, .js-product-main-image, #product_image, .js-main-image-src, .product-image img, [data-main-product-image], .js-product-slide-link img');
    if (!mainImg) return;
    
    // Se a imagem ainda estiver carregando, tenta de novo em breve
    if (mainImg.naturalWidth === 0) {
        setTimeout(function(){ updateImageRatio(w, h); }, 200);
        return;
    }

    if (!mainImg.dataset.adjusterReady) {
      console.log('🚀 AI Manager: Simulador Ativado');
      mainImg.style.transition = 'aspect-ratio 0.4s cubic-bezier(0.4, 0, 0.2, 1), object-fit 0.4s, opacity 0.2s';
      mainImg.dataset.adjusterReady = 'true';
      
      // Ajusta o container pai para permitir que a imagem "estique" sem limites de fundo branco
      var parent = mainImg.closest('.js-product-slide-link, .product-image-container');
      if (parent) {
          parent.style.height = 'auto';
          parent.style.minHeight = '0';
          parent.style.paddingBottom = '0';
          parent.style.backgroundColor = 'transparent';
          parent.style.transition = 'aspect-ratio 0.4s';
      }

      if (window.MutationObserver) {
        var observer = new MutationObserver(function() {
          console.log('🔄 Tema alterou a imagem, reaplicando proporção...');
          initImageAdjuster();
        });
        observer.observe(mainImg, { attributes: true, attributeFilter: ['src'] });
      }
    }

    var isEnvieSuaArte = window.location.pathname.indexOf('/fundo-fotografico-envie-sua-arte') !== -1;
    var finalW, finalH;
    
    if (isEnvieSuaArte) {
      finalW = w;
      finalH = h;
    } else {
      var isLandscape = mainImg.naturalWidth > mainImg.naturalHeight;
      if (isLandscape) {
        finalW = Math.max(w, h);
        finalH = Math.min(w, h);
      } else {
        finalH = Math.max(w, h);
        finalW = Math.min(w, h);
      }
    }

    var newRatio = finalW + ' / ' + finalH;
    if (mainImg.style.aspectRatio !== newRatio) {
      console.log('🖼️ Ajustando Ratio (Smart Orientation): ' + newRatio);
      
      // Estilos forçados na imagem
      mainImg.style.setProperty('aspect-ratio', newRatio, 'important');
      mainImg.style.setProperty('object-fit', 'fill', 'important');
      mainImg.style.setProperty('width', '100%', 'important');
      mainImg.style.setProperty('height', 'auto', 'important');
      mainImg.style.setProperty('max-height', 'none', 'important');
      
      var parent = mainImg.closest('.js-product-slide-link, .product-image-container');
      if (parent) {
          parent.style.setProperty('aspect-ratio', newRatio, 'important');
          parent.style.setProperty('padding-bottom', '0', 'important');
          parent.style.setProperty('height', 'auto', 'important');
      }

      mainImg.style.opacity = '0.5';
      setTimeout(function(){ mainImg.style.opacity = '1'; }, 100);
    }
  }

  function initImageAdjuster() {
    var sel = '.js-variant-option.selected, .variant-option.active, .js-variant-option.active, input[type="radio"]:checked + label, .selected-variant, .js-insta-variant.selected, .js-insta-variant.active';
    var activeVariant = document.querySelector(sel);
    // Oculta a variante de WhatsApp antiga (Painel de tamanhos)
    document.querySelectorAll('.js-insta-variant, .js-product-variant-option').forEach(function(el) {
        var txt = (el.innerText || "").toLowerCase();
        if (txt.indexOf('whatsapp') !== -1 || txt.indexOf('personalizada via') !== -1) {
            el.style.display = 'none';
            // Se for um item de lista ou container, oculta o pai também se necessário
            if (el.parentElement.classList.contains('insta-variations')) {
                // Manter apenas o botão oculto é mais seguro para não quebrar o layout
            }
        }
    });

    if (!activeVariant) return;

    var text = (activeVariant.innerText || activeVariant.getAttribute('title') || '').trim();
    // Regex mais flexível: busca todos os números com vírgula ou ponto (trocando globalmente , por .)
    var cleanText = text.replace(/,/g, '.');
    var nums = cleanText.match(/\d+(\.\d+)?/g);
    
    if (!nums || nums.length < 2) {
        var radio = activeVariant.previousElementSibling || activeVariant.querySelector('input');
        if (radio && radio.value) {
            cleanText = radio.value.replace(/,/g, '.');
            nums = cleanText.match(/\d+(\.\d+)?/g);
        }
    }

    if (nums && nums.length >= 2) {
      updateImageRatio(parseFloat(nums[0]), parseFloat(nums[1]));
    }
  }

  // --- COMPRA RÁPIDA: Atualiza preço no grid ao alterar variantes ---
  function initQuickShopPriceUpdater() {
    window.addEventListener('change', function(e) {
      if (e.target && e.target.tagName === 'SELECT') {
        var select = e.target;
        // Encontra o container do produto
        var productContainer = select.closest('.js-item-product, [data-product-id], .js-product-container, .item-product');
        if (!productContainer) return;

        // Tenta buscar as variações salvas no HTML do container
        var variantsEl = productContainer.querySelector('[data-variants]');
        var variantsAttr = variantsEl ? variantsEl.getAttribute('data-variants') : productContainer.getAttribute('data-variants');
        if (!variantsAttr) return;

        try {
          var variants = JSON.parse(variantsAttr);
          if (!Array.isArray(variants) || variants.length === 0) return;

          // Seleciona todos os dropdowns de variação daquele produto
          var selects = productContainer.querySelectorAll('select');
          if (selects.length === 0) return;

          function normalize(val) {
            if (!val) return '';
            return val.toString().toLowerCase().replace(/\s+/g, '').replace(/,/g, '.').replace(/gr/g, 'g');
          }

          // Encontra a variação correspondente
          var matchingVariant = null;
          for (var i = 0; i < variants.length; i++) {
            var v = variants[i];
            var match = true;
            if (selects[0] && v.option0) {
              if (normalize(v.option0) !== normalize(selects[0].value)) match = false;
            }
            if (selects[1] && v.option1) {
              if (normalize(v.option1) !== normalize(selects[1].value)) match = false;
            }
            if (selects[2] && v.option2) {
              if (normalize(v.option2) !== normalize(selects[2].value)) match = false;
            }
            if (match) {
              matchingVariant = v;
              break;
            }
          }

          if (matchingVariant) {
            // 1. Atualiza o preço principal
            var priceEl = productContainer.querySelector('.js-price-display, .js-price, .item-price, .price, .js-compare-price-display');
            if (priceEl && matchingVariant.price_short) {
              priceEl.innerText = matchingVariant.price_short;
            }

            // 2. Atualiza o parcelamento (mantendo a taxa de juros original da loja)
            var installmentEl = productContainer.querySelector('.js-installments-display, .installments, .js-max-installments, .item-installments');
            if (!installmentEl) {
              var allTexts = productContainer.querySelectorAll('span, div, p');
              for (var j = 0; j < allTexts.length; j++) {
                if (allTexts[j].innerText.indexOf('x de') !== -1) {
                  installmentEl = allTexts[j];
                  break;
                }
              }
            }

            if (installmentEl && matchingVariant.price_number) {
              var text = installmentEl.innerText;
              var instValMatch = text.match(/R\$\s*(\d+(?:[.,]\d+)?)/);
              if (instValMatch) {
                var oldInstVal = parseFloat(instValMatch[1].replace(',', '.'));
                var firstVariant = variants[0];
                var oldPrice = firstVariant.price_number || 1;
                var ratio = oldInstVal / oldPrice;
                var newInstVal = matchingVariant.price_number * ratio;
                var newInstText = text.replace(/R\$\s*[\d,.]+/, 'R$ ' + newInstVal.toFixed(2).replace('.', ','));
                installmentEl.innerText = newInstText;
              }
            }
          }
        } catch (err) {
          console.error('[QuickShop Price] Erro:', err);
        }
      }
    });
  }

  function getSelectedLayout() {
    var sel = 'select, input[type="radio"]:checked';
    var els = document.querySelectorAll(sel);
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var name = '';
      if (el.tagName === 'SELECT') {
        var label = el.closest('.form-group, .js-variant-container, .variant-container, .product-variant') || el.parentElement;
        name = label ? (label.innerText || '').toLowerCase() : '';
      } else {
        var label = null;
        if (el.id) {
          try {
            label = document.querySelector('label[for="' + el.id.replace(/["\\]/g, '\\$&') + '"]');
          } catch (e) {}
        }
        if (!label) label = el.parentElement;
        name = label ? (label.innerText || '').toLowerCase() : '';
        if (el.name) name += ' ' + el.name.toLowerCase();
      }

      var text = el.value || '';
      if (el.tagName !== 'SELECT' && label) text = label.innerText;

      if (name.indexOf('layout') !== -1 || name.indexOf('cenario') !== -1 || name.indexOf('cenário') !== -1 || name.indexOf('formato') !== -1) {
        var normText = text.toLowerCase();
        if (normText.indexOf('chão') !== -1 || normText.indexOf('chao') !== -1) {
          return 'Parede e Chão';
        }
        return 'Só Parede';
      }
    }

    var activeVariants = document.querySelectorAll('.js-variant-option.selected, .variant-option.active, .js-variant-option.active, .selected-variant');
    for (var i = 0; i < activeVariants.length; i++) {
      var txt = (activeVariants[i].innerText || '').toLowerCase();
      if (txt.indexOf('chão') !== -1 || txt.indexOf('chao') !== -1) return 'Parede e Chão';
    }
    return 'Só Parede';
  }

  function checkLayoutWarning() {
    var warningId = 'layout-warning-banner';
    var layout = getSelectedLayout();
    var existing = document.getElementById(warningId);

    if (layout === 'Parede e Chão') {
      if (existing) return;
      
      // Busca o container da opção "Layout do Cenário" para inserir o balão imediatamente abaixo dele
      var layoutSelectorContainer = null;
      var options = document.querySelectorAll('.js-variant-option, .variant-option, label, .js-product-variant-option');
      for (var i = 0; i < options.length; i++) {
        var optText = (options[i].innerText || '').toLowerCase();
        if (optText.indexOf('parede') !== -1 || optText.indexOf('chão') !== -1 || optText.indexOf('chao') !== -1) {
          layoutSelectorContainer = options[i].closest('.insta-variations, .js-variant-container, .variant-container, .product-variant, .form-group') || options[i].parentElement;
          break;
        }
      }

      var warning = document.createElement('div');
      warning.id = warningId;
      warning.style.cssText = 'background:#0f172a; border:1.5px solid #f59e0b; border-radius:12px; padding:12px 16px; margin:12px 0; font-family:inherit; animation:clothIn 0.3s ease; box-shadow:0 4px 24px rgba(37,99,235,0.1); width:100%; box-sizing:border-box; clear:both;';
      warning.innerHTML = 
        '<div style="display:flex; align-items:flex-start; gap:10px;">' +
          '<span style="font-size:18px; margin-top:2px;">💬</span>' +
          '<div style="flex:1;">' +
            '<p style="color:#f59e0b; font-size:12px; font-weight:800; margin:0 0 4px; text-transform:uppercase; letter-spacing:0.05em;">Aviso Cenográfico</p>' +
            '<p style="color:#cbd5e1; font-size:12px; margin:4px 0 0 0; line-height:1.5;">Para saber como fica o enquadramento desta imagem dividida em Parede e Chão, entre em contato conosco pelo WhatsApp! Caso contrário, o fundo será produzido de forma contínua seguindo o padrão da imagem sendo 50% Parede e 50% chão.</p>' +
          '</div>' +
        '</div>';

      if (layoutSelectorContainer) {
        layoutSelectorContainer.parentNode.insertBefore(warning, layoutSelectorContainer.nextSibling);
      } else {
        var container = document.querySelector('.js-product-buy-container, .product-buy-container, .js-variant-container, .variant-container, .product-variants');
        if (!container) container = document.querySelector('.js-product-form') || document.body;
        if (container) {
          if (container.nextSibling) {
            container.parentNode.insertBefore(warning, container.nextSibling);
          } else {
            container.parentNode.appendChild(warning);
          }
        }
      }
    } else {
      if (existing) {
        existing.remove();
      }
    }
  }

  function initLayoutWarning() {
    checkLayoutWarning();
    window.addEventListener('change', checkLayoutWarning);
    document.addEventListener('click', function(e) {
      if (e.target.closest('.js-variant-option, .js-insta-variant, .variant-option, .cc-custom-btn')) {
        setTimeout(checkLayoutWarning, 150);
      }
    });
  }
  // Evento de clique para o image adjuster
  document.addEventListener('click', function(e){
    if (e.target.closest('.js-variant-option, .js-insta-variant, .variant-option, .cc-custom-btn')) {
      setTimeout(initImageAdjuster, 100);
      setTimeout(checkLayoutWarning, 150);
    }
  });

  document.readyState==='loading' ? document.addEventListener('DOMContentLoaded', function(){ inject(); initImageAdjuster(); initQuickShopPriceUpdater(); initLayoutWarning(); }) : (function(){ inject(); initImageAdjuster(); initQuickShopPriceUpdater(); initLayoutWarning(); })();
  
  setInterval(function(){
    inject();
    initImageAdjuster();
    checkLayoutWarning();
  }, 3000);
})();


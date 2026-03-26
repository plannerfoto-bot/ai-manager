(function(){
  console.log("🚀 AI Manager: v2.4.0 (Global Variant Shield)");
  
  // 🚫 Ocultação Universal e Redundante
  var style = document.createElement('style');
  style.innerHTML = `
    [title*="Whatsapp" i], [title*="Personalizada" i], 
    a:has(span:contains("Whatsapp")), 
    .js-insta-variant:contains("Whatsapp"),
    [data-variant-title*="Whatsapp" i] { 
      display: none !important; 
      visibility: hidden !important; 
      opacity: 0 !important; 
      pointer-events: none !important;
      position: absolute !important;
      left: -9999px !important;
    }
  `;
  document.documentElement.appendChild(style);

  function nukeVariants() {
    document.querySelectorAll('a, button, span, label, .js-insta-variant').forEach(function(el) {
      var t = (el.innerText || el.getAttribute('title') || el.getAttribute('data-variant-title') || "").toLowerCase();
      if (t.indexOf('whatsapp') !== -1 || t.indexOf('personalizada via') !== -1) {
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        var p = el.parentElement;
        if (p && p.classList.contains('js-variant-option')) p.style.display = 'none';
      }
    });
  }

  if (window.MutationObserver) {
    new MutationObserver(nukeVariants).observe(document.documentElement, { childList: true, subtree: true });
  }
  
  // Varreduras extras nos primeiros segundos (redundância para temas lentos)
  [100, 500, 1000, 2000, 5000].forEach(t => setTimeout(nukeVariants, t));

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
    var tecidoHtml = '';

    if (isSpecial) {
      // Medida especial: apenas 120g, sem emenda
      tecidoHtml =
        '<div class="cc-badge-seamless">' +
          '<svg viewBox="0 0 24 24"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>' +
          'Esta medida é SEM EMENDA — disponível apenas em TECIDO 120g' +
        '</div>' +
        '<div style="display:flex;gap:10px;margin-top:8px;">' +
          '<div style="flex:1;background:#0f172a;border:1.5px solid #0ea5e966;border-radius:10px;padding:12px;text-align:center;">' +
            '<div style="font-size:11px;color:#38bdf8;font-weight:700;margin-bottom:4px;">TECIDO 120g</div>' +
            '<div style="font-size:9px;color:#64748b;margin-bottom:6px;">⭐ Sem Emenda</div>' +
            '<div style="font-size:20px;color:#fff;font-weight:900;margin-bottom:10px;letter-spacing:-0.5px;">' + brl(p120) + '</div>' +
            '<button class="cc-buy-btn" data-gram="120g" style="width:100%;padding:10px;background:linear-gradient(135deg,#0284c7,#0ea5e9);color:#fff;border:none;border-radius:8px;font-weight:800;font-size:12px;cursor:pointer;transition:0.2s;">GERAR OPÇÃO</button>' +
          '</div>' +
        '</div>';
    } else {
      // Medida padrão: os dois tecidos
      tecidoHtml =
        '<div style="display:flex;gap:10px;margin-top:8px;">' +
          '<div style="flex:1;background:#0f172a;border:1px solid #334155;border-radius:10px;padding:12px;text-align:center;">' +
            '<div style="font-size:11px;color:#94a3b8;font-weight:700;margin-bottom:4px;">TECIDO 120g</div>' +
            '<div style="font-size:20px;color:#fff;font-weight:900;margin-bottom:10px;letter-spacing:-0.5px;">' + brl(p120) + '</div>' +
            '<button class="cc-buy-btn" data-gram="120g" style="width:100%;padding:10px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-weight:800;font-size:12px;cursor:pointer;transition:0.2s;">GERAR OPÇÃO</button>' +
          '</div>' +
          '<div style="flex:1;background:#0f172a;border:1px solid #334155;border-radius:10px;padding:12px;text-align:center;">' +
            '<div style="font-size:11px;color:#94a3b8;font-weight:700;margin-bottom:4px;">TECIDO 160g</div>' +
            '<div style="font-size:20px;color:#fff;font-weight:900;margin-bottom:10px;letter-spacing:-0.5px;">' + brl(p160) + '</div>' +
            '<button class="cc-buy-btn" data-gram="160g" style="width:100%;padding:10px;background:#16a34a;color:#fff;border:none;border-radius:8px;font-weight:800;font-size:12px;cursor:pointer;transition:0.2s;">GERAR OPÇÃO</button>' +
          '</div>' +
        '</div>';
    }

    var original = getOriginalOrientation();
    var current = l > a ? 'landscape' : 'portrait';
    var ratioHint = '';
    
    if (original !== 'unknown' && original !== current) {
      var msg = original === 'landscape' ? 
        'Nota: Este painel é originalmente horizontal (paisagem). Sua medida personalizada é vertical, o que pode causar distorção na arte.' :
        'Nota: Este painel é originalmente vertical (retrato). Sua medida personalizada é horizontal, o que pode causar distorção na arte.';
      
      ratioHint = '<div class="cc-info-ratio">' +
        '<svg viewBox="0 0 24 24" width="14" height="14" style="stroke:#60a5fa;fill:none;stroke-width:2;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' +
        '<span>' + msg + '</span>' +
      '</div>';
    }

    el.innerHTML = '<div id="cloth-calc-success">' +
      '<p style="font-size:10px;color:#4ade80;text-transform:uppercase;font-weight:700;margin-bottom:8px;letter-spacing:0.05em;">Medidas aprovadas! Escolha o tecido:</p>' +
      previewHtml +
      ratioHint +
      tecidoHtml +
    '</div>';

    var btns = document.querySelectorAll('.cc-buy-btn');
    for(var i=0; i<btns.length; i++) {
        btns[i].addEventListener('click', function(e) {
            handleBuyClick(e.target.getAttribute('data-gram'), l, a, e.target);
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

    fetch(API_BASE_URL + '/api/create-variant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-store-id': storeId },
        body: JSON.stringify({ productId: productId, width: width, height: height, gramatura: gramatura })
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

    function isStandardSize(w, h) {
      var std = [[1.5, 2.0], [1.5, 2.2], [2.5, 2.0], [3.0, 2.0], [3.0, 2.5]];
      var sw = w.toFixed(2), sh = h.toFixed(2);
      for(var i=0; i<std.length; i++) {
        var s1 = std[i][0].toFixed(2), s2 = std[i][1].toFixed(2);
        if((sw === s1 && sh === s2) || (sw === s2 && sh === s1)) return true;
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
        renderError('Esta medida já está disponível nas opções padrão do site. Selecione o tamanho correspondente no menu de opções acima.');
        return;
      }

      b.disabled = true;
      var originalText = b.innerHTML;
      b.innerHTML = '<span style="opacity: 0.8;">Simulando...</span>';

      var storeId = (window.LS && LS.store && LS.store.id) ? LS.store.id : '';

      fetch(API_BASE_URL + '/api/simulate-price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-store-id': storeId
        },
        body: JSON.stringify({
          width: l,
          height: a
        })
      })
      .then(res => res.json())
      .then(data => {
        b.disabled = false;
        b.innerHTML = originalText;
        if(data.error) throw new Error(data.error);
        renderSuccess(data.price120, data.price160, a, l, data.measureType);
        
        // NOVO: Atualiza a proporção da imagem imediatamente após o cálculo de sucesso
        try { updateImageRatio(l, a); } catch(ev){}
      })
      .catch(err => {
        b.disabled = false;
        b.innerHTML = originalText;
        renderError(err.message || 'Erro ao simular preços.');
      });
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

    var isLandscape = mainImg.naturalWidth > mainImg.naturalHeight;
    var finalW, finalH;
    
    if (isLandscape) {
      finalW = Math.max(w, h);
      finalH = Math.min(w, h);
    } else {
      finalH = Math.max(w, h);
      finalW = Math.min(w, h);
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

  // Evento instantâneo no clique
  document.addEventListener('click', function(e){
    if (e.target.closest('.js-variant-option, .js-insta-variant, .variant-option, .cc-custom-btn')) {
      setTimeout(initImageAdjuster, 100);
    }
  });

  document.readyState==='loading' ? document.addEventListener('DOMContentLoaded', function(){ inject(); initImageAdjuster(); }) : (function(){ inject(); initImageAdjuster(); })();
  
  setInterval(function(){
    inject();
    initImageAdjuster();
  }, 3000);
})();

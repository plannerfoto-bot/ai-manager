import React, { useState, useEffect, useRef } from 'react';
import { Code2, Copy, CheckCheck, Calculator, ToggleLeft, ToggleRight, Phone, Info, ExternalLink } from 'lucide-react';

// ─── Gerador do snippet ───────────────────────────────────
function generateSnippet(enabled, whatsapp) {
  return `<!-- Cloth Sublimação — Calculadora de Medidas | MVP 1.0 -->
<style>
#cloth-calc-widget{margin:16px 0 8px;border:1.5px solid #2563eb44;border-radius:18px;background:linear-gradient(135deg,#0f172a,#1e293b);padding:18px 20px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:440px;box-shadow:0 4px 24px #2563eb18}
#cloth-calc-header{display:flex;align-items:center;gap:10px;margin-bottom:14px}
#cloth-calc-icon{background:#2563eb22;border-radius:10px;padding:7px;display:flex}
#cloth-calc-icon svg{width:18px;height:18px;stroke:#60a5fa;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
#cloth-calc-title{font-size:14px;font-weight:800;color:#fff;margin:0}
#cloth-calc-subtitle{font-size:10px;color:#60a5fa;margin:0;opacity:.75}
#cloth-calc-inputs{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
.cloth-calc-field label{display:flex;align-items:center;gap:4px;font-size:10px;text-transform:uppercase;font-weight:700;color:#94a3b8;margin-bottom:5px;letter-spacing:.05em}
.cloth-calc-field label svg{width:11px;height:11px;stroke:#60a5fa;fill:none;stroke-width:2;stroke-linecap:round}
.cloth-calc-field input{width:100%;box-sizing:border-box;background:#0f172a;border:1.5px solid #334155;border-radius:10px;padding:9px 12px;font-size:14px;color:#fff;outline:none;transition:border-color .2s;-webkit-appearance:none}
.cloth-calc-field input:focus{border-color:#2563eb99;background:#1e293b}
.cloth-calc-field input::placeholder{color:#475569}
#cloth-calc-btn{width:100%;padding:11px;background:#2563eb;border:none;border-radius:12px;font-size:13px;font-weight:800;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;letter-spacing:.04em;transition:background .2s,transform .15s}
#cloth-calc-btn:hover{background:#1d4ed8}
#cloth-calc-btn:active{transform:scale(.97)}
#cloth-calc-btn svg{width:14px;height:14px;stroke:#fff;fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}
#cloth-calc-result{margin-top:12px;animation:clothIn .3s ease}
@keyframes clothIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
#cloth-calc-result.error{background:#450a0a44;border:1.5px solid #ef444455;border-radius:12px;padding:12px 14px;display:flex;align-items:flex-start;gap:8px}
#cloth-calc-result.error svg{width:15px;height:15px;stroke:#f87171;fill:none;stroke-width:2;flex-shrink:0;margin-top:1px}
#cloth-calc-result.error span{font-size:12px;color:#f87171;line-height:1.5}
#cloth-calc-success{background:#052e1644;border:1.5px solid #22c55e44;border-radius:12px;padding:14px 16px}
#cloth-calc-success-header{display:flex;align-items:center;gap:6px;margin-bottom:6px}
#cloth-calc-success-header svg{width:14px;height:14px;stroke:#4ade80;fill:none;stroke-width:2.5}
#cloth-calc-success-header span{font-size:10px;font-weight:700;text-transform:uppercase;color:#4ade80;letter-spacing:.08em}
#cloth-calc-dims{font-size:11px;color:#94a3b8;margin-bottom:4px}
#cloth-calc-price{font-size:32px;font-weight:900;color:#fff;letter-spacing:-.03em;line-height:1}
#cloth-calc-rule{font-size:10px;color:#64748b;margin-top:4px;display:flex;align-items:center;gap:4px}
#cloth-calc-rule svg{width:10px;height:10px;stroke:#64748b;fill:none;stroke-width:2}
#cloth-calc-wa-btn{margin-top:12px;width:100%;padding:12px;background:linear-gradient(90deg,#16a34a,#15803d);border:none;border-radius:12px;font-size:13px;font-weight:800;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;letter-spacing:.04em;text-decoration:none;transition:opacity .2s,transform .15s}
#cloth-calc-wa-btn:hover{opacity:.9}
#cloth-calc-wa-btn:active{transform:scale(.97)}
#cloth-calc-wa-btn svg{width:16px;height:16px;fill:#fff}
#cloth-calc-hint,#cloth-calc-footer{text-align:center;font-size:10px;color:#475569;margin-top:8px}
</style>
<script>
(function(){
  var CALCULATOR_ENABLED=${enabled ? 'true' : 'false'};
  var WHATSAPP_NUMBER='${whatsapp}';
  var GRAMATURA='120g';
  if(!CALCULATOR_ENABLED)return;
  function isProductPage(){return window.location.pathname.indexOf('/produtos/')!==-1||window.location.pathname.indexOf('/products/')!==-1||!!document.querySelector('[data-product-form],[itemtype*="Product"],.js-buy-form');}
  function calc(a,l){var M=Math.max(a,l);if(M<=0)return{e:'Valores devem ser maiores que zero.'};if(M>3)return{e:'Máximo: 3,00m por dimensão.'};return a>1.56&&l>1.56?{p:((M*2)*22.5+15)*2,r:'B'}:{p:M*22.5+3+45,r:'A'};}
  function brl(v){return'R$ '+v.toFixed(2).replace('.',',');}
  function dim(v){return v.toFixed(2).replace('.',',')+'m';}
  function html(){var d=document.createElement('div');d.id='cloth-calc-widget';d.innerHTML='<div id="cloth-calc-header"><div id="cloth-calc-icon"><svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></div><div><p id="cloth-calc-title">Calcule sua Medida</p><p id="cloth-calc-subtitle">Gramatura '+GRAMATURA+' · Sob encomenda</p></div></div><div id="cloth-calc-inputs"><div class="cloth-calc-field"><label><svg viewBox="0 0 24 24"><line x1="5" y1="3" x2="5" y2="21"/><line x1="19" y1="3" x2="19" y2="21"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Altura (m)</label><input id="cloth-calc-alt" type="text" inputmode="decimal" placeholder="ex: 1,70"></div><div class="cloth-calc-field"><label><svg viewBox="0 0 24 24"><line x1="3" y1="5" x2="21" y2="5"/><line x1="3" y1="19" x2="21" y2="19"/><line x1="12" y1="5" x2="12" y2="19"/></svg>Largura (m)</label><input id="cloth-calc-larg" type="text" inputmode="decimal" placeholder="ex: 2,50"></div></div><button id="cloth-calc-btn"><svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>CALCULAR PREÇO</button><div id="cloth-calc-result" style="display:none"></div><p id="cloth-calc-footer">Dimensões aceitas: até 3,00m por lado</p>';return d;}
  function render(c,a,l){var el=document.getElementById('cloth-calc-result');el.style.display='block';el.className='';if(c.e){el.className='error';el.innerHTML='<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span>'+c.e+'</span>';return;}var n=(document.querySelector('h1.js-product-name,h1[itemprop="name"],.product-name h1,h1')||{textContent:'Produto sob medida'}).textContent.trim();var msg=encodeURIComponent('🖼 *Pedido de Medida Personalizada*\\n\\n📦 Produto: '+n+'\\n📐 Medida: '+dim(a)+' × '+dim(l)+'\\n🧵 Gramatura: '+GRAMATURA+'\\n💰 Valor: '+brl(c.p)+'\\n\\nGostaria de confirmar este pedido!');el.innerHTML='<div id="cloth-calc-success"><div id="cloth-calc-success-header"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg><span>Preço Calculado</span></div><p id="cloth-calc-dims">'+dim(a)+' × '+dim(l)+' · '+GRAMATURA+'</p><p id="cloth-calc-price">'+brl(c.p)+'</p><p id="cloth-calc-rule"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>'+(c.r==='A'?'Regra A — dimensão menor que 1,56m':'Regra B — ambas entre 1,56m e 3,00m')+'</p></div><a id="cloth-calc-wa-btn" href="https://wa.me/'+WHATSAPP_NUMBER+'?text='+msg+'" target="_blank" rel="noopener"><svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>SOLICITAR VIA WHATSAPP</a><p id="cloth-calc-hint">Você será direcionado ao WhatsApp com os detalhes.</p>';}
  function bind(){var b=document.getElementById('cloth-calc-btn');if(!b)return;b.addEventListener('click',function(){var a=parseFloat((document.getElementById('cloth-calc-alt').value||'').replace(',','.'));var l=parseFloat((document.getElementById('cloth-calc-larg').value||'').replace(',','.'));if(isNaN(a)||isNaN(l)){render({e:'Preencha altura e largura (ex: 1,70).'},0,0);return;}render(calc(a,l),a,l);});['cloth-calc-alt','cloth-calc-larg'].forEach(function(id){var el=document.getElementById(id);if(el)el.addEventListener('keydown',function(e){if(e.key==='Enter')b.click();document.getElementById('cloth-calc-result').style.display='none';});});}
  function findTarget(){var sel=['.js-product-variants','.product-variants','[data-variants]','.product__variants','.js-add-to-cart','[data-add-to-cart]','.js-buy-form','[data-product-form]','.product-buy','.product__actions','.product-form'];for(var i=0;i<sel.length;i++){var el=document.querySelector(sel[i]);if(el)return el;}return null;}
  function inject(){if(!isProductPage())return;if(document.getElementById('cloth-calc-widget'))return;var t=findTarget();if(!t)t=document.querySelector('[itemprop="price"],.product-price,.price');if(!t)return;var w=html();t.nextSibling?t.parentNode.insertBefore(w,t.nextSibling):t.parentNode.appendChild(w);bind();}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',inject):inject();
  setTimeout(inject,1500);
})();
<\/script>`;
}

const ScriptManager = () => {
  const [enabled, setEnabled] = useState(true);
  const [whatsapp, setWhatsapp] = useState('5500000000000');
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef(null);

  const snippet = generateSnippet(enabled, whatsapp);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
    } catch {
      // Fallback
      if (textareaRef.current) {
        textareaRef.current.select();
        document.execCommand('copy');
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8 max-w-[1200px] mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white flex items-center gap-3">
          <Code2 className="w-6 h-6 text-blue-500" />
          Script para a Loja
        </h1>
        <p className="text-slate-400 mt-2">
          Gere e copie o código da calculadora para injetar no tema Nuvemshop.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configurações */}
        <div className="lg:col-span-1 space-y-4">
          {/* Toggle */}
          <div className="glass p-5 rounded-2xl border border-slate-800">
            <p className="text-xs text-slate-500 uppercase font-bold mb-3 flex items-center gap-2">
              <Calculator className="w-3 h-3 text-blue-400" /> Status da Calculadora
            </p>
            <button
              onClick={() => setEnabled(v => !v)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border font-bold text-sm transition-all ${
                enabled
                  ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <span>{enabled ? 'ATIVADA' : 'DESATIVADA'}</span>
              {enabled
                ? <ToggleRight className="w-6 h-6 text-blue-400" />
                : <ToggleLeft className="w-6 h-6 text-slate-600" />}
            </button>
          </div>

          {/* WhatsApp */}
          <div className="glass p-5 rounded-2xl border border-slate-800">
            <p className="text-xs text-slate-500 uppercase font-bold mb-3 flex items-center gap-2">
              <Phone className="w-3 h-3 text-green-400" /> WhatsApp da Loja
            </p>
            <input
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ''))}
              placeholder="Ex: 5500000000000"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
            <p className="text-[10px] text-slate-500 mt-2">Código do país + DDD + número (só números)</p>
          </div>

          {/* Instruções */}
          <div className="glass p-5 rounded-2xl border border-blue-500/20 bg-blue-950/20">
            <p className="text-xs text-blue-300 font-bold mb-3 flex items-center gap-2">
              <Info className="w-3 h-3" /> Como instalar na loja
            </p>
            <ol className="text-xs text-slate-400 space-y-2 list-none">
              {[
                'Configure o WhatsApp e o status acima',
                'Clique em "COPIAR CÓDIGO"',
                'Acesse o painel da Nuvemshop',
                'Vá em: Personalizar Tema',
                'Clique em Código Adicional',
                'Cole o código no campo de Scripts',
                'Salve e verifique na loja!'
              ].map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 text-[9px] font-black flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
            <a
              href="https://www.nuvemshop.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center gap-1.5 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ExternalLink className="w-3 h-3" /> Abrir painel Nuvemshop
            </a>
          </div>
        </div>

        {/* Código */}
        <div className="lg:col-span-2">
          <div className="glass p-5 rounded-2xl border border-slate-800 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-white font-bold flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-blue-400" />
                  Código Gerado
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {enabled ? '✅ Calculadora ativada' : '❌ Calculadora desativada'} · WhatsApp: {whatsapp || '(não configurado)'}
                </p>
              </div>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  copied
                    ? 'bg-green-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'COPIADO!' : 'COPIAR CÓDIGO'}
              </button>
            </div>

            <textarea
              ref={textareaRef}
              readOnly
              value={snippet}
              className="flex-1 w-full bg-slate-950/80 border border-slate-800/50 rounded-xl p-4 text-[11px] text-slate-300 font-mono resize-none outline-none leading-relaxed min-h-[420px]"
              spellCheck={false}
            />

            <div className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-600">
              <Info className="w-3 h-3" />
              Para desativar na loja: altere o status para "Desativada", copie o novo código e cole novamente no tema.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScriptManager;

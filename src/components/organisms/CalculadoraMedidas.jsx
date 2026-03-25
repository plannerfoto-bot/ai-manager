import React, { useState, useCallback } from 'react';
import { Calculator, Ruler, ShoppingCart, AlertCircle, CheckCircle2, Info } from 'lucide-react';

// ──────────────────────────────────────────────────────────
// REGRAS DE PRECIFICAÇÃO (Gramatura 120g)
// ──────────────────────────────────────────────────────────
// Regra A – se UMA das dimensões < 1,56 m:
//   preço = maior_dim × 22,50 + 3,00 + 45,00
//
// Regra B – se AMBAS as dimensões > 1,56 m e ≤ 3,00 m:
//   preço = ((maior_dim × 2) × 22,50 + 15,00) × 2
// ──────────────────────────────────────────────────────────

const MAX_DIM = 3.0;
const LIMITE = 1.56;

function calcularPreco(alt, larg) {
  const maior = Math.max(alt, larg);
  const menor = Math.min(alt, larg);

  // Validações de intervalo
  if (maior > MAX_DIM) return { preco: null, regra: null, erro: `A maior dimensão (${maior.toFixed(2)}m) ultrapassa o limite de ${MAX_DIM}m suportado por este cálculo.` };
  if (menor <= 0 || maior <= 0) return { preco: null, regra: null, erro: 'Insira valores maiores que zero.' };

  const ambasMaioresQueLimite = alt > LIMITE && larg > LIMITE;

  if (ambasMaioresQueLimite) {
    // Regra B
    const preco = ((maior * 2) * 22.5 + 15) * 2;
    return { preco, regra: 'B', erro: null };
  } else {
    // Regra A – pelo menos uma dimensão ≤ 1,56
    const preco = maior * 22.5 + 3 + 45;
    return { preco, regra: 'A', erro: null };
  }
}

const CalculadoraMedidas = ({ product, storeUrl }) => {
  const [altura, setAltura] = useState('');
  const [largura, setLargura] = useState('');
  const [resultado, setResultado] = useState(null);

  const getText = (val) => {
    if (!val) return '';
    if (typeof val === 'object') return val.pt || val.es || val.en || Object.values(val)[0] || '';
    return val;
  };

  const handleCalcular = useCallback(() => {
    const alt = parseFloat(String(altura).replace(',', '.'));
    const larg = parseFloat(String(largura).replace(',', '.'));

    if (isNaN(alt) || isNaN(larg)) {
      setResultado({ erro: 'Por favor, insira valores numéricos válidos (ex: 1,70).' });
      return;
    }

    const calc = calcularPreco(alt, larg);
    setResultado({ ...calc, alt, larg });
  }, [altura, largura]);

  const handleCheckout = () => {
    if (!resultado?.preco || !storeUrl) return;

    const prodUrl = getText(product?.canonical_url) || storeUrl;
    const msg = encodeURIComponent(
      `Olá! Quero comprar: ${getText(product?.name)}\n` +
      `Medida personalizada: ${resultado.alt.toFixed(2).replace('.', ',')}m (alt) × ${resultado.larg.toFixed(2).replace('.', ',')}m (larg)\n` +
      `Gramatura: 120g\n` +
      `Valor calculado: R$ ${resultado.preco.toFixed(2).replace('.', ',')}`
    );

    // Abre o produto na loja ou, como fallback, abre WhatsApp com os dados
    window.open(prodUrl, '_blank');
  };

  const formatBRL = (val) =>
    val?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? '';

  return (
    <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-blue-950/60 to-slate-900/80 border border-blue-500/20 shadow-lg shadow-blue-500/5">
      {/* Cabeçalho */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-blue-500/15 rounded-xl">
          <Calculator className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <h3 className="text-white font-bold text-sm">Calculadora de Medidas</h3>
          <p className="text-blue-300/70 text-[10px]">Gramatura 120g · Sob encomenda</p>
        </div>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1 mb-1">
            <Ruler className="w-3 h-3" /> Altura (m)
          </label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="ex: 1,70"
            value={altura}
            onChange={(e) => { setAltura(e.target.value); setResultado(null); }}
            className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3 py-2 text-white text-sm placeholder-slate-600 focus:border-blue-500/60 outline-none transition-all focus:bg-slate-800"
          />
        </div>
        <div>
          <label className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1 mb-1">
            <Ruler className="w-3 h-3 rotate-90" /> Largura (m)
          </label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="ex: 2,50"
            value={largura}
            onChange={(e) => { setLargura(e.target.value); setResultado(null); }}
            className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl px-3 py-2 text-white text-sm placeholder-slate-600 focus:border-blue-500/60 outline-none transition-all focus:bg-slate-800"
          />
        </div>
      </div>

      {/* Botão calcular */}
      <button
        onClick={handleCalcular}
        className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-900/40"
      >
        <Calculator className="w-4 h-4" /> CALCULAR PREÇO
      </button>

      {/* Resultado */}
      {resultado && (
        <div className="mt-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {resultado.erro ? (
            <div className="flex items-start gap-2 p-3 bg-red-950/40 border border-red-500/30 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-xs leading-relaxed">{resultado.erro}</p>
            </div>
          ) : (
            <>
              <div className="p-4 bg-green-950/30 border border-green-500/25 rounded-xl space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span className="text-green-300 text-xs font-bold uppercase tracking-wider">Preço Calculado</span>
                </div>

                {/* Medidas */}
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <Ruler className="w-3 h-3" />
                  <span>
                    {String(resultado.alt.toFixed(2)).replace('.', ',')}m × {String(resultado.larg.toFixed(2)).replace('.', ',')}m · 120g
                  </span>
                </div>

                {/* Valor */}
                <p className="text-3xl font-black text-white tracking-tight">
                  {formatBRL(resultado.preco)}
                </p>

                {/* Regra aplicada */}
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <Info className="w-3 h-3" />
                  {resultado.regra === 'A'
                    ? 'Regra A: dimensão menor que 1,56m'
                    : 'Regra B: ambas dimensões entre 1,56m e 3,00m'}
                </div>
              </div>

              {/* Botão checkout */}
              <button
                onClick={handleCheckout}
                className="mt-3 w-full py-3 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 active:scale-95 text-white font-black rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-900/30"
              >
                <ShoppingCart className="w-4 h-4" /> IR PARA PRODUTO NA LOJA
              </button>

              <p className="text-center text-[10px] text-slate-600 mt-2">
                Ao clicar, você será direcionado para a página do produto.
              </p>
            </>
          )}
        </div>
      )}

      {/* Info – limites */}
      {!resultado && (
        <p className="text-[10px] text-slate-600 text-center mt-3">
          Dimensões aceitas: até 3,00m em cada lado
        </p>
      )}
    </div>
  );
};

export default CalculadoraMedidas;

import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';
import { 
  TrendingUp, 
  Scissors, 
  DollarSign,
  ArrowDownRight,
  TrendingDown,
  Calendar,
  ChevronDown,
  RefreshCw,
  AlertCircle,
  ShoppingBag,
  CreditCard,
  Plus,
  Truck,
  Activity,
  X
} from 'lucide-react';

const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ai-manager-nuvemshop.onrender.com';

const fmtBRL = (value) =>
  `R$ ${parseFloat(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

function getPeriodLabel(period, startDate, endDate) {
  if (period === 'current_month') {
    const now = new Date();
    return `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
  }
  if (period === 'last_month') {
    const now = new Date();
    const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${MONTH_NAMES[last.getMonth()]} ${last.getFullYear()}`;
  }
  if (period === 'semana') return 'Últimos 7 dias';
  if (period === 'quinzena') return 'Últimos 15 dias';
  if (startDate && endDate) {
    const s = startDate.split('-').reverse().join('/');
    const e = endDate.split('-').reverse().join('/');
    return `${s} — ${e}`;
  }
  return 'Período';
}

const PeriodSelector = ({ period, onChangePeriod, customStart, customEnd }) => {
  const [showCustom, setShowCustom] = useState(false);
  const [localStart, setLocalStart] = useState(customStart || '');
  const [localEnd, setLocalEnd] = useState(customEnd || '');

  const handlePeriod = (p) => {
    if (p === 'custom') {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      onChangePeriod(p, null, null);
    }
  };

  const applyCustom = () => {
    if (localStart && localEnd) {
      onChangePeriod('custom', localStart, localEnd);
      setShowCustom(false);
    }
  };

  const btnBase = 'px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200';
  const btnActive = 'btn-primary/20 text-[var(--accent)] border border-[var(--accent)]';
  const btnInactive = 'bg-[var(--surface-glass)]/60 text-[var(--text-muted)] border border-[var(--border-soft)] hover:bg-[var(--surface-glass)]';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="p-2 bg-[var(--surface-glass)] rounded-lg border border-[var(--border-soft)] hidden md:block">
        <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
      </div>
      <button onClick={() => handlePeriod('current_month')} className={`${btnBase} ${period === 'current_month' ? btnActive : btnInactive}`}>Mês Atual</button>
      <button onClick={() => handlePeriod('last_month')} className={`${btnBase} ${period === 'last_month' ? btnActive : btnInactive}`}>Mês Passado</button>
      <button onClick={() => handlePeriod('semana')} className={`${btnBase} ${period === 'semana' ? btnActive : btnInactive}`}>Semana</button>
      <button onClick={() => handlePeriod('quinzena')} className={`${btnBase} ${period === 'quinzena' ? btnActive : btnInactive}`}>Quinzena</button>
      <button onClick={() => handlePeriod('custom')} className={`${btnBase} ${period === 'custom' ? btnActive : btnInactive} flex items-center gap-1`}>
        Personalizado <ChevronDown className="w-3 h-3" />
      </button>

      {showCustom && (
        <div className="flex items-center gap-2 mt-2 w-full md:w-auto md:mt-0">
          <input type="date" value={localStart} onChange={(e) => setLocalStart(e.target.value)} className="bg-[var(--surface-glass)] border border-[var(--border-soft)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500" />
          <span className="text-[var(--text-muted)] text-xs">até</span>
          <input type="date" value={localEnd} onChange={(e) => setLocalEnd(e.target.value)} className="bg-[var(--surface-glass)] border border-[var(--border-soft)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500" />
          <button onClick={applyCustom} disabled={!localStart || !localEnd} className="px-4 py-2 rounded-lg text-xs font-bold btn-primary text-[var(--text-primary)] disabled:opacity-40 hover:btn-primary transition-all">Filtrar</button>
        </div>
      )}
    </div>
  );
};

const MetricCard = ({ title, value, icon: Icon, color, onClick }) => (
  <div onClick={onClick} className="p-5 rounded-2xl bg-[var(--surface-glass)]/50 border border-[var(--border-soft)] flex items-center gap-4 cursor-pointer hover:bg-[var(--surface-glass)]/80 hover:border-[var(--border-soft)] transition-all duration-300 hover:scale-[1.02]">
    <div className={`p-3 rounded-xl bg-[var(--surface-input)] border border-[var(--border-soft)]/50 ${color}`}>
      <Icon size={24} />
    </div>
    <div>
      <p className="text-sm font-medium text-[var(--text-muted)]">{title}</p>
      <div className="flex items-end gap-2">
        <h4 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">{value}</h4>
      </div>
    </div>
  </div>
);

const KPISidebar = ({ activeKpi, onClose, data, extraData }) => {
  const d = data || {};
  const renderContent = () => {
    switch (activeKpi) {
      case 'lucro':
        return (
          <div className="space-y-6 text-[18px]">
            <div className="flex justify-between text-[var(--text-muted)]"><span>Receita Total (Bruta):</span> <span>{fmtBRL((d.totalProfit || 0) + (d.gatewayFeeTotal || 0) + (d.shippingOwnerTotal || 0) + (d.productionCost || 0) + (d.sewingCost || 0))}</span></div>
            <div className="flex justify-between text-rose-400"><span>- Custo Produção:</span> <span>{fmtBRL(d.productionCost || 0)}</span></div>
            <div className="flex justify-between text-violet-400"><span>- Custo Costura:</span> <span>{fmtBRL(d.sewingCost || 0)}</span></div>
            <div className="flex justify-between text-orange-400"><span>- Transportadoras:</span> <span>{fmtBRL(d.shippingOwnerTotal || 0)}</span></div>
            <div className="flex justify-between text-amber-500"><span>- Taxas Nuvem Pago:</span> <span>{fmtBRL(d.gatewayFeeTotal || 0)}</span></div>
            <hr className="border-[var(--border-soft)]" />
            <div className="flex justify-between text-emerald-500 font-bold text-[22px]"><span>Lucro Líquido Real:</span> <span>{fmtBRL(d.totalProfit || 0)}</span></div>
          </div>
        );
      case 'frete_cliente':
        return (
          <div className="space-y-6 text-[18px]">
            <p className="text-[var(--text-muted)] text-[16px]">Este é o valor total exato que os seus clientes pagaram de frete no checkout da loja.</p>
            <div className="p-4 bg-[var(--surface-glass)] rounded-lg border border-[var(--border-soft)] text-center">
              <span className="text-[30px] font-bold text-rose-400">{fmtBRL(d.shippingCustomerTotal || 0)}</span>
            </div>
          </div>
        );
      case 'frete_real':
        return (
          <div className="space-y-6 text-[18px]">
            <p className="text-[var(--text-muted)] text-[16px]">Custo real pago para as transportadoras (inclui fretes grátis que saíram do seu bolso).</p>
            <div className="space-y-4 mt-4">
              {Object.entries(d.shippingDetails || {}).map(([name, val]) => (
                <div key={name} className="flex justify-between text-[var(--text-muted)] bg-[var(--surface-glass)] p-3 rounded border border-[var(--border-soft)]">
                  <span>{name}</span>
                  <span className="font-medium text-orange-400">{fmtBRL(val)}</span>
                </div>
              ))}
            </div>
            <hr className="border-[var(--border-soft)]" />
            <div className="flex justify-between text-orange-400 font-bold text-[22px]"><span>Total Pago:</span> <span>{fmtBRL(d.shippingOwnerTotal || 0)}</span></div>
          </div>
        );
      case 'frete_gratis':
        return (
          <div className="space-y-6 text-[18px]">
            <p className="text-[var(--text-muted)] text-[16px]">Análise de ROI sobre o subsídio de Frete Grátis.</p>
            <div className="flex justify-between text-[var(--text-muted)]"><span>Prejuízo bancado (Bolso):</span> <span className="text-red-500 font-bold">-{fmtBRL(d.freeShippingCost || 0)}</span></div>
            <div className="flex justify-between text-[var(--text-muted)]"><span>Lucro Líquido nestas vendas:</span> <span className="text-emerald-500 font-bold">{fmtBRL(d.profitFromFreeShipping || 0)}</span></div>
            <div className="mt-4 p-4 bg-[var(--surface-glass)] rounded-lg border border-[var(--border-soft)]">
              <p className="text-[16px] text-[var(--text-muted)] leading-relaxed">O retorno final (Lucro - Prejuízo) nestas vendas específicas foi de <strong className="text-[var(--text-primary)] text-[20px]">{fmtBRL((d.profitFromFreeShipping || 0) - (d.freeShippingCost || 0))}</strong>.</p>
            </div>
          </div>
        );
      case 'taxas':
        return (
          <div className="space-y-6 text-[18px]">
            <p className="text-[var(--text-muted)] text-[16px]">Divisão dos custos cobrados pelo Nuvem Pago.</p>
            <div className="flex justify-between text-[var(--text-muted)] bg-[var(--surface-glass)] p-4 rounded-lg border border-[var(--border-soft)]">
              <span>Cartão de Crédito</span>
              <span className="font-bold text-amber-500">{fmtBRL(d.gatewayFeeCard || 0)}</span>
            </div>
            <div className="flex justify-between text-[var(--text-muted)] bg-[var(--surface-glass)] p-4 rounded-lg border border-[var(--border-soft)]">
              <span>Pix</span>
              <span className="font-bold text-emerald-500">{fmtBRL(d.gatewayFeePix || 0)}</span>
            </div>
          </div>
        );
      case 'bobina':
        return (
          <div className="space-y-6 text-[18px]">
            <p className="text-[var(--text-muted)] text-[16px]">Custo de material gasto na confecção (120g e 160g).</p>
            <div className="flex justify-between text-[var(--text-muted)]"><span>Bobina 120g:</span> <span className="font-bold text-[var(--text-primary)]">{fmtBRL(d.productionCost120g || 0)}</span></div>
            <div className="flex justify-between text-[var(--text-muted)]"><span>Bobina 160g:</span> <span className="font-bold text-[var(--text-primary)]">{fmtBRL(d.productionCost160g || 0)}</span></div>
            <hr className="border-[var(--border-soft)]" />
            <div className="flex justify-between text-[var(--text-primary)] font-bold text-[22px]"><span>Total Material:</span> <span>{fmtBRL(d.productionCost || 0)}</span></div>
          </div>
        );
      case 'costura':
        return (
          <div className="space-y-6 text-[18px]">
            <p className="text-[var(--text-muted)] text-[16px]">Total repassado para a costureira baseado nos painéis analisados.</p>
            <div className="flex justify-between text-[var(--text-muted)] bg-[var(--surface-glass)] p-4 rounded-lg border border-[var(--border-soft)]">
              <span>Painéis / Unidades Produzidas:</span>
              <span className="font-bold text-[var(--text-primary)]">{d.analyzedItems || 0} un</span>
            </div>
            <div className="flex justify-between text-[var(--text-muted)] bg-[var(--surface-glass)] p-4 rounded-lg border border-[var(--border-soft)]">
              <span>Unidades Overloque:</span>
              <span className="font-bold text-[var(--text-primary)]">{d.overloqueCount || 0} un</span>
            </div>
            <div className="flex justify-between text-[var(--text-muted)] bg-[var(--surface-glass)] p-4 rounded-lg border border-[var(--border-soft)]">
              <span>Unidades Emendadas:</span>
              <span className="font-bold text-[var(--text-primary)]">{d.emendaCount || 0} un</span>
            </div>
          </div>
        );
      case 'sim_historical_match':
        const matchedOrders = (d.historicalOrders || []).filter(o => o.total >= (extraData?.sim2CartValue || 0));
        return (
          <div className="space-y-6 text-[18px]">
            <p className="text-[var(--text-muted)] text-[16px]">Lista de pedidos no período atual que atingiram ou ultrapassaram {fmtBRL(extraData?.sim2CartValue || 0)}.</p>
            <div className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {matchedOrders.map(o => (
                <div key={o.id} className="flex flex-col bg-[var(--surface-input)] p-4 rounded-xl border border-[var(--border-soft)]">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-[var(--text-primary)]">Pedido #{o.number}</span>
                    <span className="font-bold text-emerald-400">{fmtBRL(o.total)}</span>
                  </div>
                  <div className="flex justify-between text-[14px] text-[var(--text-muted)]">
                    <span className="capitalize">{o.paymentMethod === 'credit_card' ? 'Cartão de Crédito' : o.paymentMethod}</span>
                    {o.paymentMethod === 'credit_card' && <span>{o.installments}x sem juros</span>}
                  </div>
                </div>
              ))}
              {matchedOrders.length === 0 && <p className="text-center text-[var(--text-muted)] mt-4">Nenhum pedido encontrado.</p>}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const titles = {
    lucro: 'Detalhamento: Lucro Líquido',
    frete_cliente: 'Fretes Pagos (Cliente)',
    frete_real: 'Custo Real (Transportadoras)',
    frete_gratis: 'Análise de Subsídio (Frete)',
    taxas: 'Taxas Operacionais (Nuvem Pago)',
    bobina: 'Custos de Matéria Prima',
    costura: 'Custos de Costura',
    sim_historical_match: 'Pedidos Compatíveis'
  };

  return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" 
        onClick={onClose}
      >
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full max-w-md h-full bg-[var(--surface-input)] border-l border-[var(--border-soft)] shadow-2xl flex flex-col" 
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-[var(--border-soft)]">
            <h3 className="text-[25px] font-extrabold text-[var(--text-primary)] tracking-tight">{titles[activeKpi] || 'Detalhes'}</h3>
            <button onClick={onClose} className="p-3 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-glass)] rounded-lg transition-all">
              <X size={28} />
            </button>
          </div>
          <div className="p-6 flex-1 overflow-y-auto">
            {renderContent()}
          </div>
        </motion.div>
      </motion.div>
  );
};

const Finance = () => {
  const [profitPeriod, setProfitPeriod] = useState('current_month');
  const [profitCustomStart, setProfitCustomStart] = useState('');
  const [profitCustomEnd, setProfitCustomEnd] = useState('');
  const [profitData, setProfitData] = useState(null);
  const [profitLoading, setProfitLoading] = useState(true);
  const [profitError, setProfitError] = useState(null);
  const [feePercent, setFeePercent] = useState(4.69);
  const [feeFixed, setFeeFixed] = useState(0.35);
  const [feePixPercent, setFeePixPercent] = useState(0.99);
  const [feePixFixed, setFeePixFixed] = useState(0.00);
  const [activeKpi, setActiveKpi] = useState(null);

  // --- Estados do Simulador ---
  const [simCardAdoption, setSimCardAdoption] = useState(100); // 100% como padrão (editável)
  const [simMaxInstallments, setSimMaxInstallments] = useState(1);
  const [simIgnoreFreeShipping, setSimIgnoreFreeShipping] = useState(false);
  const [simRates, setSimRates] = useState({
    1: 4.99, 2: 5.88, 3: 7.26, 4: 8.51, 5: 9.95, 6: 11.05,
    7: 12.33, 8: 13.59, 9: 14.81, 10: 16.02, 11: 17.21, 12: 18.37
  });

  // --- Estados do Simulador de Projeção (Simulador 2) ---
  const [sim2CartCount, setSim2CartCount] = useState(10);
  const [sim2CartValue, setSim2CartValue] = useState(500);
  const [sim2Installments, setSim2Installments] = useState(3);

  const calculateSimulation2 = () => {
    let historyMargin = 0.25;
    if (profitData && profitData.totalProfit) {
      const historyGross = profitData.totalProfit + profitData.productionCost + profitData.sewingCost + profitData.gatewayFeeTotal + profitData.shippingOwnerTotal;
      if (historyGross > 0) {
        historyMargin = profitData.totalProfit / historyGross;
      }
    }
    
    const projGross = sim2CartCount * sim2CartValue;
    const profitScenarioA = projGross * historyMargin;
    
    const selectedRatePercent = simRates[sim2Installments] || 4.99;
    const baselineRate = simRates[1] || 4.99;
    const extraRate = Math.max(0, selectedRatePercent - baselineRate);
    
    const extraFeeCost = projGross * (extraRate / 100);
    const profitScenarioB = profitScenarioA - extraFeeCost;
    
    let historicalMatchCount = 0;
    let historicalCardMatchCount = 0;
    if (profitData && profitData.historicalOrders) {
      const matches = profitData.historicalOrders.filter(o => o.total >= sim2CartValue);
      historicalMatchCount = matches.length;
      historicalCardMatchCount = matches.filter(o => o.paymentMethod === 'credit_card').length;
    }

    return {
      projGross,
      profitScenarioA,
      extraFeeCost,
      profitScenarioB,
      historicalMatchCount,
      historicalCardMatchCount
    };
  };

  const sim2Results = calculateSimulation2();

  const calculateSimulation = () => {
    if (!profitData) return null;
    
    // Lucro Limpo Original
    let originalProfit = profitData.totalProfit;
    let extraProfit = 0;
    
    // Se remover o custo de frete grátis, o lucro simulado aumenta, pois o lojista não teria tido esse gasto
    if (simIgnoreFreeShipping && profitData.freeShippingCost) {
      extraProfit = profitData.freeShippingCost;
      originalProfit += extraProfit;
    }
    
    // Receita total que será considerada no cartão no simulador
    // Pode ser que você venda x bruto, vamos simular que "simCardAdoption" % desse bruto vai pro cartão
    const grossRevenue = originalProfit + profitData.productionCost + profitData.sewingCost + profitData.gatewayFeeTotal + profitData.shippingOwnerTotal;
    const simulatedCardRevenue = grossRevenue * (simCardAdoption / 100);
    
    // A taxa média será a taxa de parcelamento escolhida pelo lojista (ex: 3x -> 6.29%)
    const selectedRatePercent = simRates[simMaxInstallments] || 4.99;
    
    // Qual era a taxa de cartão original (real) no dashboard?
    // A gente usa a taxa que já estava embutida no gatewayFeeTotal
    const originalCardFee = profitData.gatewayFeeCard || 0;
    
    // A nova taxa que pagaremos será a % escolhida aplicada sobre a receita simulada do cartão
    const newSimulatedCardFee = simulatedCardRevenue * (selectedRatePercent / 100);
    
    // A diferença de juros que vamos "engolir" ou economizar
    const extraFeeCost = newSimulatedCardFee - originalCardFee;
    
    // Novo lucro
    const newEstimatedProfit = originalProfit - extraFeeCost;
    
    return {
      originalProfit,
      newEstimatedProfit,
      extraFeeCost,
      grossRevenue,
      simulatedCardRevenue
    };
  };

  const simResults = calculateSimulation();

  const fetchProfitStats = useCallback(async (period, start, end, fP, fF, fpP, fpF) => {
    setProfitLoading(true);
    setProfitError(null);
    try {
      const params = { period, feePercent: fP, feeFixed: fF, feePixPercent: fpP, feePixFixed: fpF };
      if (period === 'custom' && start && end) {
        params.start = start;
        params.end = end;
      }
      const res = await axios.get(`${API_BASE_URL}/api/profit-stats`, { params });
      setProfitData(res.data);
    } catch (err) {
      setProfitError(err.message);
    } finally {
      setProfitLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfitStats(profitPeriod, profitCustomStart, profitCustomEnd, feePercent, feeFixed, feePixPercent, feePixFixed);
  }, [profitPeriod, profitCustomStart, profitCustomEnd, feePercent, feeFixed, feePixPercent, feePixFixed, fetchProfitStats]);

  const handleChangePeriod = (period, start, end) => {
    setProfitPeriod(period);
    if (start !== undefined) setProfitCustomStart(start || '');
    if (end !== undefined) setProfitCustomEnd(end || '');
  };

  const periodLabel = getPeriodLabel(profitPeriod, profitData?.startDate, profitData?.endDate);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      
      {/* ── HEADER FINANCEIRO ── */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">Análise Financeira</h2>
          <p className="text-[var(--text-muted)] mt-1">Controle de lucros, taxas operacionais e custos de produção.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          
          {/* TAXA PIX */}
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider ml-1">Taxa Pix</label>
            <div className="flex items-center gap-1 bg-[var(--surface-glass)] border border-[var(--border-soft)] rounded-xl p-1.5 h-10">
              <input type="number" step="0.01" value={feePixPercent} onChange={e => setFeePixPercent(e.target.value)} className="bg-transparent text-[var(--text-primary)] px-1 w-12 text-sm font-medium outline-none text-right" />
              <span className="text-[var(--text-muted)] text-xs">% + R$</span>
              <input type="number" step="0.01" value={feePixFixed} onChange={e => setFeePixFixed(e.target.value)} className="bg-transparent text-[var(--text-primary)] px-1 w-12 text-sm font-medium outline-none text-right" />
            </div>
          </div>

          {/* TAXA CARTÃO */}
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider ml-1">Taxa Cartão</label>
            <div className="flex items-center gap-1 bg-[var(--surface-glass)] border border-[var(--border-soft)] rounded-xl p-1.5 h-10">
              <input type="number" step="0.01" value={feePercent} onChange={e => setFeePercent(e.target.value)} className="bg-transparent text-[var(--text-primary)] px-1 w-12 text-sm font-medium outline-none text-right" />
              <span className="text-[var(--text-muted)] text-xs">% + R$</span>
              <input type="number" step="0.01" value={feeFixed} onChange={e => setFeeFixed(e.target.value)} className="bg-transparent text-[var(--text-primary)] px-1 w-12 text-sm font-medium outline-none text-right" />
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => fetchProfitStats(profitPeriod, profitCustomStart, profitCustomEnd, feePercent, feeFixed, feePixPercent, feePixFixed)}
              disabled={profitLoading}
              className="h-10 px-4 rounded-xl bg-[var(--surface-glass)] hover:bg-slate-700 text-[var(--text-primary)] font-medium transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${profitLoading ? 'animate-spin text-[var(--accent)]' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[var(--surface-glass)]/40 p-4 rounded-2xl border border-[var(--border-soft)]/60 backdrop-blur-sm">
        <PeriodSelector
          period={profitPeriod}
          onChangePeriod={handleChangePeriod}
          customStart={profitCustomStart}
          customEnd={profitCustomEnd}
        />
      </div>

      {profitError && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <p>Erro ao carregar dados financeiros: {profitError}</p>
        </div>
      )}

      {/* ── SESSÃO 1: RECEITA E LUCRO ── */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Activity className="w-5 h-5 text-[var(--accent)]" /> Visão Geral ({periodLabel})
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card Principal: Lucro Líquido */}
          <div onClick={() => setActiveKpi('lucro')} className="md:col-span-1 rounded-3xl glass-panel bg-emerald-500/5 border border-emerald-500/20 p-6 flex flex-col justify-between relative overflow-hidden group cursor-pointer hover:scale-[1.02] hover:border-emerald-500/40 transition-all duration-300">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 blur-3xl rounded-full group-hover:bg-emerald-500/30 transition-all duration-500" />
            <div>
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6">
                <TrendingUp className="text-emerald-500" size={24} />
              </div>
              <p className="text-sm font-semibold text-emerald-500/80 uppercase tracking-wider mb-2">Lucro Líquido Real</p>
              {profitLoading ? (
                <div className="h-10 w-40 bg-[var(--surface-glass)]/50 rounded animate-pulse" />
              ) : (
                <h3 className="text-4xl font-black text-[var(--text-primary)] tracking-tight">{fmtBRL(profitData?.totalProfit)}</h3>
              )}
            </div>
            <div className="mt-6 flex items-center justify-between opacity-50 group-hover:opacity-100 transition-opacity">
              <span className="text-xs text-emerald-500/70 font-medium uppercase">Clique para detalhar</span>
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Plus size={14} className="text-emerald-500" />
              </div>
            </div>
          </div>

          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MetricCard title="Fretes Pagos pelo Cliente" value={fmtBRL(profitData?.shippingCustomerTotal || profitData?.shippingTotal)} icon={Truck} color="text-rose-400" onClick={() => setActiveKpi('frete_cliente')} />
            <MetricCard title="Custo Real Transportadoras" value={fmtBRL(profitData?.shippingOwnerTotal)} icon={Truck} color="text-orange-400" onClick={() => setActiveKpi('frete_real')} />
            
            <MetricCard title="Subsídio de Frete Grátis" value={fmtBRL(profitData?.freeShippingCost)} icon={TrendingDown} color="text-red-500" onClick={() => setActiveKpi('frete_gratis')} />
            <MetricCard title="Taxas Nuvem Pago" value={fmtBRL(profitData?.gatewayFeeTotal)} icon={CreditCard} color="text-amber-500" onClick={() => setActiveKpi('taxas')} />
            
            <MetricCard title="Custo Bobina Fornecedor" value={fmtBRL(profitData?.productionCost)} icon={TrendingDown} color="text-[var(--text-muted)]" onClick={() => setActiveKpi('bobina')} />
            <MetricCard title="Custo de Costureira" value={fmtBRL(profitData?.sewingCost)} icon={Scissors} color="text-violet-400" onClick={() => setActiveKpi('costura')} />
          </div>
        </div>
      </div>

      {/* ── SESSÃO 2: DETALHAMENTO DE LOGÍSTICA E TECIDO ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
        
        {/* Fretes por Transportadora */}
        <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-glass)]/50 p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 btn-primary/10 rounded-lg">
              <Truck className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Detalhamento de Fretes</h3>
          </div>
          
          <div className="space-y-4 flex-1">
            {profitLoading ? (
               <div className="h-20 bg-[var(--surface-glass)]/50 rounded-xl animate-pulse" />
            ) : Object.keys(profitData?.shippingDetails || {}).length > 0 ? (
              Object.entries(profitData.shippingDetails).map(([method, amount], i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface-input)]/50 border border-[var(--border-soft)]/50">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full btn-primary" />
                    <span className="text-sm font-medium text-[var(--text-muted)]">{method.toUpperCase()}</span>
                  </div>
                  <span className="text-sm font-bold text-[var(--text-primary)]">{fmtBRL(amount)}</span>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-sm">Nenhum custo de frete registrado.</div>
            )}
          </div>
        </div>

        {/* Consumo de Tecido */}
        <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-glass)]/50 p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <ShoppingBag className="w-5 h-5 text-emerald-500" />
            </div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Consumo de Insumos</h3>
          </div>
          
          <div className="space-y-6 flex-1">
            {profitLoading ? (
               <div className="h-20 bg-[var(--surface-glass)]/50 rounded-xl animate-pulse" />
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)] font-medium">Metro Linear (120g)</span>
                    <span className="text-[var(--text-primary)] font-bold">{profitData?.meters120g || 0} m</span>
                  </div>
                  <div className="h-2 w-full bg-[var(--surface-input)] rounded-full overflow-hidden">
                    <div className="h-full btn-primary rounded-full" style={{ width: '60%' }} />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)] font-medium">Metro Linear (160g)</span>
                    <span className="text-[var(--text-primary)] font-bold">{profitData?.meters160g || 0} m</span>
                  </div>
                  <div className="h-2 w-full bg-[var(--surface-input)] rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '40%' }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)] font-medium">Painéis Especiais (120g ≥ 1.70m)</span>
                    <span className="text-amber-500 font-bold">{profitData?.m2120g || 0} m²</span>
                  </div>
                  <div className="h-2 w-full bg-[var(--surface-input)] rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: '25%' }} />
                  </div>
                  <p className="text-xs text-[var(--text-muted)] pt-1">Custo unitário m²: R$ 24,90</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

        {/* 🔥 SESSÃO 3: SIMULADOR DE PARCELAMENTO SEM JUROS 🔥 */}
        <div className="mt-6 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-glass)]/50 p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <CreditCard className="w-5 h-5 text-amber-500" />
            </div>
            <h3 className="text-[25px] font-extrabold text-[var(--text-primary)]">Simulador: Parcelamento Sem Juros</h3>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <div>
                <label className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 block">
                  Adesão de Vendas no Cartão (%)
                </label>
                <input 
                  type="number" 
                  min="0" 
                  max="100" 
                  value={simCardAdoption}
                  onChange={e => setSimCardAdoption(Number(e.target.value))}
                  className="w-full bg-[var(--surface-input)] border border-[var(--border-soft)] rounded-xl p-3 text-[var(--text-primary)] text-lg font-bold outline-none focus:border-[var(--accent)] transition-colors"
                />
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  Qual porcentagem do seu faturamento bruto virá do cartão de crédito?
                </p>
              </div>
              
              <div>
                <label className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 block">
                  Máximo de Parcelas (Sem Juros)
                </label>
                <select 
                  value={simMaxInstallments}
                  onChange={e => setSimMaxInstallments(Number(e.target.value))}
                  className="w-full bg-[var(--surface-input)] border border-[var(--border-soft)] rounded-xl p-3 text-[var(--text-primary)] text-lg font-bold outline-none focus:border-[var(--accent)] transition-colors"
                >
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(num => (
                    <option key={num} value={num}>{num}x sem juros</option>
                  ))}
                </select>
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  A simulação usará a taxa equivalente a {simMaxInstallments}x da Nuvem Shop: <strong className="text-[var(--text-primary)]">{simRates[simMaxInstallments]}%</strong>.
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 block">
                  Configurações Adicionais
                </label>
                <div 
                  onClick={() => setSimIgnoreFreeShipping(!simIgnoreFreeShipping)}
                  className="flex items-center justify-between bg-[var(--surface-input)] border border-[var(--border-soft)] rounded-xl p-3 cursor-pointer hover:border-[var(--accent)] transition-colors"
                >
                  <span className="text-sm font-bold text-[var(--text-primary)]">Remover custo de Frete Grátis</span>
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${simIgnoreFreeShipping ? 'bg-emerald-500' : 'bg-[var(--border-soft)]'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${simIgnoreFreeShipping ? 'left-5.5 right-0.5' : 'left-0.5'}`} />
                  </div>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
                  Mostra como o lucro ficaria se você não tivesse oferecido e pago frete grátis nessas vendas.
                </p>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="h-full rounded-2xl glass-panel p-6 flex flex-col justify-center relative overflow-hidden bg-[var(--surface-input)] border border-[var(--border-soft)]">
                {profitLoading || !simResults ? (
                  <div className="h-full w-full bg-[var(--surface-glass)]/50 rounded animate-pulse" />
                ) : (
                  <>
                    <h4 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-6">Resultado do Simulação no Período</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div>
                        <p className="text-xs text-[var(--text-muted)] mb-1">Lucro Original</p>
                        <p className="text-2xl font-bold text-[var(--text-primary)]">{fmtBRL(simResults.originalProfit)}</p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-[var(--text-muted)] mb-1">Custo Extra Absorvido (Juros)</p>
                        <p className="text-2xl font-bold text-rose-400">-{fmtBRL(Math.max(0, simResults.extraFeeCost))}</p>
                      </div>

                      <div>
                        <p className="text-xs text-[var(--text-muted)] mb-1">Novo Lucro Final Líquido</p>
                        <p className={`text-3xl font-black ${simResults.newEstimatedProfit > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {fmtBRL(simResults.newEstimatedProfit)}
                        </p>
                      </div>
                    </div>
                    
                    {simResults.extraFeeCost > 0 && (
                      <div className="mt-6 p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                        <p className="text-sm text-amber-500/90 font-medium">
                          Oferecer até {simMaxInstallments}x sem juros e ter {simCardAdoption}% das vendas no cartão 
                          diminuirá seu lucro limpo em <strong className="text-amber-500">{fmtBRL(simResults.extraFeeCost)}</strong> no período analisado.
                        </p>
                      </div>
                    )}
                    {simResults.extraFeeCost <= 0 && (
                      <div className="mt-6 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <p className="text-sm text-emerald-500/90 font-medium">
                          As taxas selecionadas são iguais ou menores do que você já pagou originalmente neste período. Seu lucro não será prejudicado.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Seção colapsável de Taxas */}
          <div className="mt-6 border-t border-[var(--border-soft)] pt-6">
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <CreditCard size={16} /> Editar Tabela de Taxas (%) Nuvem Shop
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(num => (
                <div key={num} className="bg-[var(--surface-input)] p-2 rounded-lg border border-[var(--border-soft)]">
                  <label className="text-xs text-[var(--text-muted)] block mb-1">{num}x</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={simRates[num]}
                    onChange={(e) => setSimRates({...simRates, [num]: Number(e.target.value)})}
                    className="w-full bg-transparent text-[var(--text-primary)] text-sm font-bold outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 🔥 SESSÃO 4: SIMULADOR DE CENÁRIOS FICTÍCIOS 🔥 */}
        <div className="mt-6 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-glass)]/50 p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <CreditCard className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-[25px] font-extrabold text-[var(--text-primary)]">Simulador de Cenários: Projeção</h3>
              <p className="text-sm text-[var(--text-muted)]">Crie vendas fictícias e simule o lucro usando sua margem histórica.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Inputs Section */}
            <div className="lg:col-span-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase block mb-1">Valor do Carrinho (R$)</label>
                <input type="number" min="0" value={sim2CartValue} onChange={e => setSim2CartValue(Number(e.target.value))} className="w-full bg-[var(--surface-input)] border border-[var(--border-soft)] rounded-lg p-2 text-white font-bold outline-none" />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase block mb-1">Quantidade de Carrinhos</label>
                <input type="number" min="0" value={sim2CartCount} onChange={e => setSim2CartCount(Number(e.target.value))} className="w-full bg-[var(--surface-input)] border border-[var(--border-soft)] rounded-lg p-2 text-white font-bold outline-none" />
                
                {sim2Results && sim2Results.historicalMatchCount !== undefined && (
                  <div 
                    onClick={() => setActiveKpi('sim_historical_match')} 
                    className="mt-4 p-4 bg-[var(--surface-input)]/50 border border-[var(--border-soft)] rounded-xl cursor-pointer hover:border-amber-500/50 transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">Base Histórica</div>
                      <div className="text-[18px] font-bold text-amber-400 group-hover:text-amber-300">
                        {sim2Results.historicalMatchCount} carrinhos <span className="text-sm text-[var(--text-muted)] font-normal ml-1">acima de {fmtBRL(sim2CartValue)}</span>
                      </div>
                      {sim2Results.historicalMatchCount > 0 && (
                        <div className="text-xs text-[var(--text-muted)] mt-1">
                          Sendo <strong className="text-emerald-400">{sim2Results.historicalCardMatchCount}</strong> no Cartão
                        </div>
                      )}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                      <ShoppingBag size={16} />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase block mb-1">Parcelas s/ Juros</label>
                <select value={sim2Installments} onChange={e => setSim2Installments(Number(e.target.value))} className="w-full bg-[var(--surface-input)] border border-[var(--border-soft)] rounded-lg p-2 text-white font-bold outline-none">
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={n}>{n}x</option>)}
                </select>
              </div>
            </div>

            {/* Results Section */}
            <div className="lg:col-span-8">
              <div className="h-full rounded-2xl bg-[var(--surface-input)] border border-[var(--border-soft)] p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 h-full">
                  
                  {/* Cenario A */}
                  <div className="flex flex-col h-full border-r border-[var(--border-soft)] pr-8">
                    <h4 className="text-sm font-bold text-[var(--text-muted)] uppercase mb-4">Cenário A: Sem Juros Repassado</h4>
                    <div className="space-y-4 flex-1">
                      <div>
                        <p className="text-xs text-[var(--text-muted)]">Faturamento Bruto</p>
                        <p className="text-lg font-semibold text-white">{fmtBRL(sim2Results?.projGross || 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--text-muted)]">Lucro Líquido</p>
                        <p className="text-3xl font-black text-emerald-500/80">{fmtBRL(sim2Results?.profitScenarioA || 0)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Cenario B */}
                  <div className="flex flex-col h-full pl-2">
                    <h4 className="text-sm font-bold text-[var(--text-muted)] uppercase mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Cenário B: Absorvendo {sim2Installments}x
                    </h4>
                    <div className="space-y-4 flex-1">
                      <div>
                        <p className="text-xs text-[var(--text-muted)]">Faturamento Bruto</p>
                        <p className="text-lg font-semibold text-white">{fmtBRL(sim2Results?.projGross || 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--text-muted)]">Custo Extra dos Juros</p>
                        <p className="text-lg font-semibold text-rose-400">-{fmtBRL(sim2Results?.extraFeeCost || 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--text-muted)]">Lucro Líquido</p>
                        <p className="text-3xl font-black text-emerald-500">{fmtBRL(sim2Results?.profitScenarioB || 0)}</p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>

        <AnimatePresence>
          {activeKpi && <KPISidebar activeKpi={activeKpi} onClose={() => setActiveKpi(null)} data={profitData} extraData={{ sim2CartValue }} />}
        </AnimatePresence>
      </div>
  );
};

export default Finance;

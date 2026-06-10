import React, { useState, useEffect, useCallback } from 'react';
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

const PeriodSelector = ({ period, onChangePeriod, customStart, customEnd, onChangeCustom }) => {
  const [showCustom, setShowCustom] = useState(false);

  const handlePeriod = (p) => {
    if (p === 'custom') {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      onChangePeriod(p, null, null);
    }
  };

  const applyCustom = () => {
    if (customStart && customEnd) {
      onChangePeriod('custom', customStart, customEnd);
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
          <input type="date" value={customStart} onChange={(e) => onChangeCustom(e.target.value, customEnd)} className="bg-[var(--surface-glass)] border border-[var(--border-soft)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500" />
          <span className="text-[var(--text-muted)] text-xs">até</span>
          <input type="date" value={customEnd} onChange={(e) => onChangeCustom(customStart, e.target.value)} className="bg-[var(--surface-glass)] border border-[var(--border-soft)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500" />
          <button onClick={applyCustom} disabled={!customStart || !customEnd} className="px-4 py-2 rounded-lg text-xs font-bold btn-primary text-[var(--text-primary)] disabled:opacity-40 hover:btn-primary transition-all">Filtrar</button>
        </div>
      )}
    </div>
  );
};

const MetricCard = ({ title, value, icon: Icon, color, onClick }) => (
  <div onClick={onClick} className="p-5 rounded-2xl bg-[var(--surface-glass)]/50 border border-[var(--border-soft)] flex items-center gap-4 cursor-pointer hover:bg-[var(--surface-glass)]/80 hover:border-[var(--border-soft)] transition-all duration-300 hover:scale-[1.02]">
    <div className={`p-3 rounded-xl bg-slate-950 border border-[var(--border-soft)]/50 ${color}`}>
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

const KPISidebar = ({ activeKpi, onClose, data }) => {
  if (!activeKpi || !data) return null;

  const renderContent = () => {
    switch (activeKpi) {
      case 'lucro':
        return (
          <div className="space-y-4 text-sm">
            <div className="flex justify-between text-slate-300"><span>Receita Total (Bruta):</span> <span>{fmtBRL(data.totalProfit + data.gatewayFeeTotal + data.shippingOwnerTotal + data.productionCost + data.sewingCost)}</span></div>
            <div className="flex justify-between text-rose-400"><span>- Custo Produção:</span> <span>{fmtBRL(data.productionCost)}</span></div>
            <div className="flex justify-between text-violet-400"><span>- Custo Costura:</span> <span>{fmtBRL(data.sewingCost)}</span></div>
            <div className="flex justify-between text-orange-400"><span>- Transportadoras:</span> <span>{fmtBRL(data.shippingOwnerTotal)}</span></div>
            <div className="flex justify-between text-amber-400"><span>- Taxas Nuvem Pago:</span> <span>{fmtBRL(data.gatewayFeeTotal)}</span></div>
            <hr className="border-[var(--border-soft)]" />
            <div className="flex justify-between text-emerald-400 font-bold text-base"><span>Lucro Líquido Real:</span> <span>{fmtBRL(data.totalProfit)}</span></div>
          </div>
        );
      case 'frete_cliente':
        return (
          <div className="space-y-4 text-sm">
            <p className="text-[var(--text-muted)]">Este é o valor total exato que os seus clientes pagaram de frete no checkout da loja.</p>
            <div className="p-4 bg-[var(--surface-glass)] rounded-lg border border-[var(--border-soft)] text-center">
              <span className="text-2xl font-bold text-rose-400">{fmtBRL(data.shippingCustomerTotal)}</span>
            </div>
          </div>
        );
      case 'frete_real':
        return (
          <div className="space-y-4 text-sm">
            <p className="text-[var(--text-muted)]">Custo real pago para as transportadoras (inclui fretes grátis que saíram do seu bolso).</p>
            <div className="space-y-2 mt-4">
              {Object.entries(data.shippingDetails || {}).map(([name, val]) => (
                <div key={name} className="flex justify-between text-slate-300 bg-[var(--surface-glass)] p-2 rounded border border-[var(--border-soft)]">
                  <span>{name}</span>
                  <span className="font-medium text-orange-400">{fmtBRL(val)}</span>
                </div>
              ))}
            </div>
            <hr className="border-[var(--border-soft)]" />
            <div className="flex justify-between text-orange-400 font-bold text-base"><span>Total Pago:</span> <span>{fmtBRL(data.shippingOwnerTotal)}</span></div>
          </div>
        );
      case 'frete_gratis':
        return (
          <div className="space-y-4 text-sm">
            <p className="text-[var(--text-muted)]">Análise de ROI sobre o subsídio de Frete Grátis.</p>
            <div className="flex justify-between text-slate-300"><span>Prejuízo bancado (Bolso):</span> <span className="text-red-500 font-medium">-{fmtBRL(data.freeShippingCost)}</span></div>
            <div className="flex justify-between text-slate-300"><span>Lucro Líquido nestas vendas:</span> <span className="text-emerald-400 font-medium">{fmtBRL(data.profitFromFreeShipping)}</span></div>
            <div className="mt-4 p-3 bg-[var(--surface-glass)] rounded border border-[var(--border-soft)]">
              <p className="text-xs text-[var(--text-muted)]">O retorno final (Lucro - Prejuízo) nestas vendas específicas foi de <strong className="text-[var(--text-primary)]">{fmtBRL(data.profitFromFreeShipping - data.freeShippingCost)}</strong>.</p>
            </div>
          </div>
        );
      case 'taxas':
        return (
          <div className="space-y-4 text-sm">
            <p className="text-[var(--text-muted)]">Divisão dos custos cobrados pelo Nuvem Pago.</p>
            <div className="flex justify-between text-slate-300 bg-[var(--surface-glass)] p-3 rounded border border-[var(--border-soft)]">
              <span>Cartão de Crédito</span>
              <span className="text-amber-400 font-medium">{fmtBRL(data.gatewayFeeCard)}</span>
            </div>
            <div className="flex justify-between text-slate-300 bg-[var(--surface-glass)] p-3 rounded border border-[var(--border-soft)]">
              <span>Pix</span>
              <span className="text-amber-400 font-medium">{fmtBRL(data.gatewayFeePix)}</span>
            </div>
            <hr className="border-[var(--border-soft)]" />
            <div className="flex justify-between text-amber-400 font-bold text-base"><span>Total de Taxas:</span> <span>{fmtBRL(data.gatewayFeeTotal)}</span></div>
          </div>
        );
      case 'bobina':
        return (
          <div className="space-y-4 text-sm">
            <p className="text-[var(--text-muted)]">Consumo e custo da matéria prima separados por gramatura.</p>
            
            <div className="p-3 bg-[var(--surface-glass)] rounded-lg border border-[var(--border-soft)] space-y-2">
              <h4 className="font-bold text-[var(--text-primary)] mb-2">Tecido 120g</h4>
              <div className="flex justify-between text-slate-300"><span>Metros Lineares:</span> <span>{data.meters120g?.toFixed(2)} m</span></div>
              <div className="flex justify-between text-slate-300"><span>Metros Quadrados (Especiais):</span> <span>{data.m2120g?.toFixed(2)} m²</span></div>
              <div className="flex justify-between text-slate-300 font-medium pt-2 border-t border-[var(--border-soft)]"><span>Custo Financeiro:</span> <span className="text-slate-300">{fmtBRL(data.productionCost120g)}</span></div>
            </div>

            <div className="p-3 bg-[var(--surface-glass)] rounded-lg border border-[var(--border-soft)] space-y-2">
              <h4 className="font-bold text-[var(--text-primary)] mb-2">Tecido 160g</h4>
              <div className="flex justify-between text-slate-300"><span>Metros Lineares:</span> <span>{data.meters160g?.toFixed(2)} m</span></div>
              <div className="flex justify-between text-slate-300 font-medium pt-2 border-t border-[var(--border-soft)]"><span>Custo Financeiro:</span> <span className="text-slate-300">{fmtBRL(data.productionCost160g)}</span></div>
            </div>

            <hr className="border-[var(--border-soft)]" />
            <div className="flex justify-between text-[var(--text-primary)] font-bold text-base"><span>Custo Total:</span> <span>{fmtBRL(data.productionCost)}</span></div>
          </div>
        );
      case 'costura':
        return (
          <div className="space-y-4 text-sm">
            <p className="text-[var(--text-muted)]">Total repassado para a costureira baseado nos painéis analisados.</p>
            <div className="flex justify-between text-slate-300 bg-[var(--surface-glass)] p-3 rounded border border-[var(--border-soft)]">
              <span>Painéis / Unidades Produzidas:</span>
              <span className="text-violet-400 font-bold">{data.analyzedItems} unidades</span>
            </div>
            
            <div className="p-3 bg-[var(--surface-glass)] rounded-lg border border-[var(--border-soft)] space-y-2">
              <h4 className="font-bold text-[var(--text-primary)] mb-2">Detalhamento por Tipo</h4>
              <div className="flex justify-between text-slate-300">
                <span>Overloque (Padrão):</span> 
                <span className="text-violet-400">{data.overloqueCount || 0} unidades</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Emendas:</span> 
                <span className="text-violet-400">{data.emendaCount || 0} unidades</span>
              </div>
            </div>

            <hr className="border-[var(--border-soft)]" />
            <div className="flex justify-between text-violet-400 font-bold text-base"><span>Custo Total Costura:</span> <span>{fmtBRL(data.sewingCost)}</span></div>
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
    costura: 'Custos de Costura'
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}>
      <div className="w-full max-w-md h-full bg-slate-950 border-l border-[var(--border-soft)] shadow-2xl flex flex-col transform transition-transform" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-soft)]">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">{titles[activeKpi]}</h3>
          <button onClick={onClose} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-glass)] rounded-lg transition-all">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 flex-1 overflow-y-auto">
          {renderContent()}
        </div>
      </div>
    </div>
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
          onChangeCustom={(s, e) => { setProfitCustomStart(s); setProfitCustomEnd(e); }}
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
          <div onClick={() => setActiveKpi('lucro')} className="md:col-span-1 rounded-3xl bg-gradient-to-br from-emerald-900/40 via-slate-900 to-slate-950 border border-emerald-500/20 p-6 flex flex-col justify-between relative overflow-hidden group cursor-pointer hover:scale-[1.02] hover:border-emerald-500/40 transition-all duration-300">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 blur-3xl rounded-full group-hover:bg-emerald-500/30 transition-all duration-500" />
            <div>
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6">
                <TrendingUp className="text-emerald-400" size={24} />
              </div>
              <p className="text-sm font-semibold text-emerald-400/80 uppercase tracking-wider mb-2">Lucro Líquido Real</p>
              {profitLoading ? (
                <div className="h-10 w-40 bg-[var(--surface-glass)]/50 rounded animate-pulse" />
              ) : (
                <h3 className="text-4xl font-black text-[var(--text-primary)] tracking-tight">{fmtBRL(profitData?.totalProfit)}</h3>
              )}
            </div>
            <div className="mt-6 flex items-center justify-between opacity-50 group-hover:opacity-100 transition-opacity">
              <span className="text-xs text-emerald-400/70 font-medium uppercase">Clique para detalhar</span>
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Plus size={14} className="text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MetricCard title="Fretes Pagos pelo Cliente" value={fmtBRL(profitData?.shippingCustomerTotal || profitData?.shippingTotal)} icon={Truck} color="text-rose-400" onClick={() => setActiveKpi('frete_cliente')} />
            <MetricCard title="Custo Real Transportadoras" value={fmtBRL(profitData?.shippingOwnerTotal)} icon={Truck} color="text-orange-400" onClick={() => setActiveKpi('frete_real')} />
            
            <MetricCard title="Subsídio de Frete Grátis" value={fmtBRL(profitData?.freeShippingCost)} icon={TrendingDown} color="text-red-500" onClick={() => setActiveKpi('frete_gratis')} />
            <MetricCard title="Taxas Nuvem Pago" value={fmtBRL(profitData?.gatewayFeeTotal)} icon={CreditCard} color="text-amber-400" onClick={() => setActiveKpi('taxas')} />
            
            <MetricCard title="Custo Bobina Fornecedor" value={fmtBRL(profitData?.productionCost)} icon={TrendingDown} color="text-slate-300" onClick={() => setActiveKpi('bobina')} />
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
                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-slate-950/50 border border-[var(--border-soft)]/50">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full btn-primary" />
                    <span className="text-sm font-medium text-slate-300">{method.toUpperCase()}</span>
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
              <ShoppingBag className="w-5 h-5 text-emerald-400" />
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
                  <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                    <div className="h-full btn-primary rounded-full" style={{ width: '60%' }} />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)] font-medium">Metro Linear (160g)</span>
                    <span className="text-[var(--text-primary)] font-bold">{profitData?.meters160g || 0} m</span>
                  </div>
                  <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '40%' }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)] font-medium">Painéis Especiais (120g ≥ 1.70m)</span>
                    <span className="text-amber-400 font-bold">{profitData?.m2120g || 0} m²</span>
                  </div>
                  <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: '25%' }} />
                  </div>
                  <p className="text-xs text-[var(--text-muted)] pt-1">Custo unitário m²: R$ 24,90</p>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
      <KPISidebar activeKpi={activeKpi} onClose={() => setActiveKpi(null)} data={profitData} />
    </div>
  );
};

export default Finance;

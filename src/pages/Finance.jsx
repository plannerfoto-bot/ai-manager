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
  Truck,
  Activity
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
  const btnActive = 'bg-blue-600/20 text-blue-400 border border-blue-500/40';
  const btnInactive = 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:bg-slate-800';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 hidden md:block">
        <Calendar className="w-4 h-4 text-slate-500" />
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
          <input type="date" value={customStart} onChange={(e) => onChangeCustom(e.target.value, customEnd)} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500" />
          <span className="text-slate-500 text-xs">até</span>
          <input type="date" value={customEnd} onChange={(e) => onChangeCustom(customStart, e.target.value)} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500" />
          <button onClick={applyCustom} disabled={!customStart || !customEnd} className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 text-white disabled:opacity-40 hover:bg-blue-500 transition-colors">Filtrar</button>
        </div>
      )}
    </div>
  );
};

const MetricCard = ({ title, value, icon: Icon, color, trend }) => (
  <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-center gap-4">
    <div className={`p-3 rounded-xl bg-slate-950 border border-slate-800/50 ${color}`}>
      <Icon size={24} />
    </div>
    <div>
      <p className="text-sm font-medium text-slate-400">{title}</p>
      <div className="flex items-end gap-2">
        <h4 className="text-2xl font-bold text-white tracking-tight">{value}</h4>
        {trend && <span className="text-xs font-medium text-slate-500 mb-1">{trend}</span>}
      </div>
    </div>
  </div>
);

const Finance = () => {
  const [profitPeriod, setProfitPeriod] = useState('current_month');
  const [profitCustomStart, setProfitCustomStart] = useState('');
  const [profitCustomEnd, setProfitCustomEnd] = useState('');
  const [profitData, setProfitData] = useState(null);
  const [profitLoading, setProfitLoading] = useState(true);
  const [profitError, setProfitError] = useState(null);
  const [feePercent, setFeePercent] = useState(4.79);
  const [feeFixed, setFeeFixed] = useState(0.30);
  const [feePixPercent, setFeePixPercent] = useState(0.00);
  const [feePixFixed, setFeePixFixed] = useState(0.99);

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
          <h2 className="text-3xl font-bold text-white tracking-tight">Análise Financeira</h2>
          <p className="text-slate-400 mt-1">Controle de lucros, taxas operacionais e custos de produção.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          
          {/* TAXA PIX */}
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Taxa Pix</label>
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1.5 h-10">
              <input type="number" step="0.01" value={feePixPercent} onChange={e => setFeePixPercent(e.target.value)} className="bg-transparent text-white px-1 w-12 text-sm font-medium outline-none text-right" />
              <span className="text-slate-500 text-xs">% + R$</span>
              <input type="number" step="0.01" value={feePixFixed} onChange={e => setFeePixFixed(e.target.value)} className="bg-transparent text-white px-1 w-12 text-sm font-medium outline-none text-right" />
            </div>
          </div>

          {/* TAXA CARTÃO */}
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Taxa Cartão</label>
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1.5 h-10">
              <input type="number" step="0.01" value={feePercent} onChange={e => setFeePercent(e.target.value)} className="bg-transparent text-white px-1 w-12 text-sm font-medium outline-none text-right" />
              <span className="text-slate-500 text-xs">% + R$</span>
              <input type="number" step="0.01" value={feeFixed} onChange={e => setFeeFixed(e.target.value)} className="bg-transparent text-white px-1 w-12 text-sm font-medium outline-none text-right" />
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => fetchProfitStats(profitPeriod, profitCustomStart, profitCustomEnd, feePercent, feeFixed, feePixPercent, feePixFixed)}
              disabled={profitLoading}
              className="h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${profitLoading ? 'animate-spin text-blue-400' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800/60 backdrop-blur-sm">
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
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-500" /> Visão Geral ({periodLabel})
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card Principal: Lucro Líquido */}
          <div className="md:col-span-1 rounded-3xl bg-gradient-to-br from-emerald-900/40 via-slate-900 to-slate-950 border border-emerald-500/20 p-6 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 blur-3xl rounded-full group-hover:bg-emerald-500/20 transition-all duration-500" />
            <div>
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6">
                <TrendingUp className="text-emerald-400" size={24} />
              </div>
              <p className="text-sm font-semibold text-emerald-400/80 uppercase tracking-wider mb-2">Lucro Líquido Real</p>
              {profitLoading ? (
                <div className="h-10 w-40 bg-slate-800/50 rounded animate-pulse" />
              ) : (
                <h3 className="text-4xl font-black text-white tracking-tight">{fmtBRL(profitData?.totalProfit)}</h3>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-6 font-medium">Após deduzir taxas, fretes e insumos.</p>
          </div>

          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MetricCard title="Custo de Frete Cliente" value={fmtBRL(profitData?.shippingTotal)} icon={Truck} color="text-rose-400" trend="Total repassado" />
            <MetricCard title="Taxas Nuvem Pago" value={fmtBRL(profitData?.gatewayFeeTotal)} icon={CreditCard} color="text-amber-400" trend="Pix e Cartão somados" />
            <MetricCard title="Custo Bobina Fornecedor" value={fmtBRL(profitData?.productionCost)} icon={TrendingDown} color="text-slate-300" trend="Metro linear + m²" />
            <MetricCard title="Custo de Costureira" value={fmtBRL(profitData?.sewingCost)} icon={Scissors} color="text-violet-400" trend={`${profitData?.analyzedItems ?? 0} painéis`} />
          </div>
        </div>
      </div>

      {/* ── SESSÃO 2: DETALHAMENTO DE LOGÍSTICA E TECIDO ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
        
        {/* Fretes por Transportadora */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Truck className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Detalhamento de Fretes</h3>
          </div>
          
          <div className="space-y-4 flex-1">
            {profitLoading ? (
               <div className="h-20 bg-slate-800/50 rounded-xl animate-pulse" />
            ) : Object.keys(profitData?.shippingDetails || {}).length > 0 ? (
              Object.entries(profitData.shippingDetails).map(([method, amount], i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-slate-950/50 border border-slate-800/50">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-sm font-medium text-slate-300">{method.toUpperCase()}</span>
                  </div>
                  <span className="text-sm font-bold text-white">{fmtBRL(amount)}</span>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">Nenhum custo de frete registrado.</div>
            )}
          </div>
        </div>

        {/* Consumo de Tecido */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <ShoppingBag className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Consumo de Insumos</h3>
          </div>
          
          <div className="space-y-6 flex-1">
            {profitLoading ? (
               <div className="h-20 bg-slate-800/50 rounded-xl animate-pulse" />
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400 font-medium">Metro Linear (120g)</span>
                    <span className="text-white font-bold">{profitData?.meters120g || 0} m</span>
                  </div>
                  <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '60%' }} />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400 font-medium">Metro Linear (160g)</span>
                    <span className="text-white font-bold">{profitData?.meters160g || 0} m</span>
                  </div>
                  <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '40%' }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400 font-medium">Painéis Especiais (120g ≥ 1.70m)</span>
                    <span className="text-amber-400 font-bold">{profitData?.m2120g || 0} m²</span>
                  </div>
                  <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: '25%' }} />
                  </div>
                  <p className="text-xs text-slate-500 pt-1">Custo unitário m²: R$ 24,90</p>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Finance;

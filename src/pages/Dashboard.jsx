import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Share2,
  Scissors,
  TrendingDown,
  Calendar,
  ChevronDown,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import Card from '../components/atoms/Card';

// ─────────────────────────────────────────────────────────────
// URL base da API (replicada aqui para simplicity)
// ─────────────────────────────────────────────────────────────
const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ai-manager-nuvemshop.onrender.com';

// ─────────────────────────────────────────────────────────────
// Helpers de formatação
// ─────────────────────────────────────────────────────────────
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
  if (startDate && endDate) {
    const s = startDate.split('-').reverse().join('/');
    const e = endDate.split('-').reverse().join('/');
    return `${s} — ${e}`;
  }
  return 'Período';
}

// ─────────────────────────────────────────────────────────────
// Componente: Seletor de Período
// ─────────────────────────────────────────────────────────────
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

  const btnBase = 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200';
  const btnActive = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
  const btnInactive = 'bg-slate-800/60 text-slate-400 border border-slate-700/40 hover:bg-slate-700/60';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Calendar className="w-4 h-4 text-slate-500" />
      <button
        onClick={() => handlePeriod('current_month')}
        className={`${btnBase} ${period === 'current_month' ? btnActive : btnInactive}`}
      >
        Mês Atual
      </button>
      <button
        onClick={() => handlePeriod('last_month')}
        className={`${btnBase} ${period === 'last_month' ? btnActive : btnInactive}`}
      >
        Mês Passado
      </button>
      <button
        onClick={() => handlePeriod('custom')}
        className={`${btnBase} ${period === 'custom' ? btnActive : btnInactive} flex items-center gap-1`}
      >
        Personalizado <ChevronDown className="w-3 h-3" />
      </button>

      {showCustom && (
        <div className="flex items-center gap-2 mt-1 w-full sm:w-auto sm:mt-0">
          <input
            type="date"
            value={customStart}
            onChange={(e) => onChangeCustom(e.target.value, customEnd)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
          <span className="text-slate-500 text-xs">até</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => onChangeCustom(customStart, e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={applyCustom}
            disabled={!customStart || !customEnd}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white disabled:opacity-40 hover:bg-emerald-500 transition-colors"
          >
            Filtrar
          </button>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Componente: KPI Card de Lucro / Costureira
// ─────────────────────────────────────────────────────────────
const ProfitKpiCard = ({ title, value, subtitle, icon: Icon, color, gradient, loading, error }) => (
  <div
    className={`relative overflow-hidden rounded-2xl border p-5 flex flex-col gap-3
      ${gradient}
      transition-all duration-300 hover:scale-[1.02]`}
  >
    {/* Orb decorativo */}
    <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20 blur-xl ${color}`} />

    <div className="flex items-center justify-between">
      <div className={`p-2.5 rounded-xl bg-black/20 ${color}`}>
        <Icon size={22} />
      </div>
      <span className="text-xs font-bold text-white/40 uppercase tracking-wider">{subtitle}</span>
    </div>

    <div>
      <p className="text-xs text-white/50 font-medium mb-1">{title}</p>
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="h-8 w-32 bg-white/10 rounded animate-pulse" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-rose-400">
          <AlertCircle size={16} />
          <span className="text-sm">Erro ao carregar</span>
        </div>
      ) : (
        <h3 className="text-3xl font-black text-white tracking-tight">{value}</h3>
      )}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// DASHBOARD PRINCIPAL
// ─────────────────────────────────────────────────────────────
const Dashboard = ({ stats }) => {
  // ── Stats gerais (recebidos via props)
  const cards = [
    {
      title: 'Vendas Totais',
      value: `R$ ${stats.totalSales || '0,00'}`,
      icon: DollarSign,
      trend: '+12.5%',
      color: 'text-green-500'
    },
    {
      title: 'Pedidos',
      value: stats.ordersCount || 0,
      icon: ShoppingBag,
      trend: '+8.2%',
      color: 'text-blue-500'
    },
    {
      title: 'Produtos',
      value: stats.productsCount || 0,
      icon: TrendingUp,
      trend: '+3.1%',
      color: 'text-purple-500'
    },
    {
      title: 'Automações',
      value: stats.automationsCount || 0,
      icon: Share2,
      trend: stats.queueCount > 0 ? `${stats.queueCount} pendentes` : 'Ativo',
      color: 'text-pink-500'
    },
  ];

  // ── Estado para KPIs de Lucro
  const [profitPeriod, setProfitPeriod] = useState('current_month');
  const [profitCustomStart, setProfitCustomStart] = useState('');
  const [profitCustomEnd, setProfitCustomEnd] = useState('');
  const [profitData, setProfitData] = useState(null);
  const [profitLoading, setProfitLoading] = useState(true);
  const [profitError, setProfitError] = useState(null);

  // ── Busca dados de lucro
  const fetchProfitStats = useCallback(async (period, start, end) => {
    setProfitLoading(true);
    setProfitError(null);
    try {
      const params = { period };
      if (period === 'custom' && start && end) {
        params.start = start;
        params.end = end;
      }
      const res = await axios.get(`${API_BASE_URL}/api/profit-stats`, { params });
      setProfitData(res.data);
    } catch (err) {
      console.error('[Dashboard] Erro ao buscar profit-stats:', err);
      setProfitError(err.message);
    } finally {
      setProfitLoading(false);
    }
  }, []);

  // Carrega ao montar e quando os parâmetros mudarem
  useEffect(() => {
    fetchProfitStats(profitPeriod, profitCustomStart, profitCustomEnd);
  }, [profitPeriod, profitCustomStart, profitCustomEnd, fetchProfitStats]);

  const handleChangePeriod = (period, start, end) => {
    setProfitPeriod(period);
    if (start !== undefined) setProfitCustomStart(start || '');
    if (end !== undefined) setProfitCustomEnd(end || '');
  };

  const handleChangeCustomDates = (start, end) => {
    setProfitCustomStart(start);
    setProfitCustomEnd(end);
  };

  const periodLabel = getPeriodLabel(
    profitPeriod,
    profitData?.startDate,
    profitData?.endDate
  );

  return (
    <div className="space-y-8">
      {/* ── Cabeçalho ── */}
      <div>
        <h2 className="text-3xl font-bold text-white">Painel de Controle</h2>
        <p className="text-slate-400">Visão geral do desempenho da Cloth Sublimação</p>
      </div>

      {/* ── Cards de Estatísticas Gerais ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index} className="flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 bg-slate-800 rounded-xl ${card.color}`}>
                  <Icon size={24} />
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-full">
                  <ArrowUpRight size={14} />
                  {card.trend}
                </div>
              </div>
              <p className="text-slate-400 text-sm font-medium">{card.title}</p>
              <h4 className="text-2xl font-bold text-white mt-1">{card.value}</h4>
            </Card>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════
          KPIs DE LUCRO E CUSTO DE COSTUREIRA
      ══════════════════════════════════════════ */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-5">
        {/* Header da seção */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Análise de Lucro
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {profitLoading ? 'Carregando...' : `Baseado em ${profitData?.ordersCount ?? 0} pedidos pagos em ${periodLabel}`}
            </p>
          </div>

          {/* Seletor de período + botão refresh */}
          <div className="flex flex-col gap-2">
            <PeriodSelector
              period={profitPeriod}
              onChangePeriod={handleChangePeriod}
              customStart={profitCustomStart}
              customEnd={profitCustomEnd}
              onChangeCustom={handleChangeCustomDates}
            />
          </div>

          <button
            onClick={() => fetchProfitStats(profitPeriod, profitCustomStart, profitCustomEnd)}
            disabled={profitLoading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all disabled:opacity-40"
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 ${profitLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Os três cards de KPI lado a lado */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* LUCRO LÍQUIDO */}
          <ProfitKpiCard
            title="Lucro Líquido do Período"
            value={fmtBRL(profitData?.totalProfit)}
            subtitle={periodLabel}
            icon={TrendingUp}
            color="text-emerald-400"
            gradient="bg-gradient-to-br from-emerald-950/60 via-slate-900/80 to-slate-950 border-emerald-800/30"
            loading={profitLoading}
            error={profitError}
          />

          {/* CUSTO PRODUÇÃO (SUBIDOR) */}
          <ProfitKpiCard
            title="Custo de Produção"
            value={fmtBRL(profitData?.productionCost)}
            subtitle="Metro Corrido (Fornecedor)"
            icon={TrendingUp}
            color="text-amber-400"
            gradient="bg-gradient-to-br from-amber-950/60 via-slate-900/80 to-slate-950 border-amber-800/30"
            loading={profitLoading}
            error={profitError}
          />

          {/* CUSTO COSTUREIRA */}
          <ProfitKpiCard
            title="Custo com Costureira"
            value={fmtBRL(profitData?.sewingCost)}
            subtitle={`${profitData?.analyzedItems ?? 0} itens costurados`}
            icon={Scissors}
            color="text-violet-400"
            gradient="bg-gradient-to-br from-violet-950/60 via-slate-900/80 to-slate-950 border-violet-800/30"
            loading={profitLoading}
            error={profitError}
          />
        </div>

        {/* Linha informativa abaixo dos cards */}
        {!profitLoading && !profitError && profitData && (
          <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Lucro Líquido = Receita - Produção - Costura</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Custo de Produção baseado em Metro Corrido (Bobina 1.50m)</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-2 h-2 rounded-full bg-violet-500" />
              <span>Regra de Costura: R$ 3 ({'<'} 1.70m) ou R$ 15 (Emenda)</span>
            </div>
            {profitData.analyzedItems < (profitData.ordersCount * 1) && (
              <div className="flex items-center gap-2 text-xs text-amber-500/80">
                <AlertCircle className="w-3 h-3" />
                <span>
                  Alguns itens sem medida identificável foram ignorados no cálculo
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Actividade recente + Top Produtos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Atividade Recente (Marketing)">
          <div className="space-y-6">
            {(stats.automationLogs || []).length > 0 ? (stats.automationLogs || []).map((log, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    log.status === 'Success' ? 'bg-green-500/10 text-green-500' : 
                    log.status === 'Error' ? 'bg-rose-500/10 text-rose-500' : 'bg-blue-600/20 text-blue-500'
                  }`}>
                    <Share2 size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{log.productName}</p>
                    <p className="text-xs text-slate-400">
                      {log.status === 'Success' ? 'Postado com sucesso' : 
                       log.status === 'Processing' ? 'Agendado na fila' : log.error || 'Falha no processamento'}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(log.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )) : (
              <div className="py-8 text-center text-slate-500 text-sm">Nenhuma atividade recente.</div>
            )}
          </div>
        </Card>

        <Card title="Top Produtos" subtitle="Produtos mais vendidos este mês">
          <div className="space-y-4">
            {['Camiseta Branca', 'Caneca Gamer', 'Almofada Personalizada'].map((name, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-slate-800 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-xs font-bold text-slate-400">
                    IMG
                  </div>
                  <p className="text-sm font-medium text-white">{name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">{25 - (i * 5)} vendas</p>
                  <div className="w-24 h-1.5 bg-slate-800 rounded-full mt-1">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${100 - (i * 30)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;

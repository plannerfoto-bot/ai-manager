import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DollarSign, CheckCircle2, AlertCircle, Calendar, FileText, History, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';

const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3001' 
  : 'https://ai-manager-nuvemshop.onrender.com';

const Commissions = () => {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history'
  const [loading, setLoading] = useState(false);
  const [pendingData, setPendingData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (activeTab === 'pending') {
      fetchPending();
    } else {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/commissions/pending`);
      setPendingData(res.data);
    } catch (error) {
      console.error('Erro ao buscar pendências:', error);
      toast.error('Erro ao carregar comissões pendentes.');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/commissions/history`);
      setHistoryData(res.data || []);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      toast.error('Erro ao carregar histórico.');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    if (!pendingData || pendingData.pendingAmount === 0) return;
    
    if (!window.confirm(`Tem certeza que deseja registrar o pagamento de R$ ${pendingData.pendingAmount.toFixed(2)} e zerar as pendências?`)) {
      return;
    }

    setPaying(true);
    try {
      await axios.post(`${API_BASE_URL}/api/commissions/pay`, {
        amount: pendingData.pendingAmount,
        itemsCount: pendingData.itemsCount,
        ordersCount: pendingData.ordersCount,
        startDate: pendingData.startDate,
        endDate: pendingData.endDate
      });
      toast.success('Pagamento registrado com sucesso!');
      fetchPending();
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error('Erro ao registrar pagamento.');
      }
    } finally {
      setPaying(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Início';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-emerald-500" />
            Comissões: Aline Martins
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            Controle de pagamento de comissões exclusivas da coleção Aline Martins (R$ 50,00 por produto).
          </p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-[var(--border-soft)] mb-6">
        <button
          onClick={() => setActiveTab('pending')}
          className={`pb-3 px-2 font-medium flex items-center gap-2 transition-all ${
            activeTab === 'pending'
              ? 'border-b-2 border-emerald-500 text-emerald-500'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Clock className="w-4 h-4" /> Valores Pendentes
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-2 font-medium flex items-center gap-2 transition-all ${
            activeTab === 'history'
              ? 'border-b-2 border-primary text-primary'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <History className="w-4 h-4" /> Histórico de Pagamentos
        </button>
      </div>

      {activeTab === 'pending' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
          {loading ? (
            <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500"></div></div>
          ) : pendingData ? (
            <>
              {/* Resumo de Pendências */}
              <div className="glass p-8 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 to-slate-900 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute -right-10 -top-10 text-emerald-500/5 rotate-12">
                  <DollarSign className="w-64 h-64" />
                </div>
                
                <div className="z-10">
                  <p className="text-emerald-500/80 font-bold uppercase tracking-widest text-sm mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> Saldo Pendente
                  </p>
                  <p className="text-5xl font-black text-emerald-400 drop-shadow-lg">
                    R$ {pendingData.pendingAmount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </p>
                  <p className="text-slate-400 mt-3 text-sm">
                    Acumulado desde: <strong className="text-slate-300">{formatDate(pendingData.startDate)}</strong>
                  </p>
                  <div className="flex gap-4 mt-4">
                    <div className="bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50">
                      <p className="text-xs text-slate-400 uppercase font-semibold">Produtos</p>
                      <p className="text-lg font-bold text-slate-200">{pendingData.itemsCount}</p>
                    </div>
                    <div className="bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50">
                      <p className="text-xs text-slate-400 uppercase font-semibold">Pedidos</p>
                      <p className="text-lg font-bold text-slate-200">{pendingData.ordersCount}</p>
                    </div>
                  </div>
                </div>

                <div className="z-10">
                  <button 
                    onClick={handlePay}
                    disabled={paying || pendingData.pendingAmount === 0}
                    className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-black text-lg rounded-xl shadow-xl shadow-emerald-900/50 flex items-center gap-3 transition-all"
                  >
                    {paying ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-white"></div>
                    ) : (
                      <><CheckCircle2 className="w-6 h-6" /> Marcar Pendência como Paga</>
                    )}
                  </button>
                  <p className="text-xs text-slate-500 text-center mt-3 max-w-[280px]">
                    Isso zerará o saldo pendente e salvará o pagamento no histórico de acertos.
                  </p>
                </div>
              </div>

              {/* Pedidos que compõem a pendência */}
              <div className="glass rounded-xl border border-[var(--border-soft)] overflow-hidden">
                <div className="p-4 border-b border-[var(--border-soft)] flex items-center justify-between bg-[var(--surface-glass)]/50">
                  <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Pedidos Computados ({pendingData.orders.length})
                  </h3>
                </div>
                
                <div className="overflow-x-auto">
                  {pendingData.orders.length === 0 ? (
                    <div className="p-12 text-center text-[var(--text-muted)]">
                      Nenhum pedido pago com produtos Aline Martins desde o último acerto.
                    </div>
                  ) : (
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[var(--surface-glass)] text-[var(--text-muted)] uppercase text-xs font-semibold">
                        <tr>
                          <th className="px-6 py-4">Pedido</th>
                          <th className="px-6 py-4">Data Pagamento</th>
                          <th className="px-6 py-4">Cliente</th>
                          <th className="px-6 py-4 text-center">Itens (Aline M.)</th>
                          <th className="px-6 py-4 text-right">Comissão Adicionada</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {pendingData.orders.map((o) => (
                          <tr key={o.orderId} className="hover:bg-[var(--surface-glass)]/30 transition-all">
                            <td className="px-6 py-4 font-medium text-[var(--text-primary)]">#{o.orderNumber}</td>
                            <td className="px-6 py-4 text-[var(--text-muted)]">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                {formatDate(o.createdAt)}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-[var(--text-muted)]">{o.customerName}</td>
                            <td className="px-6 py-4 text-center text-[var(--accent)] font-bold">{o.collectionItemsSold} un.</td>
                            <td className="px-6 py-4 text-right text-emerald-500 font-bold">
                              + R$ {o.commissionValue.toLocaleString('pt-BR', {minimumFractionDigits:2})}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="glass rounded-xl border border-[var(--border-soft)] overflow-hidden">
            <div className="p-4 border-b border-[var(--border-soft)] flex items-center justify-between bg-[var(--surface-glass)]/50">
              <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Acertos Realizados
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div></div>
              ) : historyData.length === 0 ? (
                <div className="p-12 text-center text-[var(--text-muted)]">
                  Nenhum acerto de pagamento foi registrado no histórico.
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--surface-glass)] text-[var(--text-muted)] uppercase text-xs font-semibold">
                    <tr>
                      <th className="px-6 py-4">Data do Acerto</th>
                      <th className="px-6 py-4">Período Contemplado</th>
                      <th className="px-6 py-4 text-center">Pedidos</th>
                      <th className="px-6 py-4 text-center">Itens Vendidos</th>
                      <th className="px-6 py-4 text-right">Valor Pago</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {historyData.map((h) => (
                      <tr key={h.id} className="hover:bg-[var(--surface-glass)]/30 transition-all">
                        <td className="px-6 py-4 font-bold text-[var(--text-primary)]">
                          <div className="flex items-center gap-2 text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                            {formatDate(h.created_at)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[var(--text-muted)] text-xs">
                          De: {formatDate(h.start_date)}<br/>
                          Até: {formatDate(h.end_date)}
                        </td>
                        <td className="px-6 py-4 text-center text-[var(--text-muted)]">{h.orders_count}</td>
                        <td className="px-6 py-4 text-center text-[var(--text-muted)]">{h.items_count}</td>
                        <td className="px-6 py-4 text-right text-[var(--text-primary)] font-black text-lg">
                          R$ {parseFloat(h.amount).toLocaleString('pt-BR', {minimumFractionDigits:2})}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Commissions;

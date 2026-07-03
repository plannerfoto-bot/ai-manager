import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DollarSign, CheckCircle2, AlertCircle, Calendar, FileText, History, Clock, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3001' 
  : 'https://ai-manager-nuvemshop.onrender.com';

const Commissions = () => {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history' | 'all'
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [paying, setPaying] = useState(false);

  // States para dedução manual
  const [deductionAmount, setDeductionAmount] = useState('');
  const [deductionDescription, setDeductionDescription] = useState('');
  const [submittingDeduction, setSubmittingDeduction] = useState(false);

  useEffect(() => {
    if (activeTab === 'pending' || activeTab === 'all') {
      fetchReport();
    } else {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchReport = async (force = false) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/commissions/report${force ? '?force_refresh=true' : ''}`);
      setReportData(res.data);
      if (force) toast.success('Relatório atualizado da Nuvemshop!');
    } catch (error) {
      console.error('Erro ao buscar relatório:', error);
      toast.error('Erro ao carregar comissões.');
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

  const handleAddDeduction = async (e) => {
    e.preventDefault();
    if (!deductionAmount || isNaN(deductionAmount) || parseFloat(deductionAmount) <= 0) {
      toast.error('Por favor, insira um valor válido maior que zero.');
      return;
    }
    if (!deductionDescription.trim()) {
      toast.error('Por favor, informe uma descrição do abatimento.');
      return;
    }

    setSubmittingDeduction(true);
    try {
      await axios.post(`${API_BASE_URL}/api/commissions/deductions`, {
        amount: parseFloat(deductionAmount),
        description: deductionDescription.trim()
      });
      toast.success('Abatimento adicionado com sucesso!');
      setDeductionAmount('');
      setDeductionDescription('');
      fetchReport(true); // Forçar atualização do relatório
    } catch (error) {
      console.error('Erro ao adicionar abatimento:', error);
      toast.error(error.response?.data?.error || 'Erro ao adicionar abatimento.');
    } finally {
      setSubmittingDeduction(false);
    }
  };

  const handleDeleteDeduction = async (id) => {
    if (!window.confirm('Tem certeza que deseja remover este abatimento?')) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/commissions/deductions/${id}`);
      toast.success('Abatimento removido com sucesso!');
      fetchReport(true); // Atualizar relatório
    } catch (error) {
      console.error('Erro ao remover abatimento:', error);
      toast.error('Erro ao remover abatimento.');
    }
  };

  const handlePay = async () => {
    if (!reportData || reportData.pendingAmount === 0) return;
    
    const baseComm = reportData.basePendingAmount || reportData.pendingAmount;
    const totalDeds = reportData.totalDeductions || 0;
    
    let confirmMsg = `Tem certeza que deseja registrar o pagamento de R$ ${reportData.pendingAmount.toFixed(2)} e zerar as pendências?`;
    if (totalDeds > 0) {
      confirmMsg = `Tem certeza que deseja registrar o pagamento LÍQUIDO de R$ ${reportData.pendingAmount.toFixed(2)} (Comissão Bruta: R$ ${baseComm.toFixed(2)} - Abatimentos: R$ ${totalDeds.toFixed(2)}) e zerar as pendências?`;
    }
    
    if (!window.confirm(confirmMsg)) {
      return;
    }

    setPaying(true);
    try {
      await axios.post(`${API_BASE_URL}/api/commissions/pay`, {
        amount: reportData.pendingAmount,
        itemsCount: reportData.itemsCount,
        ordersCount: reportData.ordersCount,
        startDate: reportData.startDate,
        endDate: reportData.endDate
      });
      toast.success('Pagamento registrado com sucesso!');
      fetchReport(true);
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

  const downloadPDF = () => {
    if (!reportData) return;
    
    try {
      const doc = new jsPDF();
      
      // Título do Relatório
      doc.setFontSize(18);
      doc.setTextColor(16, 185, 129); // Cor verde esmeralda
      doc.text('Relatorio de Vendas - Colecao Aline Martins', 14, 20);
      
      // Data de Geração
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // Cinza
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 27);
      
      // Detalhamento de Auditoria de Contas
      const lastSettlement = reportData.startDate ? new Date(reportData.startDate).toLocaleString('pt-BR') : 'Inicio do sistema';
      
      // Encontrar o pedido pendente mais antigo (início cronológico deste ciclo)
      const pendingOrdersSorted = [...reportData.pendingOrders].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const firstPendingOrder = pendingOrdersSorted[0];
      const startSaleInfo = firstPendingOrder 
        ? `#${firstPendingOrder.orderNumber} (${firstPendingOrder.customerName || 'N/A'}) em ${new Date(firstPendingOrder.createdAt).toLocaleDateString('pt-BR')}`
        : 'Nenhum pedido pendente';

      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42); // Escuro
      doc.text(`Ultimo acerto de contas realizado em: ${lastSettlement}`, 14, 34);
      doc.text(`Inicio da nova contagem a partir da venda: ${startSaleInfo}`, 14, 40);
      
      // Resumo de Métricas (Apenas Pendentes)
      const totalOrders = reportData.pendingOrders.length;
      const totalItems = reportData.itemsCount;
      const totalCommission = reportData.pendingAmount;
      
      doc.setFillColor(241, 245, 249);
      doc.rect(14, 46, 182, 16, 'F');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(`Pedidos Pendentes: ${totalOrders}`, 18, 56);
      doc.text(`Total de Produtos: ${totalItems} un.`, 75, 56);
      doc.text(`Total a Pagar (Comissoes): R$ ${totalCommission.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 125, 56);

      const tableRows = [];
      pendingOrdersSorted
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // Apresenta decrescente na tabela
        .forEach(o => {
          const items = o.items || [];
          if (items.length === 0) {
            tableRows.push([
              `#${o.orderNumber}`,
              new Date(o.createdAt).toLocaleDateString('pt-BR'),
              o.customerName,
              'Produtos da colecao (Aline)',
              'N/A',
              `${o.collectionItemsSold}`,
              `R$ ${o.collectionRevenue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
              `R$ ${o.commissionValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`
            ]);
          } else {
            items.forEach((item, itemIdx) => {
              // Remove acentos e caracteres especiais para evitar problemas de fontes nativas do PDF
              const cleanName = (item.name || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^\x00-\x7F]/g, '');
              const cleanCustName = (o.customerName || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^\x00-\x7F]/g, '');

              tableRows.push([
                itemIdx === 0 ? `#${o.orderNumber}` : '',
                itemIdx === 0 ? new Date(o.createdAt).toLocaleDateString('pt-BR') : '',
                itemIdx === 0 ? cleanCustName : '',
                cleanName,
                item.size || 'N/A',
                `${item.quantity}`,
                `R$ ${item.price.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
                `R$ ${(item.quantity * 50).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`
              ]);
            });
          }
        });

      autoTable(doc, {
        startY: 68,
        head: [['Pedido', 'Data', 'Cliente', 'Produto da Colecao', 'Medida', 'Qtd', 'Preco Unit.', 'Comissao']],
        body: tableRows,
        theme: 'grid',
        headStyles: {
          fillColor: [30, 41, 59], // Slate 800
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 8,
          cellPadding: 3
        },
        columnStyles: {
          0: { cellWidth: 15 }, // Pedido
          1: { cellWidth: 20 }, // Data
          2: { cellWidth: 30 }, // Cliente
          3: { cellWidth: 50 }, // Produto
          4: { cellWidth: 20 }, // Medida
          5: { cellWidth: 10, halign: 'center' }, // Qtd
          6: { cellWidth: 22, halign: 'right' }, // Preço Unit.
          7: { cellWidth: 22, halign: 'right' }  // Comissão
        }
      });

      doc.save(`Relatorio_Vendas_Aline_Martins_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success('PDF baixado com sucesso!');
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      toast.error('Erro ao gerar PDF.');
    }
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
        <div className="flex gap-3">
          <button
            onClick={downloadPDF}
            disabled={loading || !reportData}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-all duration-200 shadow disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            Baixar Relatório PDF
          </button>
          <button
            onClick={() => fetchReport(true)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--surface-glass)] hover:bg-[var(--border-soft)] border border-[var(--border-soft)] text-[var(--text-primary)] font-bold text-sm rounded-xl transition-all duration-200 shadow disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Sincronizando...' : 'Sincronizar Nuvemshop'}
          </button>
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
          onClick={() => setActiveTab('all')}
          className={`pb-3 px-2 font-medium flex items-center gap-2 transition-all ${
            activeTab === 'all'
              ? 'border-b-2 border-blue-500 text-blue-500'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <FileText className="w-4 h-4" /> Relatório Completo (Todas as Vendas)
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
          ) : reportData ? (
            <>
              {/* Grid de Resumo e Baixa Manual */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Resumo de Pendências (Esquerda) */}
                <div className="glass p-8 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 to-slate-900 flex flex-col justify-between gap-6 relative overflow-hidden">
                  <div className="absolute -right-10 -top-10 text-emerald-500/5 rotate-12 pointer-events-none">
                    <DollarSign className="w-64 h-64" />
                  </div>
                  
                  <div className="z-10 space-y-4 w-full">
                    <p className="text-emerald-500/80 font-bold uppercase tracking-widest text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> Saldo de Comissão
                    </p>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm text-slate-400">
                        <span>Comissão Bruta:</span>
                        <span className="font-semibold text-slate-200">
                          R$ {(reportData.basePendingAmount || reportData.pendingAmount).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm text-rose-400">
                        <span>Descontos / Abatimentos:</span>
                        <span className="font-semibold">
                          - R$ {(reportData.totalDeductions || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </span>
                      </div>
                      <hr className="border-slate-800" />
                      <div className="flex justify-between items-center">
                        <span className="text-base font-bold text-emerald-400">Saldo Líquido a Pagar:</span>
                        <span className="text-3xl font-black text-emerald-400 drop-shadow-lg">
                          R$ {reportData.pendingAmount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </span>
                      </div>
                    </div>

                    <p className="text-slate-400 text-xs">
                      Acumulado desde: <strong className="text-slate-300">{formatDate(reportData.startDate)}</strong>
                    </p>
                    
                    <div className="flex gap-4">
                      <div className="bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50 flex-1">
                        <p className="text-xs text-slate-400 uppercase font-semibold">Produtos</p>
                        <p className="text-lg font-bold text-slate-200">{reportData.itemsCount}</p>
                      </div>
                      <div className="bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50 flex-1">
                        <p className="text-xs text-slate-400 uppercase font-semibold">Pedidos</p>
                        <p className="text-lg font-bold text-slate-200">{reportData.ordersCount}</p>
                      </div>
                    </div>
                  </div>

                  <div className="z-10 pt-4 w-full">
                    <button 
                      onClick={handlePay}
                      disabled={paying || reportData.pendingAmount === 0}
                      className="w-full px-8 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-black text-lg rounded-xl shadow-xl shadow-emerald-900/50 flex items-center justify-center gap-3 transition-all cursor-pointer"
                    >
                      {paying ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-white"></div>
                      ) : (
                        <><CheckCircle2 className="w-6 h-6" /> Marcar como Pago (R$ {reportData.pendingAmount.toLocaleString('pt-BR', {minimumFractionDigits: 2})})</>
                      )}
                    </button>
                    <p className="text-xs text-slate-500 text-center mt-3">
                      Isso zerará o saldo pendente e salvará o acerto no histórico.
                    </p>
                  </div>
                </div>

                {/* Baixa Manual / Abatimento de Custos (Direita) */}
                <div className="glass p-8 rounded-2xl border border-[var(--border-soft)] bg-slate-900/50 flex flex-col justify-between gap-6">
                  <div className="w-full">
                    <h3 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2 mb-2">
                      <Trash2 className="w-5 h-5 text-rose-500" />
                      Baixa Manual / Abatimento de Custos
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mb-6">
                      Registre custos (ex: fretes extras, devoluções, trocas) que devem abater do saldo a pagar desta comissão.
                    </p>

                    {/* Form de Adicionar */}
                    <form onSubmit={handleAddDeduction} className="space-y-4 mb-6">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Sobre o que é o custo? (Descrição)</label>
                          <input
                            type="text"
                            placeholder="Ex: Custo frete pedido #1245 ou Troca de fundo"
                            value={deductionDescription}
                            onChange={(e) => setDeductionDescription(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-rose-500 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Valor (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0,00"
                            value={deductionAmount}
                            onChange={(e) => setDeductionAmount(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-rose-500 transition-colors"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={submittingDeduction}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-700 text-white font-bold text-xs rounded-lg flex items-center gap-2 transition-all cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          Adicionar Abatimento
                        </button>
                      </div>
                    </form>

                    <hr className="border-slate-800 mb-4" />

                    {/* Lista de Abatimentos do Ciclo */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Abatimentos Registrados neste Ciclo ({reportData.pendingDeductions?.length || 0})</h4>
                      <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                        {!reportData.pendingDeductions || reportData.pendingDeductions.length === 0 ? (
                          <p className="text-xs text-slate-500 italic py-4 text-center">Nenhum abatimento cadastrado para este período.</p>
                        ) : (
                          reportData.pendingDeductions.map((ded) => (
                            <div key={ded.id} className="flex justify-between items-center p-3 bg-slate-800/40 border border-slate-800 rounded-xl hover:border-slate-700/60 transition-all">
                              <div>
                                <p className="text-sm font-semibold text-slate-200">{ded.description}</p>
                                <p className="text-[10px] text-slate-500">{new Date(ded.created_at).toLocaleDateString('pt-BR')} às {new Date(ded.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-rose-400">- R$ {parseFloat(ded.amount).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                                <button
                                  onClick={() => handleDeleteDeduction(ded.id)}
                                  className="p-1.5 hover:bg-slate-750 text-slate-400 hover:text-rose-400 rounded-lg transition-all cursor-pointer"
                                  title="Remover abatimento"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pedidos que compõem a pendência */}
              <div className="glass rounded-xl border border-[var(--border-soft)] overflow-hidden">
                <div className="p-4 border-b border-[var(--border-soft)] flex items-center justify-between bg-[var(--surface-glass)]/50">
                  <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Pedidos Computados como Pendentes ({reportData.pendingOrders.length})
                  </h3>
                </div>
                
                <div className="overflow-x-auto">
                  {reportData.pendingOrders.length === 0 ? (
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
                        {reportData.pendingOrders.map((o) => (
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
          ) : (
            <div className="p-12 text-center text-[var(--text-muted)] glass rounded-xl border border-[var(--border-soft)]">
              Não foi possível carregar as informações de comissão ou os dados estão vazios. Tente clicar em "Sincronizar Nuvemshop" acima.
            </div>
          )}
        </div>
      )}

      {activeTab === 'all' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
          {loading ? (
            <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div></div>
          ) : reportData ? (
            <div className="glass rounded-xl border border-[var(--border-soft)] overflow-hidden">
              <div className="p-4 border-b border-[var(--border-soft)] flex items-center justify-between bg-[var(--surface-glass)]/50">
                <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  Todas as Vendas da Coleção Aline Martins ({reportData.pendingOrders.length + reportData.paidOrders.length})
                </h3>
              </div>
              
              <div className="overflow-x-auto">
                {(reportData.pendingOrders.length + reportData.paidOrders.length) === 0 ? (
                  <div className="p-12 text-center text-[var(--text-muted)]">
                    Nenhuma venda encontrada para esta coleção.
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[var(--surface-glass)] text-[var(--text-muted)] uppercase text-xs font-semibold">
                      <tr>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Pedido</th>
                        <th className="px-6 py-4">Data Pagamento</th>
                        <th className="px-6 py-4">Cliente</th>
                        <th className="px-6 py-4 text-center">Itens</th>
                        <th className="px-6 py-4 text-right">Comissão</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {[...reportData.pendingOrders, ...reportData.paidOrders]
                        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                        .map((o) => {
                          const isPaid = reportData.paidOrders.find(po => po.orderId === o.orderId);
                          return (
                            <tr key={o.orderId} className="hover:bg-[var(--surface-glass)]/30 transition-all">
                              <td className="px-6 py-4">
                                {isPaid ? (
                                  <span className="px-2 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">Pago</span>
                                ) : (
                                  <span className="px-2 py-1 rounded-full text-xs font-bold bg-emerald-900/50 text-emerald-400 border border-emerald-800/50">Pendente</span>
                                )}
                              </td>
                              <td className="px-6 py-4 font-medium text-[var(--text-primary)]">#{o.orderNumber}</td>
                              <td className="px-6 py-4 text-[var(--text-muted)]">
                                {formatDate(o.createdAt)}
                              </td>
                              <td className="px-6 py-4 text-[var(--text-muted)]">{o.customerName}</td>
                              <td className="px-6 py-4 text-center text-[var(--text-primary)]">{o.collectionItemsSold} un.</td>
                              <td className={`px-6 py-4 text-right font-bold ${isPaid ? 'text-slate-400' : 'text-emerald-500'}`}>
                                R$ {o.commissionValue.toLocaleString('pt-BR', {minimumFractionDigits:2})}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-[var(--text-muted)] glass rounded-xl border border-[var(--border-soft)]">
              Não foi possível carregar o relatório completo de vendas. Tente clicar em "Sincronizar Nuvemshop" acima.
            </div>
          )}
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
                          <div>R$ {parseFloat(h.amount).toLocaleString('pt-BR', {minimumFractionDigits:2})}</div>
                          {h.commission_deductions && h.commission_deductions.length > 0 && (
                            <div className="text-[10px] text-rose-400 font-normal mt-1 space-y-0.5">
                              {h.commission_deductions.map(d => (
                                <div key={d.id} title={d.description}>
                                  -{d.description.slice(0, 15)}{d.description.length > 15 ? '...' : ''}: R$ {parseFloat(d.amount).toFixed(2)}
                                </div>
                              ))}
                            </div>
                          )}
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

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { DollarSign, Download, Filter, TrendingUp, Search, Calendar, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';

const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3001' 
  : 'https://ai-manager-nuvemshop.onrender.com';

const Commissions = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/categories`);
      const allCats = res.data || [];
      const parents = allCats.filter(c => !c.parent || c.parent === 0);
      const sorted = [];
      parents.forEach(p => {
        sorted.push(p);
        const children = allCats.filter(c => c.parent === p.id);
        children.forEach(c => {
          c._isChild = true;
          sorted.push(c);
        });
      });
      
      const groupedIds = new Set(sorted.map(c => c.id));
      const orphans = allCats.filter(c => !groupedIds.has(c.id));
      
      setCategories([...sorted, ...orphans]);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      toast.error('Erro ao carregar coleções.');
    }
  };

  const getDatesForPeriod = (period) => {
    const today = new Date();
    let min = new Date();
    let max = new Date(today);
    
    switch (period) {
      case 'semana':
        min.setDate(today.getDate() - 7);
        break;
      case 'quinzena':
        min.setDate(today.getDate() - 15);
        break;
      case 'mes':
        min.setMonth(today.getMonth() - 1);
        break;
      case 'trimestre':
        min.setMonth(today.getMonth() - 3);
        break;
      case 'semestre':
        min.setMonth(today.getMonth() - 6);
        break;
      case 'ano':
        min.setFullYear(today.getFullYear() - 1);
        break;
      default:
        min = null;
        max = null;
    }
    
    return {
      dateMin: min ? min.toISOString() : '',
      dateMax: max ? max.toISOString() : ''
    };
  };

  const handleGenerateReport = async () => {
    if (!selectedCategory) {
      toast.error('Selecione uma coleção primeiro.');
      return;
    }
    
    setLoading(true);
    const { dateMin, dateMax } = getDatesForPeriod(selectedPeriod);
    
    try {
      const res = await axios.get(`${API_BASE_URL}/api/commissions-report`, {
        params: {
          categoryId: selectedCategory,
          dateMin,
          dateMax
        }
      });
      setReport(res.data);
      toast.success('Relatório gerado com sucesso!');
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Falha ao gerar o relatório.');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    if (!report || !report.orders || report.orders.length === 0) return;
    
    const doc = new jsPDF();
    const collectionName = categories.find(c => c.id === parseInt(selectedCategory))?.name?.pt || categories.find(c => c.id === parseInt(selectedCategory))?.name || 'Coleção';
    
    // Título
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('Relatório de Comissões e Vendas', 14, 22);
    
    // Informações Gerais
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105); // slate-500
    doc.text(`Coleção Analisada: ${collectionName}`, 14, 32);
    doc.text(`Período de Vendas: ${selectedPeriod === '' ? 'Todo o período' : selectedPeriod}`, 14, 38);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 44);

    // Resumo Financeiro
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('Resumo Financeiro', 14, 56);
    
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(`Faturamento Bruto (Coleção): R$ ${report.summary.grossRevenue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 14, 64);
    doc.text(`Faturamento Líquido: R$ ${report.summary.netRevenue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 14, 70);
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text(`Valor Total de Comissões: R$ ${report.summary.totalCommission.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 14, 76);

    // Tabela de Pedidos
    const tableColumn = ["Pedido", "Data", "Cliente", "Itens", "Fat. Bruto", "Comissão"];
    const tableRows = [];

    report.orders.forEach(o => {
      const rowData = [
        `#${o.orderNumber}`,
        new Date(o.createdAt).toLocaleDateString('pt-BR'),
        o.customerName,
        `${o.collectionItemsSold} un.`,
        `R$ ${o.collectionRevenue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
        `R$ ${o.commissionValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`
      ];
      tableRows.push(rowData);
    });

    doc.autoTable({
      startY: 84,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 4 },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    doc.save(`Relatorio_Comissoes_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#EDEDEF] tracking-tight flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-emerald-400" />
            Comissões & Financeiro
          </h1>
          <p className="text-[#8A8F98] mt-1">Gerenciamento de comissões fixas para parceiros por coleção</p>
        </div>
        {report && (
          <button onClick={downloadPDF} className="px-5 py-2.5 btn-primary text-[#EDEDEF] font-semibold rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20">
            <Download className="w-5 h-5" /> Exportar Relatório em PDF
          </button>
        )}
      </div>

      <div className="glass p-6 rounded-xl border border-white/10">
        <h2 className="text-lg font-bold text-[#EDEDEF] mb-4 flex items-center gap-2">
          <Filter className="w-5 h-5 text-primary" /> Filtros do Relatório
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-[#8A8F98] mb-2">Coleção (Categoria)</label>
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-[#EDEDEF] focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="">Selecione a Coleção...</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat._isChild || (cat.parent && cat.parent !== 0) ? '  — ' : ''}{cat.name.pt || cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#8A8F98] mb-2">Período de Vendas</label>
            <select 
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-[#EDEDEF] focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="">Todo o Período</option>
              <option value="semana">Última Semana</option>
              <option value="quinzena">Última Quinzena</option>
              <option value="mes">Último Mês</option>
              <option value="trimestre">Último Trimestre</option>
              <option value="semestre">Último Semestre</option>
              <option value="ano">Último Ano</option>
            </select>
          </div>
          <div className="flex items-end">
            <button 
              onClick={handleGenerateReport}
              disabled={loading}
              className="w-full py-3 bg-primary text-[#EDEDEF] font-bold rounded-lg hover:btn-primary transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
              ) : (
                <><Search className="w-5 h-5" /> Gerar Relatório</>
              )}
            </button>
          </div>
        </div>
      </div>

      {report && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
          {/* Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass p-6 rounded-xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800/50">
              <p className="text-[#8A8F98] text-sm font-bold uppercase mb-1">Faturamento Bruto (Coleção)</p>
              <p className="text-3xl font-black text-[#EDEDEF]">R$ {report.summary.grossRevenue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
            </div>
            <div className="glass p-6 rounded-xl border border-emerald-900/30 bg-gradient-to-br from-emerald-950/20 to-slate-900">
              <p className="text-emerald-400/80 text-sm font-bold uppercase mb-1">Valor da Comissão Parceiro</p>
              <p className="text-3xl font-black text-emerald-400">R$ {report.summary.totalCommission.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
              <p className="text-xs text-emerald-500/50 mt-1">R$ 50 por unidade vendida</p>
            </div>
            <div className="glass p-6 rounded-xl border border-blue-900/30 bg-gradient-to-br from-blue-950/20 to-slate-900">
              <p className="text-indigo-400/80 text-sm font-bold uppercase mb-1">Faturamento Líquido</p>
              <p className="text-3xl font-black text-indigo-400">R$ {report.summary.netRevenue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
            </div>
          </div>

          {/* Tabela de Pedidos */}
          <div className="glass rounded-xl border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5/50">
              <h3 className="font-bold text-[#EDEDEF] flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Vendas Relacionadas ({report.orders.length})
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              {report.orders.length === 0 ? (
                <div className="p-12 text-center text-[#8A8F98]">
                  Nenhuma venda contendo produtos desta coleção foi encontrada no período.
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-[#8A8F98] uppercase text-xs font-semibold">
                    <tr>
                      <th className="px-6 py-4">Pedido</th>
                      <th className="px-6 py-4">Data</th>
                      <th className="px-6 py-4">Cliente</th>
                      <th className="px-6 py-4 text-center">Itens (Coleção)</th>
                      <th className="px-6 py-4 text-right">Faturamento Bruto</th>
                      <th className="px-6 py-4 text-right">Comissão Devida</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {report.orders.map((o) => (
                      <tr key={o.orderId} className="hover:bg-white/5/30 transition-all">
                        <td className="px-6 py-4 font-medium text-[#EDEDEF]">#{o.orderNumber}</td>
                        <td className="px-6 py-4 text-[#8A8F98]">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {new Date(o.createdAt).toLocaleDateString('pt-BR')}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-300">{o.customerName}</td>
                        <td className="px-6 py-4 text-center text-indigo-400 font-bold">{o.collectionItemsSold} un.</td>
                        <td className="px-6 py-4 text-right text-slate-300">
                          R$ {o.collectionRevenue.toLocaleString('pt-BR', {minimumFractionDigits:2})}
                        </td>
                        <td className="px-6 py-4 text-right text-emerald-400 font-bold">
                          R$ {o.commissionValue.toLocaleString('pt-BR', {minimumFractionDigits:2})}
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

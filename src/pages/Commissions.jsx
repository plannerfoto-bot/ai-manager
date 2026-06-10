import React, { useState, useEffect } from 'react';
import axios from 'axios';
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

  const downloadCSV = () => {
    if (!report || !report.orders || report.orders.length === 0) return;
    
    const headers = ['Pedido', 'Cliente', 'Data', 'Status', 'Qtd Produtos Colecao', 'Receita Colecao (R$)', 'Comissao Parceiro (R$)'];
    const csvRows = [headers.join(',')];
    
    report.orders.forEach(o => {
      const row = [
        `#${o.orderNumber}`,
        `"${o.customerName}"`,
        new Date(o.createdAt).toLocaleDateString('pt-BR'),
        o.status,
        o.collectionItemsSold,
        o.collectionRevenue.toFixed(2),
        o.commissionValue.toFixed(2)
      ];
      csvRows.push(row.join(','));
    });
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `relatorio_comissao_${new Date().getTime()}.csv`);
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-emerald-400" />
            Comissões & Financeiro
          </h1>
          <p className="text-slate-400 mt-1">Gerenciamento de comissões fixas para parceiros por coleção</p>
        </div>
        {report && (
          <button onClick={downloadCSV} className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2">
            <Download className="w-5 h-5" /> Exportar CSV
          </button>
        )}
      </div>

      <div className="glass p-6 rounded-xl border border-slate-800">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Filter className="w-5 h-5 text-primary" /> Filtros do Relatório
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Coleção (Categoria)</label>
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
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
            <label className="block text-sm font-medium text-slate-400 mb-2">Período de Vendas</label>
            <select 
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
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
              className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
            <div className="glass p-6 rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-800/50">
              <p className="text-slate-400 text-sm font-bold uppercase mb-1">Faturamento Bruto (Coleção)</p>
              <p className="text-3xl font-black text-white">R$ {report.summary.grossRevenue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
            </div>
            <div className="glass p-6 rounded-xl border border-emerald-900/30 bg-gradient-to-br from-emerald-950/20 to-slate-900">
              <p className="text-emerald-400/80 text-sm font-bold uppercase mb-1">Valor da Comissão Parceiro</p>
              <p className="text-3xl font-black text-emerald-400">R$ {report.summary.totalCommission.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
              <p className="text-xs text-emerald-500/50 mt-1">R$ 50 por unidade vendida</p>
            </div>
            <div className="glass p-6 rounded-xl border border-blue-900/30 bg-gradient-to-br from-blue-950/20 to-slate-900">
              <p className="text-blue-400/80 text-sm font-bold uppercase mb-1">Faturamento Líquido</p>
              <p className="text-3xl font-black text-blue-400">R$ {report.summary.netRevenue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
            </div>
          </div>

          {/* Tabela de Pedidos */}
          <div className="glass rounded-xl border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <h3 className="font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Vendas Relacionadas ({report.orders.length})
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              {report.orders.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  Nenhuma venda contendo produtos desta coleção foi encontrada no período.
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900 text-slate-400 uppercase text-xs font-semibold">
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
                      <tr key={o.orderId} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 font-medium text-white">#{o.orderNumber}</td>
                        <td className="px-6 py-4 text-slate-400">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {new Date(o.createdAt).toLocaleDateString('pt-BR')}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-300">{o.customerName}</td>
                        <td className="px-6 py-4 text-center text-blue-400 font-bold">{o.collectionItemsSold} un.</td>
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

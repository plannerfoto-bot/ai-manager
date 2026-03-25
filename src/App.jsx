import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
import { Calculator, ToggleLeft, ToggleRight } from 'lucide-react';
import Sidebar from './components/organisms/Sidebar';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import AICreator from './pages/AICreator';
import Orders from './pages/Orders';
import BulkUpload from './pages/BulkUpload';
import ScriptManager from './pages/ScriptManager';

// ─── Componentes Auxiliares Fora da Função Principal ───────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Erro pego pelo ErrorBoundary:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-red-500 font-mono text-sm bg-slate-950 h-screen overflow-auto">
          <h2 className="text-xl font-bold mb-4">CRASH DO REACT</h2>
          <div className="bg-red-950/30 p-4 border border-red-900 rounded-lg">
            <p className="font-bold mb-2">{this.state.error?.toString()}</p>
            <pre className="whitespace-pre-wrap opacity-70">
              {this.state.error?.stack}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const App = () => {
  const [activeTab, setActiveTab] = useState(() => {
    try { return localStorage.getItem('activeTab') || 'dashboard'; } catch { return 'dashboard'; }
  });
  const [productList, setProductList] = useState({ products: [], total: 0, page: 1 });
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [calculatorEnabled, setCalculatorEnabled] = useState(() => {
    try { return localStorage.getItem('calculatorEnabled') === 'true'; } catch { return false; }
  });

  // URL Dinâmica para API
  const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3001' 
    : 'https://ai-manager-nuvemshop.onrender.com';

  const fetchData = async (page = 1, searchQuery = '') => {
    setLoading(true);
    try {
      const statsReq = axios.get(`${API_BASE_URL}/api/stats`);
      const prodReq = axios.get(`${API_BASE_URL}/api/products?page=${page}&q=${searchQuery}`);
      
      const [statsRes, prodRes] = await Promise.all([statsReq, prodReq]);
      
      setProductList(prodRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao sincronizar com a Nuvemshop');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    try { localStorage.setItem('calculatorEnabled', calculatorEnabled); } catch {}
  }, [calculatorEnabled]);

  useEffect(() => {
    try { localStorage.setItem('activeTab', activeTab); } catch {}
  }, [activeTab]);

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este produto?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/products/${id}`);
      toast.success('Produto removido!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao deletar produto');
    }
  };

  const handleGenerateAI = async (concept, visual) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/ai/generate`, { concept, visualAnalysis: visual });
      return res.data;
    } catch (error) {
      toast.error('Erro na geração com IA');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async (product) => {
    try {
      await axios.post(`${API_BASE_URL}/api/products`, {
        ...product,
        stock: 10
      });
      toast.success('Produto publicado na loja!');
      fetchData();
      setActiveTab('inventory');
    } catch (error) {
      toast.error('Erro ao publicar produto');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard stats={stats} />;
      case 'inventory':
        return (
          <Inventory 
            products={productList.products} 
            total={productList.total}
            page={productList.page}
            loading={loading} 
            onDelete={handleDelete} 
            onRefresh={fetchData}
            calculatorEnabled={calculatorEnabled}
          />
        );
      case 'orders':
        return <Orders />;
      case 'ai-creator':
        return <AICreator onGenerate={handleGenerateAI} onSave={handleSaveProduct} status={loading ? 'loading' : 'idle'} />;
      case 'bulk-upload':
        return <BulkUpload />;
      case 'script-manager':
        return <ScriptManager />;
      default:
        return <Dashboard stats={stats} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <Toaster position="top-right" />
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="pl-64 p-8 transition-all duration-300">
        {/* ── Toggle da Calculadora ── */}
        <div className="max-w-7xl mx-auto mb-6">
          <button
            type="button"
            onClick={() => setCalculatorEnabled(v => !v)}
            className={`flex items-center gap-3 px-5 py-3 rounded-2xl border font-bold text-sm transition-all duration-300 shadow-lg ${
              calculatorEnabled
                ? 'bg-blue-600/20 border-blue-500/40 text-blue-300 hover:bg-blue-600/30 shadow-blue-900/20'
                : 'bg-slate-800/50 border-slate-700/40 text-slate-400 hover:bg-slate-800 shadow-slate-900/20'
            }`}
          >
            <Calculator className="w-4 h-4" />
            Calculadora de Medidas
            {calculatorEnabled
              ? <ToggleRight className="w-6 h-6 text-blue-400" />
              : <ToggleLeft className="w-6 h-6 text-slate-600" />}
            <span className={`text-xs px-2 py-0.5 rounded-full font-black tracking-wider uppercase ${
              calculatorEnabled ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-700 text-slate-500'
            }`}>
              {calculatorEnabled ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>

        <div className="max-w-7xl mx-auto animate-in fade-in duration-700">
          <ErrorBoundary>
            {renderContent()}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
};

export default App;

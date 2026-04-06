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
import Marketing from './pages/Marketing';
import AbandonedCart from './components/organisms/AbandonedCart';
import UnitaryRegistration from './pages/UnitaryRegistration';

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
  // Captura o ID da Loja vindo da Nuvemshop (URL de Carregamento)
  const [storeId, setStoreId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('user_id') || localStorage.getItem('last_store_id') || '';
  });

  const [activeTab, setActiveTab] = useState(() => {
    try { return localStorage.getItem('activeTab') || 'dashboard'; } catch { return 'dashboard'; }
  });
  const [productList, setProductList] = useState({ products: [], total: 0, page: 1 });
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [calculatorEnabled, setCalculatorEnabled] = useState(true);
  const [whatsapp, setWhatsapp] = useState('5511999999999');

  // URL Dinâmica para API
  const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3001' 
    : 'https://ai-manager-nuvemshop.onrender.com';

  // Configuração Global de Axios para Multi-Loja
  useEffect(() => {
    if (storeId) {
      axios.defaults.headers.common['x-store-id'] = storeId;
      localStorage.setItem('last_store_id', storeId);
      console.log("[App] Configurado ID de Loja:", storeId);
    }
  }, [storeId]);

  // Se não tiver storeId na URL nem no localStorage, busca do backend
  useEffect(() => {
    if (!storeId) {
      axios.get(`${API_BASE_URL}/api/me`)
        .then(res => {
          if (res.data?.storeId) {
            setStoreId(String(res.data.storeId));
            console.log("[App] StoreId carregado do backend:", res.data.storeId);
          }
        })
        .catch(err => console.warn("[App] /api/me falhou:", err.message));
    }
  }, []); // eslint-disable-line

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

  // Sincroniza configurações do script com o backend
  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/store-script-settings`)
      .then(res => {
        setCalculatorEnabled(res.data.enabled);
        setWhatsapp(res.data.whatsapp);
      })
      .catch(err => console.warn("Erro ao buscar settings:", err));
  }, []); // eslint-disable-line

  const toggleCalculator = async () => {
    const newState = !calculatorEnabled;
    try {
      setCalculatorEnabled(newState);
      await axios.post(`${API_BASE_URL}/api/store-script-settings`, {
        enabled: newState,
        whatsapp: whatsapp
      });
      toast.success(newState ? 'Calculadora ATIVADA no site!' : 'Calculadora DESATIVADA no site!');
    } catch (error) {
      setCalculatorEnabled(!newState); // Reverte em caso de erro
      toast.error('Erro ao salvar configuração');
    }
  };

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
    console.log("[App] Trocando para:", activeTab);
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
        return <ScriptManager storeId={storeId} apiBase={API_BASE_URL} />;
      case 'marketing':
        return <Marketing />;
      case 'abandoned-cart':
        return <AbandonedCart storeId={storeId} />;
      case 'unitary-registration':
        return <UnitaryRegistration />;
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
            onClick={toggleCalculator}
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

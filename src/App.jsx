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
import Commissions from './pages/Commissions';
import Finance from './pages/Finance';
import Settings from './pages/Settings';
import { AnimatePresence, motion } from 'framer-motion';
import BackgroundBlobs from './components/atoms/BackgroundBlobs';

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
        <div className="p-8 text-red-500 font-mono text-sm bg-transparent h-screen overflow-auto">
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

// Envolve o App principal com o AuthProvider
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';

const MainApp = () => {
  const { session, loading: authLoading } = useAuth();
  
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

  // Configuração Global de Axios para Multi-Loja e Autenticação
  useEffect(() => {
    if (storeId) {
      axios.defaults.headers.common['x-store-id'] = storeId;
      localStorage.setItem('last_store_id', storeId);
      console.log("[App] Configurado ID de Loja:", storeId);
    }
    if (session?.access_token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${session.access_token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [storeId, session]);

  // Se não tiver storeId na URL nem no localStorage, busca do backend
  useEffect(() => {
    if (!storeId && session) {
      axios.get(`${API_BASE_URL}/api/me`)
        .then(res => {
          if (res.data?.storeId) {
            setStoreId(String(res.data.storeId));
            console.log("[App] StoreId carregado do backend:", res.data.storeId);
          }
        })
        .catch(err => console.warn("[App] /api/me falhou:", err.message));
    }
  }, [session]); // eslint-disable-line

  const fetchData = async (page = 1, searchQuery = '') => {
    if (!session) return;
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
    if (session) {
      fetchData();
    }
  }, [session]);

  // Sincroniza configurações do script com o backend
  useEffect(() => {
    if (!session) return;
    axios.get(`${API_BASE_URL}/api/store-script-settings`)
      .then(res => {
        setCalculatorEnabled(res.data.enabled);
        setWhatsapp(res.data.whatsapp);
      })
      .catch(err => console.warn("Erro ao buscar settings:", err));
  }, [session]); // eslint-disable-line

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
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard stats={stats} />;
      case 'finance':
        return <Finance />;
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
      case 'commissions':
        return <Commissions />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard stats={stats} />;
    }
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400 bg-[#020617]">Carregando sistema seguro...</div>;
  }

  if (!session) {
    return <Login />;
  }

  return (
    <div className="min-h-screen text-[var(--text-primary)] relative bg-[#020617]">
      <BackgroundBlobs />
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
                ? 'bg-[var(--accent-glow)] border-[var(--accent)] text-[var(--accent)] hover:shadow-[0_0_20px_var(--accent-glow)]'
                : 'glass-panel text-[var(--text-muted)] hover:bg-[var(--border-soft)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Calculator className="w-4 h-4" />
            Calculadora de Medidas
            {calculatorEnabled
              ? <ToggleRight className="w-6 h-6 text-[var(--accent)]" />
              : <ToggleLeft className="w-6 h-6 text-[var(--text-muted)]" />}
            <span className={`text-xs px-2 py-0.5 rounded-full font-black tracking-wider uppercase ${
              calculatorEnabled ? 'bg-[var(--accent-glow)] text-[var(--accent)]' : 'bg-[var(--border-soft)] text-[var(--text-muted)]'
            }`}>
              {calculatorEnabled ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <ErrorBoundary>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

export default App;

import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Sparkles, 
  Settings, 
  LogOut,
  ChevronRight,
  ShoppingBag,
  Layers,
  Code2,
  Share2,
  ShoppingCart,
  PackagePlus,
  DollarSign,
  Sun,
  Moon
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeProvider';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const { isDark, toggleTheme } = useTheme();
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'finance', label: 'Financeiro', icon: DollarSign },
    { id: 'orders', label: 'Vendas', icon: ShoppingBag },
    { id: 'inventory', label: 'Produtos', icon: Package },
    { id: 'unitary-registration', label: 'Cadastro Unitário', icon: PackagePlus },
    { id: 'bulk-upload', label: 'Upload Massivo', icon: Layers },
    { id: 'ai-creator', label: 'IA Creator', icon: Sparkles },
    { id: 'abandoned-cart', label: '🛒 Carrinhos', icon: ShoppingBag },
    { id: 'marketing', label: 'Marketing', icon: Share2 },
    { id: 'commissions', label: 'Comissões', icon: DollarSign },
    { id: 'script-manager', label: 'Script da Loja', icon: Code2 },
    { id: 'pedido-flex', label: 'PedidoFlex Beta', icon: Layers },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <motion.div 
      initial={{ x: 30, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      className="w-64 h-screen bg-[var(--surface-glass)] border-r border-[var(--border-soft)] backdrop-blur-xl flex flex-col fixed left-0 top-0 z-50 shadow-[var(--shadow-glass)]"
    >
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 btn-primary flex items-center justify-center shadow-lg shadow-[var(--accent-glow)]">
            <Sparkles size={24} />
          </div>
          <div>
            <h1 className="text-[var(--text-primary)] font-extrabold text-xl leading-tight tracking-tight">AI Manager</h1>
            <p className="text-[var(--text-primary)] opacity-60 text-xs font-medium">Cloth Sublimação</p>
          </div>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-300 group ${
                  isActive 
                    ? 'bg-[var(--accent-glow)] text-[var(--accent)]' 
                    : 'text-[var(--text-primary)] opacity-70 hover:bg-[var(--border-soft)] hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={22} className={isActive ? 'text-[var(--accent)]' : 'text-[var(--text-primary)] transition-colors'} />
                  <span className={`text-[15px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                </div>
                {isActive && <div className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full shadow-[0_0_8px_var(--accent-glow)]" />}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-[var(--border-soft)] space-y-4">
        {/* Toggle Theme Button */}
        <button 
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-[var(--text-primary)] opacity-70 hover:bg-[var(--border-soft)] hover:opacity-100 rounded-xl transition-all"
        >
          {isDark ? <Sun size={22} /> : <Moon size={22} />}
          <span className="font-medium text-[15px]">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        <button 
          onClick={async () => {
            const { supabase } = await import('../../lib/supabaseClient');
            await supabase.auth.signOut();
          }}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-[var(--text-primary)] opacity-70 hover:bg-red-500/10 hover:text-red-500 hover:opacity-100 rounded-xl transition-all"
        >
          <LogOut size={22} />
          <span className="font-medium text-[15px]">Sair</span>
        </button>
      </div>
    </motion.div>
  );
};

export default Sidebar;

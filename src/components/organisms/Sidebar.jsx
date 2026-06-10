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
  DollarSign
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab }) => {
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
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <div className="w-64 h-screen bg-white/5 border-r border-white/10 backdrop-blur-xl flex flex-col fixed left-0 top-0 z-50 animate-in fade-in slide-in-from-left duration-700">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 btn-primary rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/40">
            <Sparkles className="text-[#EDEDEF]" size={24} />
          </div>
          <div>
            <h1 className="text-[#EDEDEF] font-bold text-lg leading-tight">AI Manager</h1>
            <p className="text-[#8A8F98] text-xs">Cloth Sublimação</p>
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
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'btn-primary/10 text-indigo-400' 
                    : 'text-[#8A8F98] hover:bg-white/5 hover:text-[#EDEDEF]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={20} className={isActive ? 'text-indigo-400' : 'text-[#8A8F98] group-hover:text-[#EDEDEF]'} />
                  <span className="font-medium text-sm">{item.label}</span>
                </div>
                {isActive && <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full shadow-[0_0_8px_rgba(94,106,210,0.8)]" />}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-white/10">
        <button className="w-full flex items-center gap-3 px-4 py-3 text-[#8A8F98] hover:text-red-400 transition-all">
          <LogOut size={20} />
          <span className="font-medium text-sm">Sair</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

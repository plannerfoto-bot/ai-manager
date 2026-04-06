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
  PackagePlus
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Vendas', icon: ShoppingBag },
    { id: 'inventory', label: 'Produtos', icon: Package },
    { id: 'unitary-registration', label: 'Cadastro Unitário', icon: PackagePlus },
    { id: 'bulk-upload', label: 'Upload Massivo', icon: Layers },
    { id: 'ai-creator', label: 'IA Creator', icon: Sparkles },
    { id: 'abandoned-cart', label: '🛒 Carrinhos', icon: ShoppingBag },
    { id: 'marketing', label: 'Marketing', icon: Share2 },
    { id: 'script-manager', label: 'Script da Loja', icon: Code2 },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <div className="w-64 h-screen bg-slate-900 border-r border-slate-800 flex flex-col fixed left-0 top-0 z-50">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/40">
            <Sparkles className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">AI Manager</h1>
            <p className="text-slate-500 text-xs">Cloth Sublimação</p>
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
                    ? 'bg-blue-600/10 text-blue-500' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={20} className={isActive ? 'text-blue-500' : 'text-slate-500 group-hover:text-slate-200'} />
                  <span className="font-medium text-sm">{item.label}</span>
                </div>
                {isActive && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-slate-800/50">
        <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-red-400 transition-colors">
          <LogOut size={20} />
          <span className="font-medium text-sm">Sair</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

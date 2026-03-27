import React from 'react';
import { 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Share2
} from 'lucide-react';
import Card from '../components/atoms/Card';

const Dashboard = ({ stats }) => {
  const cards = [
    { title: 'Vendas Totais', value: `R$ ${stats.totalSales || '0,00'}`, icon: DollarSign, trend: '+12.5%', color: 'text-green-500' },
    { title: 'Pedidos', value: stats.ordersCount || 0, icon: ShoppingBag, trend: '+8.2%', color: 'text-blue-500' },
    { title: 'Produtos', value: stats.productsCount || 0, icon: TrendingUp, trend: '+3.1%', color: 'text-purple-500' },
    { title: 'Automações', value: stats.automationsCount || 0, icon: Share2, trend: stats.queueCount > 0 ? `${stats.queueCount} pendentes` : 'Ativo', color: 'text-pink-500' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white">Painel de Controle</h2>
        <p className="text-slate-400">Visão geral do desempenho da Cloth Sublimação</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index} className="flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 bg-slate-800 rounded-xl ${card.color}`}>
                  <Icon size={24} />
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-full">
                  <ArrowUpRight size={14} />
                  {card.trend}
                </div>
              </div>
              <p className="text-slate-400 text-sm font-medium">{card.title}</p>
              <h4 className="text-2xl font-bold text-white mt-1">{card.value}</h4>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Atividade Recente (Marketing)">
          <div className="space-y-6">
            {(stats.automationLogs || []).length > 0 ? (stats.automationLogs || []).map((log, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    log.status === 'Success' ? 'bg-green-500/10 text-green-500' : 
                    log.status === 'Error' ? 'bg-rose-500/10 text-rose-500' : 'bg-blue-600/20 text-blue-500'
                  }`}>
                    <Share2 size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{log.productName}</p>
                    <p className="text-xs text-slate-400">
                      {log.status === 'Success' ? 'Postado com sucesso' : 
                       log.status === 'Processing' ? 'Agendado na fila' : log.error || 'Falha no processamento'}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-slate-500">{new Date(log.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )) : (
              <div className="py-8 text-center text-slate-500 text-sm">Nenhuma atividade recente.</div>
            )}
          </div>
        </Card>

        <Card title="Top Produtos" subtitle="Produtos mais vendidos este mês">
          <div className="space-y-4">
            {['Camiseta Branca', 'Caneca Gamer', 'Almofada Personalizada'].map((name, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-slate-800 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-xs font-bold text-slate-400">
                    IMG
                  </div>
                  <p className="text-sm font-medium text-white">{name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">{25 - (i * 5)} vendas</p>
                  <div className="w-24 h-1.5 bg-slate-800 rounded-full mt-1">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${100 - (i * 30)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;

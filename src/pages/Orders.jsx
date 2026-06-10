import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShoppingBag, User, Phone, Calendar, CheckCircle, Clock, ExternalLink } from 'lucide-react';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await axios.get('https://ai-manager-nuvemshop.onrender.com/api/orders');
      setOrders(res.data);
    } catch (error) {
      console.error('Erro ao buscar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'text-emerald-400 bg-emerald-400/10';
      case 'open': return 'text-amber-400 bg-amber-400/10';
      case 'cancelled': return 'text-rose-400 bg-rose-400/10';
      default: return 'text-[var(--text-muted)] bg-slate-400/10';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">Vendas & Operacional</h1>
        <button onClick={fetchOrders} className="p-2 glass rounded-lg hover:bg-[var(--surface-glass)] transition-all">
          <Clock className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Pedidos */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div></div>
          ) : (
            orders.map(order => (
              <div 
                key={order.id} 
                onClick={() => setSelectedOrder(order)}
                className={`glass p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.01] ${selectedOrder?.id === order.id ? 'border-primary' : 'border-[var(--border-soft)]'}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className="p-3 rounded-lg bg-primary/10 text-primary">
                      <ShoppingBag className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[var(--text-primary)]">Pedido #{order?.number}</h3>
                      <p className="text-sm text-[var(--text-muted)]">{order?.customer?.name || 'Cliente de Teste'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[var(--text-primary)]">R$ {parseFloat(order?.total || 0).toLocaleString('pt-BR')}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium uppercase ${getStatusColor(order?.status)}`}>
                      {order?.status}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detalhes do Pedido e Follow-up */}
        <div className="lg:col-span-1">
          {selectedOrder ? (
            <div className="glass p-6 rounded-2xl border-primary animate-in slide-in-from-right duration-300">
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" /> Detalhes do Cliente
              </h2>
              
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-[var(--surface-glass)]/50 border border-[var(--border-soft)]">
                  <p className="text-xs text-[var(--text-muted)] uppercase font-bold mb-1">Nome Completo</p>
                  <p className="text-[var(--text-primary)] font-medium">{selectedOrder.customer?.name}</p>
                </div>

                <div className="p-4 rounded-xl bg-[var(--surface-glass)]/50 border border-[var(--border-soft)]">
                  <p className="text-xs text-[var(--text-muted)] uppercase font-bold mb-1">Contato WhatsApp</p>
                  <div className="flex justify-between items-center">
                    <p className="text-[var(--text-primary)] font-medium">{selectedOrder.customer?.phone || '+55 (00) 00000-0000'}</p>
                    <a 
                      href={`https://wa.me/${selectedOrder.customer?.phone?.replace(/\D/g, '')}`} 
                      target="_blank"
                      className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-[var(--text-primary)] transition-all"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs text-[var(--text-muted)] uppercase font-bold px-1">Itens do Pedido</p>
                  {selectedOrder.products?.map(item => (
                    <div key={item.id} className="flex justify-between text-sm py-2 border-b border-[var(--border-soft)]/50">
                      <span className="text-slate-300">{item.quantity}x {item.name}</span>
                      <span className="text-[var(--text-primary)] font-bold">R$ {parseFloat(item.price).toLocaleString('pt-BR')}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-4">
                  <button className="w-full py-3 bg-primary text-[var(--text-primary)] font-bold rounded-xl hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5" /> Iniciar Follow-up AIOX
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass p-12 rounded-2xl flex flex-col items-center justify-center text-center opacity-50">
              <ShoppingBag className="w-12 h-12 mb-4" />
              <p>Selecione uma venda para ver os detalhes e iniciar operações.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Orders;

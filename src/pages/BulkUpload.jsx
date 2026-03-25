import React, { useState } from 'react';
import axios from 'axios';
import { Layers, Zap, CheckCircle, AlertCircle, Loader2, Sparkles, Send } from 'lucide-react';
import { toast } from 'react-hot-toast';

const BulkUpload = ({ onSaveAll }) => {
  const [input, setInput] = useState('');
  const [processedItems, setProcessedItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleBulkProcess = async () => {
    if (!input.trim()) return toast.error('Insira os conceitos dos produtos');
    
    const concepts = input.split('\n').filter(c => c.trim() !== '');
    setLoading(true);
    
    try {
      const res = await axios.post('https://ai-manager-nuvemshop.onrender.com/api/ai/bulk-process', { concepts });
      setProcessedItems(res.data);
      toast.success(`${res.data.length} produtos processados por IA!`);
    } catch (error) {
      toast.error('Erro no processamento massivo');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (index, field, value) => {
    const newItems = [...processedItems];
    newItems[index][field] = value;
    setProcessedItems(newItems);
  };

  const handleSaveAll = async () => {
    toast.loading('Publicando catálogo massivo na Nuvemshop...');
    // Simulação de salvamento em lote
    setTimeout(() => {
      toast.dismiss();
      toast.success('Catálogo sincronizado com sucesso!');
      setProcessedItems([]);
      setInput('');
    }, 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Layers className="w-8 h-8 text-primary" /> Upload Massivo IA
          </h1>
          <p className="text-slate-400 mt-2">Transforme conceitos em produtos prontos para venda em segundos.</p>
        </div>
        <div className="flex gap-4">
          <div className="glass px-4 py-2 rounded-lg flex items-center gap-2 text-sm text-slate-400">
            <Zap className="w-4 h-4 text-amber-400" /> Modo Turbo Ativo
          </div>
        </div>
      </div>

      {!processedItems.length ? (
        <div className="glass p-8 rounded-2xl border-dashed border-slate-700">
          <label className="block text-sm font-bold text-slate-400 mb-4 uppercase tracking-widest">Conceitos dos Produtos (Um por linha)</label>
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ex: Caneca para Advogado&#10;Camiseta Estampa Tech&#10;Almofada Gamer Decorativa"
            className="w-full h-48 bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-white text-lg focus:border-primary outline-none transition-all placeholder:text-slate-700"
          ></textarea>
          
          <button 
            onClick={handleBulkProcess}
            disabled={loading}
            className="mt-6 w-full py-4 bg-primary text-white font-bold rounded-xl hover:shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
            {loading ? 'Processando Inteligência AIOX...' : 'Gerar Catálogo Inteligente'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">Revisão do Catálogo ({processedItems.length} itens)</h2>
            <div className="flex gap-4">
              <button 
                onClick={() => setProcessedItems([])}
                className="px-6 py-2 glass rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveAll}
                className="px-8 py-2 bg-emerald-500 text-white font-bold rounded-lg hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all flex items-center gap-2"
              >
                <Send className="w-4 h-4" /> Publicar Tudo na Loja
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {processedItems.map((item, index) => (
              <div key={item.id} className="glass p-6 rounded-xl border-slate-800 hover:border-slate-700 transition-all">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-4">
                    <input 
                      value={item.name}
                      onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
                      className="w-full bg-transparent text-xl font-bold text-white focus:text-primary outline-none"
                    />
                    <textarea 
                      value={item.description}
                      onChange={(e) => handleFieldChange(index, 'description', e.target.value)}
                      className="w-full bg-slate-900/30 border border-slate-800/50 rounded-lg p-3 text-sm text-slate-400 h-24 outline-none focus:border-slate-600"
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
                      <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Preço Sugerido</p>
                      <input 
                        value={item.price}
                        onChange={(e) => handleFieldChange(index, 'price', e.target.value)}
                        className="bg-transparent text-white font-bold outline-none"
                      />
                    </div>
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-[10px] text-emerald-500 uppercase font-bold mb-1 italic">Score SEO IA</p>
                      <p className="text-emerald-400 font-bold">98/100</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkUpload;

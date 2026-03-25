import React, { useState } from 'react';
import { Upload, X, Package, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

const BulkManualUpload = ({ onComplete, initialData = null }) => {
  const [items, setItems] = useState([]); // Array: { id, dataUrl, name }
  const [commonData, setCommonData] = useState({
    price: '',
    stock: '1',
    weight: '0.1',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'error' | 'partial'
  const [errorLines, setErrorLines] = useState([]);

  // Função protetora para extrair strings de objetos mult-idioma da API Nuvemshop
  const getText = (val) => {
    if (!val) return '';
    if (typeof val === 'object') return val.pt || val.es || val.en || Object.values(val)[0] || '';
    return val;
  };

  const baseName = initialData ? getText(initialData.name) : '';

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    Promise.all(files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            id: Date.now() + Math.random(),
            dataUrl: reader.result,
            name: file.name.replace(/\.[^/.]+$/, "")
          });
        };
        reader.readAsDataURL(file);
      });
    })).then(newItems => {
      setItems(prev => [...prev, ...newItems]);
    });
  };

  const removeItem = (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const updateItemName = (id, newName) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, name: newName } : item));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) return;

    setLoading(true);
    setStatus(null);
    setErrorLines([]);

    try {
      const payload = {
        items: items.map(i => ({ name: i.name, image: i.dataUrl })),
        baseProduct: initialData,
        commonData: initialData ? null : commonData
      };

      const response = await axios.post('https://ai-manager-nuvemshop.onrender.com/api/products/bulk-create-manual', payload);

      if (response.data.success) {
        setStatus('success');
        setTimeout(() => onComplete(), 2000);
      } else {
        setStatus('error');
        setErrorLines(response.data.errors || []);
      }
    } catch (error) {
      console.error('Erro no upload em lote:', error);
      setStatus('error');
      setErrorLines([error.response?.data?.details || error.message]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass p-8 rounded-3xl border-primary max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-primary/10 rounded-2xl">
          <Upload className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Cadastro Manual em Lote</h2>
          <p className="text-slate-400">
            {initialData 
              ? "Suba as fotos e defina os nomes individuais. O restante das informações será clonado do produto original!" 
              : "Suba as fotos e defina os dados comuns para todos os produtos."}
          </p>
        </div>
      </div>

      {initialData && (
        <div className="mb-8 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-4 animate-pulse-slow">
          <Package className="w-6 h-6 text-emerald-400 shrink-0 mt-1" />
          <div>
            <h3 className="text-emerald-400 font-bold mb-1">Modo de Replicação Ativado</h3>
            <p className="text-emerald-400/80 text-sm">
              Clonando: <b>{baseName}</b><br/>
              Todas as variações de tamanhos, preços promocionais, peso, categorias, opções e informações de SEO serão transferidas fielmente para os produtos abaixo. 
              Você só precisa definir o <b>Nome de Exibição</b> e a <b>Foto</b> exclusiva.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Adição e Edição de Itens (Fotos + Nomes) */}
        <div className="space-y-4">
          <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
            Imagens & Identificação ({items.length})
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {items.map((item) => (
              <div key={item.id} className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-900/50 group flex flex-col focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/50 transition-all shadow-lg">
                <div className="aspect-square relative flex-shrink-0 bg-slate-800 border-b border-slate-800">
                  <img src={item.dataUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="absolute top-3 right-3 p-2 bg-rose-500/90 hover:bg-rose-500 text-white rounded-full transition-colors shadow-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <label className="text-xs text-slate-500 font-bold uppercase mb-2">Nome deste produto</label>
                  <input
                    type="text"
                    required
                    value={item.name}
                    onChange={(e) => updateItemName(item.id, e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:border-primary outline-none transition-all"
                    placeholder="Nome específico da imagem..."
                  />
                </div>
              </div>
            ))}

            <label className="aspect-[4/5] rounded-2xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group min-h-[300px]">
              <Upload className="w-10 h-10 text-slate-500 group-hover:text-primary transition-colors duration-300" />
              <span className="text-sm text-slate-400 mt-4 font-bold uppercase tracking-wide group-hover:text-primary transition-colors">Mais Fotos</span>
              <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
            
          </div>
        </div>

        {/* Inputs genéricos SÓ APARECEM SE NÃO FOR MODO REPLICAÇÃO */}
        {!initialData && (
          <div className="pt-8 border-t border-slate-800 space-y-6">
            <h3 className="text-lg font-bold text-white mb-4">Informações Genéricas do Lote</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Preço Genérico (R$)</label>
                <input 
                  required
                  type="number" 
                  step="0.01"
                  value={commonData.price}
                  onChange={e => setCommonData({...commonData, price: e.target.value})}
                  placeholder="0.00"
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Estoque Padrão</label>
                <input 
                  type="number" 
                  value={commonData.stock}
                  onChange={e => setCommonData({...commonData, stock: e.target.value})}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Peso Padrão (kg)</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={commonData.weight}
                  onChange={e => setCommonData({...commonData, weight: e.target.value})}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Descrição Genérica (Opcional)</label>
              <textarea 
                rows="3"
                value={commonData.description}
                onChange={e => setCommonData({...commonData, description: e.target.value})}
                placeholder="Essa descrição será aplicada a todos os produtos criados nesta sessão."
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-all resize-none"
              />
            </div>
          </div>
        )}

        {/* Status e Ação */}
        <div className="flex flex-col gap-4 pt-6 border-t border-slate-800">
          {status === 'success' && (
            <div className="flex items-center gap-2 text-emerald-400 animate-in zoom-in-95 duration-300">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-bold">Processo de lote concluído! Produtos enviados para a loja.</span>
            </div>
          )}
          {status === 'error' && (
            <div className="flex flex-col gap-1 animate-in zoom-in-95 duration-300">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertCircle className="w-5 h-5" />
                <span className="font-bold">Ocorreram erros ao enviar o lote:</span>
              </div>
              {errorLines.length > 0 && (
                <div className="mt-2 text-rose-500/90 text-sm bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 max-h-32 overflow-y-auto">
                  {errorLines.map((e, i) => <div key={i}>• {typeof e === 'object' ? JSON.stringify(e) : e}</div>)}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <button 
              type="submit"
              disabled={loading || items.length === 0}
              className={`px-8 py-4 bg-primary text-white font-black rounded-2xl flex items-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20 disabled:grayscale disabled:opacity-50`}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Package className="w-5 h-5" />
              )}
              ENVIAR {items.length} PRODUTOS PARA LOJA
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default BulkManualUpload;

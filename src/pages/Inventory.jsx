import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Package, Trash2, ExternalLink, Tag, Info, Layers, BarChart3, X, PlusCircle, LayoutGrid, Send, Loader2 } from 'lucide-react';
import BulkManualUpload from '../components/organisms/BulkManualUpload';
import CalculadoraMedidas from '../components/organisms/CalculadoraMedidas';

// SVG inline do Instagram (a versão instalada do lucide-react não exporta Instagram)
const IgIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

const Inventory = ({ products = [], total = 0, page = 1, loading, onDelete, onRefresh, calculatorEnabled = false }) => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'create'
  const [searchQuery, setSearchQuery] = useState('');
  const [duplicateData, setDuplicateData] = useState(null);

  // Modal de publicação no Instagram
  const [igModal, setIgModal] = useState(false);
  const [igCaption, setIgCaption] = useState('');
  const [igPostFeed, setIgPostFeed] = useState(true);
  const [igPostStory, setIgPostStory] = useState(true);
  const [igLoading, setIgLoading] = useState(false);

  // Ao selecionar produto, carrega legenda salva nas configurações
  const openIgModal = async (product) => {
    try {
      const res = await axios.get('/api/marketing/settings');
      const tpl = res.data.feed_caption_template || '';
      const name = getText(product.name);
      const handle = product.handle?.pt || (product.handle ? Object.values(product.handle)[0] : '');
      const link = `https://www.fundofotograficocloth.com.br/produtos/${handle}`;
      const defaultTpl = `✨ NOVIDADE NA CLOTH! ✨\n\n${name}\n\nGaranta o seu agora mesmo no nosso site! 🚀\n\n🔗 ${link}\n\n#fundofotograficocloth #novidade #sublimacao #personalizados`;
      const filled = tpl
        ? tpl.replace(/{{product_name}}/g, name).replace(/{{product_link}}/g, link)
        : defaultTpl;
      setIgCaption(filled);
      setIgPostFeed(true);
      setIgPostStory(true);
      setIgModal(true);
    } catch {
      setIgCaption('');
      setIgModal(true);
    }
  };

  const publishToInstagram = async () => {
    if (!selectedProduct) return;
    if (!igPostFeed && !igPostStory) {
      toast.error('Selecione ao menos Feed ou Story.');
      return;
    }
    setIgLoading(true);
    try {
      const res = await axios.post('/api/instagram/publish', {
        productId: selectedProduct.id,
        customCaption: igCaption,
        postFeed: igPostFeed,
        postStory: igPostStory,
      });
      toast.success(`✅ Publicado! ${igPostFeed ? 'Feed' : ''}${igPostFeed && igPostStory ? ' + ' : ''}${igPostStory ? 'Story' : ''}`);
      setIgModal(false);
    } catch (error) {
      const msg = error.response?.data?.error || 'Erro ao publicar no Instagram.';
      toast.error(msg);
    } finally {
      setIgLoading(false);
    }
  };

  const handleDuplicate = () => {
    if (selectedProduct) {
      setDuplicateData(selectedProduct);
      setViewMode('create');
    }
  };

  const getText = (val) => {
    if (!val) return '';
    if (typeof val === 'object') return val.pt || val.es || val.en || Object.values(val)[0] || '';
    return val;
  };

  const handleCreateNew = () => {
    setDuplicateData(null);
    setViewMode('create');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (onRefresh) onRefresh(1, searchQuery);
  };

  const handlePageChange = (newPage) => {
    if (onRefresh) onRefresh(newPage, searchQuery);
  };

  const handleUploadComplete = () => {
    setViewMode('list');
    if (onRefresh) onRefresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50 backdrop-blur-xl">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Package className="text-primary w-8 h-8" />
            Produtos & Catálogo
          </h1>
          <p className="text-slate-400 mt-1">Gerencie seu inventário e crie novos itens com agilidade.</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 items-center">
          <form onSubmit={handleSearch} className="relative group">
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome ou SKU..."
              className="bg-slate-900/50 border border-slate-700/50 rounded-2xl px-5 py-3 text-sm text-white w-64 focus:border-primary outline-none transition-all group-hover:bg-slate-800"
            />
          </form>

          {viewMode === 'list' && (
            <button 
              onClick={handleCreateNew}
              className="px-6 py-3 bg-primary text-white font-black rounded-2xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
            >
              <PlusCircle className="w-5 h-5" /> CADASTRAR EM LOTE
            </button>
          )}
          {viewMode === 'create' && (
            <button 
              onClick={() => setViewMode('list')}
              className="px-6 py-3 bg-slate-800 text-white font-black rounded-2xl flex items-center gap-2 hover:bg-slate-700 transition-all"
            >
              <LayoutGrid className="w-5 h-5" /> VOLTAR PARA LISTA
            </button>
          )}
        </div>
      </div>

      {viewMode === 'create' ? (
        <BulkManualUpload onComplete={handleUploadComplete} initialData={duplicateData} />
      ) : (
        <>
          {products.length === 0 && !loading ? (
            <div className="glass p-20 rounded-[40px] flex flex-col items-center justify-center text-center space-y-6 border-dashed border-2 border-slate-800 bg-slate-900/20">
              <div className="p-6 bg-slate-800/50 rounded-full">
                <Package className="w-16 h-16 text-slate-600" />
              </div>
              <div className="max-w-md">
                <h2 className="text-2xl font-bold text-white">
                  {searchQuery ? 'Nenhum resultado para sua busca' : 'Nenhum produto encontrado'}
                </h2>
                <p className="text-slate-400 mt-2 leading-relaxed">
                  {searchQuery ? 'Tente buscar por termos mais genéricos ou verifique o SKU.' : 'Sua conta Nuvemshop ainda não possui produtos ativos. Comece cadastrando seus primeiros itens agora!'}
                </p>
              </div>
              <button 
                onClick={() => setViewMode('create')}
                className="px-8 py-4 bg-white text-black font-black rounded-2xl flex items-center gap-3 hover:scale-105 transition-all active:scale-95 shadow-xl"
              >
                <PlusCircle className="w-6 h-6" /> CRIAR MEU PRIMEIRO PRODUTO
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
              {/* Lista de Produtos com Loading State local */}
              <div className="lg:col-span-2 space-y-6">
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-64 space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
                    <p className="text-slate-500">Buscando catálogo...</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {products.map((product) => (
                        <div 
                          key={product.id} 
                          onClick={() => setSelectedProduct(product)}
                          className={`glass p-4 rounded-2xl border-slate-800 hover:border-primary/50 transition-all cursor-pointer group ${selectedProduct?.id === product.id ? 'border-primary ring-1 ring-primary/30 bg-primary/5' : ''}`}
                        >
                          <div className="flex gap-4 text-left">
                            <div className="w-20 h-20 rounded-xl bg-slate-900 overflow-hidden flex-shrink-0 border border-slate-800">
                              {product.images?.[0]?.src ? (
                                <img src={product.images[0].src} alt={getText(product.name)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-700">
                                  <Package size={24} />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-white font-bold truncate group-hover:text-primary transition-colors">{getText(product.name)}</h3>
                              <p className="text-primary font-bold mt-1">
                                R$ {parseFloat(product.variants?.[0]?.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  Estoque: {product.variants?.[0]?.stock || 0}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Paginação */}
                    <div className="flex items-center justify-between p-4 glass rounded-2xl">
                      <p className="text-sm text-slate-500">
                        Mostrando <b>{products.length}</b> de <b>{total}</b> produtos
                      </p>
                      <div className="flex gap-2">
                        <button 
                          disabled={page <= 1 || loading}
                          onClick={() => handlePageChange(page - 1)}
                          className="px-4 py-2 bg-slate-800 text-white rounded-lg disabled:opacity-30 hover:bg-slate-700 transition-all"
                        >
                          Anterior
                        </button>
                        <button 
                          disabled={products.length < 24 || page * 24 >= total || loading}
                          onClick={() => handlePageChange(page + 1)}
                          className="px-4 py-2 bg-slate-800 text-white rounded-lg disabled:opacity-30 hover:bg-slate-700 transition-all"
                        >
                          Próximo
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Detalhes do Produto */}
              <div className="lg:col-span-1">
                {selectedProduct ? (
                  <div className="glass p-6 rounded-2xl border-primary sticky top-8 animate-in fade-in slide-in-from-right-8 duration-500 shadow-2xl shadow-primary/10">
                    <div className="flex justify-between items-start mb-6">
                      <h2 className="text-xl font-bold text-white">Ficha Técnica</h2>
                      <button 
                        onClick={() => setSelectedProduct(null)}
                        className="p-1 hover:bg-slate-800 rounded-full text-slate-500"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-6">
                      <div className="aspect-video rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-inner flex items-center justify-center">
                        {selectedProduct.images && selectedProduct.images[0] ? (
                          <img src={selectedProduct.images[0].src} alt={getText(selectedProduct.name)} className="w-full h-full object-contain" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-800"><Package size={48} /></div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                          <p className="text-xs text-slate-500 uppercase font-bold mb-1 flex items-center gap-2">
                            <Tag className="w-3 h-3 text-primary" /> SEO & Tags
                          </p>
                          <p className="text-white text-sm font-medium">{getText(selectedProduct.seo_title) || getText(selectedProduct.name)}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {getText(selectedProduct.tags) ? getText(selectedProduct.tags).split(',').map(tag => (
                              <span key={tag} className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 font-bold uppercase">{tag.trim()}</span>
                            )) : <span className="text-xs text-slate-600 italic">Sem tags</span>}
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                          <p className="text-xs text-slate-500 uppercase font-bold mb-1 flex items-center gap-2">
                            <Info className="w-3 h-3 text-primary" /> Descrição Estruturada
                          </p>
                          <p className="text-slate-400 text-xs leading-relaxed">
                            {getText(selectedProduct.description) ? getText(selectedProduct.description).replace(/<[^>]*>?/gm, '') : 'Sem descrição disponível.'}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                            <p className="text-[10px] text-slate-500 uppercase font-bold mb-1 flex items-center gap-2">
                              <BarChart3 className="w-3 h-3" /> SKU
                            </p>
                            <p className="text-white text-sm font-mono tracking-tighter truncate">{selectedProduct.variants?.[0]?.sku || 'AIOX-GEN'}</p>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                            <p className="text-[10px] text-slate-500 uppercase font-bold mb-1 flex items-center gap-2">
                              <Layers className="w-3 h-3" /> Peso
                            </p>
                            <p className="text-white text-sm font-bold">{selectedProduct.variants?.[0]?.weight || '0'} kg</p>
                          </div>
                        </div>
                      </div>

                      {/* Calculadora de Medidas Personalizadas */}
                      {calculatorEnabled && (
                        <CalculadoraMedidas 
                          product={selectedProduct}
                          storeUrl={getText(selectedProduct?.canonical_url)}
                        />
                      )}

                      <div className="space-y-3">
                        {/* Botão Instagram */}
                        <button 
                          onClick={() => openIgModal(selectedProduct)}
                          className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-pink-500/20 group"
                        >
                          <IgIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          PUBLICAR NO INSTAGRAM
                        </button>

                        <div className="flex gap-3 pt-1">
                          <a 
                            href={getText(selectedProduct.canonical_url)} 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex-1 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-all flex items-center justify-center gap-2 border border-slate-700"
                          >
                            <ExternalLink className="w-4 h-4" /> VER NA LOJA
                          </a>
                          
                          <button 
                            onClick={handleDuplicate}
                            className="flex-[1.5] py-3 bg-primary/10 text-primary font-bold rounded-xl hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2 border border-primary/30"
                          >
                            <PlusCircle className="w-5 h-5" /> REPLICAR PARA LOTE
                          </button>
                        </div>

                        <button 
                          onClick={() => onDelete(selectedProduct.id)}
                          className="w-full py-3 bg-rose-500/10 text-rose-500 font-bold rounded-xl hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-2 border border-rose-500/20"
                        >
                          <Trash2 className="w-5 h-5" /> EXCLUIR PRODUTO
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="glass p-12 rounded-2xl flex flex-col items-center justify-center text-center opacity-40 h-[400px] border-dashed border-2 border-slate-700">
                    <Package className="w-16 h-16 mb-4 text-slate-700" />
                    <p className="text-slate-500 font-medium">Selecione um produto para visualizar os detalhes técnicos e SEO.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── Modal Publicar no Instagram ─────────────────────────────── */}
      {igModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-[28px] p-8 w-full max-w-lg shadow-2xl animate-in slide-in-from-bottom-8 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                  <IgIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg leading-tight">Publicar no Instagram</h3>
                  <p className="text-slate-500 text-xs">{getText(selectedProduct?.name)}</p>
                </div>
              </div>
              <button 
                onClick={() => setIgModal(false)} 
                className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Legenda do Feed */}
            <div className="space-y-3 mb-6">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Send size={12} /> Legenda do Feed
              </label>
              <textarea
                value={igCaption}
                onChange={(e) => setIgCaption(e.target.value)}
                rows={7}
                className="w-full bg-slate-950 border border-slate-800 focus:border-pink-500/50 focus:ring-4 focus:ring-pink-500/10 rounded-2xl py-3 px-4 text-white text-sm font-mono leading-relaxed resize-none outline-none transition-all"
                placeholder="Digite a legenda aqui..."
              />
              <p className="text-[11px] text-slate-600 italic">Esta legenda é usada no <b className="text-slate-500">Feed</b>. O Story usa apenas o link do produto.</p>
            </div>

            {/* Checkboxes */}
            <div className="flex gap-4 mb-6">
              <label className={`flex items-center gap-3 p-3 flex-1 rounded-xl border cursor-pointer transition-all ${igPostFeed ? 'border-pink-500/40 bg-pink-500/10 text-pink-300' : 'border-slate-800 text-slate-500'}`}>
                <input 
                  type="checkbox" 
                  checked={igPostFeed} 
                  onChange={e => setIgPostFeed(e.target.checked)} 
                  className="accent-pink-500 w-4 h-4"
                />
                <div>
                  <p className="text-sm font-bold">Feed</p>
                  <p className="text-[10px] opacity-70">Foto + legenda</p>
                </div>
              </label>
              <label className={`flex items-center gap-3 p-3 flex-1 rounded-xl border cursor-pointer transition-all ${igPostStory ? 'border-purple-500/40 bg-purple-500/10 text-purple-300' : 'border-slate-800 text-slate-500'}`}>
                <input 
                  type="checkbox" 
                  checked={igPostStory} 
                  onChange={e => setIgPostStory(e.target.checked)} 
                  className="accent-purple-500 w-4 h-4"
                />
                <div>
                  <p className="text-sm font-bold">Story</p>
                  <p className="text-[10px] opacity-70">Foto + link direto</p>
                </div>
              </label>
            </div>

            {/* Botões */}
            <div className="flex gap-3">
              <button 
                onClick={() => setIgModal(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={publishToInstagram}
                disabled={igLoading}
                className="flex-[2] py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
              >
                {igLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Publicando...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" /> Publicar Agora
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
  </div>
  );
};

export default Inventory;

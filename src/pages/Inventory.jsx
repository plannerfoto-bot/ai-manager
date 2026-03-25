import React, { useState } from 'react';
import { Package, Trash2, ExternalLink, Tag, Info, Layers, BarChart3, X, PlusCircle, LayoutGrid } from 'lucide-react';
import BulkManualUpload from '../components/organisms/BulkManualUpload';
import CalculadoraMedidas from '../components/organisms/CalculadoraMedidas';

const Inventory = ({ products = [], total = 0, page = 1, loading, onDelete, onRefresh, calculatorEnabled = false }) => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'create'
  const [searchQuery, setSearchQuery] = useState('');
  const [duplicateData, setDuplicateData] = useState(null);

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
                        <div className="flex gap-3 pt-4">
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
    </div>
  );
};

export default Inventory;


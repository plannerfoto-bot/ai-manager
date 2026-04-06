import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PackagePlus, Image as ImageIcon, Copy, Zap, Loader2, CheckCircle, Search, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';

const UnitaryRegistration = () => {
    const [baseProduct, setBaseProduct] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [products, setProducts] = useState([]);
    const [searching, setSearching] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [successData, setSuccessData] = useState(null);

    // URL Dinâmica para API
    const API_BASE_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : 'https://ai-manager-nuvemshop.onrender.com';

    const handleSearch = async () => {
        if (!searchQuery) return;
        setSearching(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/products?q=${searchQuery}`);
            setProducts(res.data.products || []);
            if (res.data.products.length === 0) toast.error('Nenhum produto encontrado');
        } catch (error) {
            toast.error('Erro ao buscar produtos');
        } finally {
            setSearching(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const handleRegister = async () => {
        if (!baseProduct) return toast.error('Selecione um produto base');
        if (!selectedFile) return toast.error('Selecione uma imagem');

        setLoading(true);
        const toastId = toast.loading('Processando imagem e clonando dados...');

        try {
            // Converter imagem para base64
            const reader = new FileReader();
            reader.readAsDataURL(selectedFile);
            reader.onloadend = async () => {
                const base64data = reader.result;
                
                try {
                    const res = await axios.post(`${API_BASE_URL}/api/products/register-unitary`, {
                        baseProductId: baseProduct.id,
                        fileName: selectedFile.name,
                        imageData: base64data
                    });

                    if (res.data.success) {
                        toast.success('Produto cadastrado com sucesso!', { id: toastId });
                        setSuccessData(res.data.product);
                        // Resetar campos após sucesso (opcional)
                        setSelectedFile(null);
                        setPreviewUrl(null);
                    }
                } catch (err) {
                    console.error(err);
                    toast.error(err.response?.data?.error || 'Erro no processamento', { id: toastId });
                } finally {
                    setLoading(false);
                }
            };
        } catch (error) {
            toast.error('Erro ao ler arquivo', { id: toastId });
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <PackagePlus className="w-8 h-8 text-primary" /> Cadastro Unitário
                    </h1>
                    <p className="text-slate-400 mt-2">Replicação inteligente de produtos com marca d'água automática.</p>
                </div>
                <div className="glass px-4 py-2 rounded-lg flex items-center gap-2 text-sm text-slate-400">
                    <Zap className="w-4 h-4 text-amber-400" /> Inteligência Ativa
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Coluna 1: Configurações */}
                <div className="space-y-6">
                    {/* Seleção de Produto Base */}
                    <div className="glass p-6 rounded-2xl border border-slate-800">
                        <label className="block text-sm font-bold text-slate-400 mb-4 uppercase tracking-widest flex items-center gap-2">
                            <Copy className="w-4 h-4" /> 1. Selecionar Produto Base
                        </label>
                        
                        <div className="flex gap-2 mb-4">
                            <input 
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="Nome, SKU ou ID do produto..."
                                className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-primary outline-none"
                            />
                            <button 
                                onClick={handleSearch}
                                disabled={searching}
                                className="bg-slate-800 hover:bg-slate-700 text-white px-4 rounded-xl transition-all"
                            >
                                {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                            </button>
                        </div>

                        {products.length > 0 && !baseProduct && (
                            <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                {products.map(p => (
                                    <div 
                                        key={p.id}
                                        onClick={() => setBaseProduct(p)}
                                        className="p-3 bg-slate-800/30 border border-slate-800 rounded-lg cursor-pointer hover:border-primary/50 transition-all flex items-center gap-3"
                                    >
                                        <img src={p.images?.[0]?.src} className="w-10 h-10 rounded object-cover bg-slate-900" alt="" />
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-sm font-bold text-white truncate">{p.name.pt || p.name}</p>
                                            <p className="text-[10px] text-slate-500 italic">SKU: {p.variants?.[0]?.sku || 'N/A'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {baseProduct && (
                            <div className="p-4 bg-primary/10 border border-primary/30 rounded-xl flex items-center gap-4 animate-in zoom-in-95 duration-300">
                                <img src={baseProduct.images?.[0]?.src} className="w-16 h-16 rounded-lg object-cover bg-slate-900" alt="" />
                                <div className="flex-1">
                                    <p className="text-xs text-primary font-bold uppercase mb-1">Base Selecionada</p>
                                    <p className="text-white font-bold">{baseProduct.name.pt || baseProduct.name}</p>
                                    <button 
                                        onClick={() => setBaseProduct(null)}
                                        className="text-[10px] text-red-400 underline mt-1 italic"
                                    >
                                        Trocar produto base
                                    </button>
                                </div>
                                <CheckCircle className="text-primary w-6 h-6" />
                            </div>
                        )}
                    </div>

                    {/* Upload de Imagem */}
                    <div className="glass p-6 rounded-2xl border border-slate-800">
                        <label className="block text-sm font-bold text-slate-400 mb-4 uppercase tracking-widest flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" /> 2. Imagem Original (Sem Marca)
                        </label>
                        
                        <div 
                            className={`border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center gap-4 cursor-pointer
                                ${selectedFile ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-800 hover:border-primary/50 bg-slate-900/30'}`}
                            onClick={() => document.getElementById('file-upload').click()}
                        >
                            <input 
                                type="file" 
                                id="file-upload" 
                                hidden 
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                            
                            {!selectedFile ? (
                                <>
                                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-2">
                                        <ImageIcon className="w-8 h-8 text-slate-500" />
                                    </div>
                                    <p className="text-slate-400 text-sm text-center">Clique ou arraste a imagem aqui.<br/><span className="text-[10px] italic">O nome do arquivo será usado como SKU.</span></p>
                                </>
                            ) : (
                                <div className="text-center">
                                    <p className="text-emerald-400 font-bold mb-2">Imagem Carregada!</p>
                                    <p className="text-white text-xs font-mono bg-slate-950 px-3 py-1 rounded-full border border-slate-800">{selectedFile.name}</p>
                                </div>
                            )}
                        </div>

                        {selectedFile && (
                            <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                <div className="flex items-center gap-2 mb-2 text-amber-500 text-xs font-bold uppercase">
                                    <Zap className="w-3 h-3" /> SKU Automático Gerado
                                </div>
                                <p className="text-white font-mono text-lg">{selectedFile.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9-]/g, "")}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Coluna 2: Preview e Ação */}
                <div className="space-y-6">
                    <div className="glass p-6 rounded-2xl border border-slate-800 min-h-[400px] flex flex-col">
                        <label className="block text-sm font-bold text-slate-400 mb-6 uppercase tracking-widest flex items-center gap-2">
                            Preview do Cadastro
                        </label>

                        {previewUrl ? (
                            <div className="flex-1 flex flex-col h-full">
                                <div className="relative rounded-xl overflow-hidden border border-slate-800 group bg-slate-950 flex-1 flex items-center justify-center">
                                    <img src={previewUrl} className="max-h-[300px] object-contain" alt="Preview" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white text-xs font-bold uppercase tracking-widest">
                                        Imagem Original
                                    </div>
                                </div>
                                <div className="mt-6 space-y-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500 italic">Replicação:</span>
                                        <span className="text-white font-bold">{baseProduct ? 'Atributos, SEO e Categorias OK' : 'Aguardando base...'}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500 italic">Marca d'água:</span>
                                        <span className="text-amber-400 font-bold">Será aplicada em grade (Tiled)</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-600 italic text-sm">
                                <ImageIcon className="w-12 h-12 mb-4 opacity-10" />
                                <p>Aguardando imagem para gerar preview...</p>
                            </div>
                        )}

                        <button 
                            onClick={handleRegister}
                            disabled={loading || !baseProduct || !selectedFile}
                            className="mt-8 w-full py-5 bg-primary text-white font-bold rounded-2xl hover:shadow-[0_0_40px_rgba(37,99,235,0.4)] transition-all flex items-center justify-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed group"
                        >
                            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6 group-hover:scale-110 transition-transform" />}
                            {loading ? 'Sincronizando com Nuvemshop...' : 'Cadastrar Produto Agora'}
                        </button>
                    </div>

                    {successData && (
                        <div className="p-6 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl animate-in fade-in zoom-in duration-500">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
                                    <CheckCircle className="text-white w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold">Produto Criado!</h3>
                                    <p className="text-emerald-400 text-xs">Sincronizado com sucesso na loja.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 bg-black/20 p-3 rounded-lg">
                                <img src={previewUrl} className="w-12 h-12 rounded object-cover" alt="" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm font-bold truncate">{successData.name.pt}</p>
                                    <a 
                                        href={`https://www.nuvemshop.com.br/admin/products/${successData.id}`} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="text-primary text-[10px] font-bold hover:underline"
                                    >
                                        VER NO PAINEL NUVEMSHOP
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UnitaryRegistration;

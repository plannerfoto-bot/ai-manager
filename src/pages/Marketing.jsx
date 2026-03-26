import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  Share2, 
  Globe, 
  Key, 
  Save, 
  ExternalLink, 
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Zap,
  Sparkles
} from 'lucide-react';

const Marketing = () => {
    const [settings, setSettings] = useState({
        meta_token: '',
        fb_page_id: ''
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            try {
                const res = await axios.get('/api/marketing/settings');
                setSettings(res.data);
            } catch (error) {
                console.error('Erro ao buscar settings:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await axios.post('/api/marketing/settings', settings);
            toast.success('Configurações salvas com sucesso!');
        } catch (error) {
            toast.error('Erro ao salvar configurações.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header com Gradiente */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600/20 via-pink-600/10 to-transparent border border-pink-500/20 p-8 shadow-2xl">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Share2 size={120} />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-pink-400 font-bold tracking-widest text-xs uppercase">
                            <Zap size={14} className="fill-pink-400" />
                            Marketing Autônomo
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight">
                            Instagram <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400">Auto-Post</span>
                        </h1>
                        <p className="text-slate-400 max-w-xl text-lg lead-relaxed">
                            Sincronize sua loja com o Instagram. Cada novo produto cadastrado será postado automaticamente no seu Feed e Stories.
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className={`px-4 py-2 rounded-full border text-sm font-bold flex items-center gap-2 ${
                            settings.meta_token 
                                ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                                : 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                        }`}>
                            {settings.meta_token ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                            {settings.meta_token ? 'Sistema Ativo' : 'Aguardando Configuração'}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Formulário de Configuração */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 shadow-xl backdrop-blur-sm">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Key className="text-blue-400" size={20} />
                            Credenciais do Meta
                        </h2>
                        
                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-400 ml-1">Meta Access Token</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                                            <Key size={18} />
                                        </div>
                                        <input 
                                            type="password"
                                            value={settings.meta_token}
                                            onChange={(e) => setSettings({...settings, meta_token: e.target.value})}
                                            placeholder="Cole o token gerado no Meta for Developers..."
                                            className="w-full bg-slate-950/50 border border-slate-800 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-700 transition-all outline-none"
                                        />
                                    </div>
                                    <p className="text-[11px] text-slate-500 ml-1 italic">
                                        Dica: Use um "User Access Token" de longa duração para evitar expiração.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-400 ml-1">Facebook Page ID</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                                            <Globe size={18} />
                                        </div>
                                        <input 
                                            type="text"
                                            value={settings.fb_page_id}
                                            onChange={(e) => setSettings({...settings, fb_page_id: e.target.value})}
                                            placeholder="Ex: 1092837465..."
                                            className="w-full bg-slate-950/50 border border-slate-800 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-700 transition-all outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button 
                                type="submit"
                                disabled={saving}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 group"
                            >
                                {saving ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
                                ) : (
                                    <>
                                        <Save size={18} className="group-hover:scale-110 transition-transform" />
                                        Salvar Configurações
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    <div className="bg-blue-600/5 border border-blue-500/20 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-6">
                        <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center shrink-0">
                            <HelpCircle className="text-blue-400" size={32} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-white">Não sabe como gerar as chaves?</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Preparamos um guia didático para você conseguir seu Token e o ID da sua página em menos de 5 minutos.
                            </p>
                        </div>
                        <a 
                            href="#" 
                            onClick={(e) => e.preventDefault()} // No futuro abriria o guia
                            className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors"
                        >
                            Ver Guia Passo a Passo
                            <ExternalLink size={14} />
                        </a>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                        <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest px-2">Como funciona?</h4>
                        <div className="space-y-4">
                            {[
                                { t: 'Cadastro', d: 'Você cadastra o produto normal na Nuvemshop.', i: CheckCircle2, c: 'text-blue-400' },
                                { t: 'Gatilho', d: 'O AI Manager detecta o novo produto via Webhook.', i: Zap, c: 'text-pink-400' },
                                { t: 'Processamento', d: 'Analisamos as imagens e criamos a legenda.', i: Sparkles, c: 'text-orange-400' },
                                { t: 'Postagem', d: 'O post vai direto para seu Feed e Stories.', i: Share2, c: 'text-purple-400' },
                            ].map((step, idx) => (
                                <div key={idx} className="flex gap-4 p-3 rounded-2xl hover:bg-slate-800/50 transition-colors group">
                                    <div className={`mt-1 ${step.c} opacity-50 group-hover:opacity-100 transition-opacity`}>
                                        <step.i size={18} />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-slate-200">{step.t}</p>
                                        <p className="text-xs text-slate-500 leading-relaxed">{step.d}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900 flex items-center justify-between group cursor-help">
                        <div className="flex items-center gap-3">
                            <Share2 className="text-pink-500" size={24} />
                            <div>
                                <p className="text-sm font-bold text-white">Limites de API</p>
                                <p className="text-xs text-slate-500">25 posts / 24h</p>
                            </div>
                        </div>
                        <HelpCircle size={14} className="text-slate-700 group-hover:text-slate-400 transition-colors" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Marketing;

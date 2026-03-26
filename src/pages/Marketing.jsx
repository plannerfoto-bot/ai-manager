import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  Share2, Globe, Key, Save, ExternalLink, 
  HelpCircle, CheckCircle2, AlertCircle,
  Zap, Sparkles, FileText, Link2
} from 'lucide-react';

const Marketing = () => {
    const [settings, setSettings] = useState({
        meta_token: '',
        fb_page_id: '',
        feed_caption_template: ''
    });
    const [saving, setSaving] = useState(false);
    const [webhooks, setWebhooks] = useState([]);
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [registering, setRegistering] = useState(false);

    const defaultCaption = `✨ NOVIDADE NA CLOTH! ✨\n\n{{product_name}}\n\nGaranta o seu agora mesmo no nosso site! 🚀\n\n🔗 {{product_link}}\n\n#clothsublimacao #novidade #sublimacao #personalizados`;

    const fetchData = async () => {
        setLoadingHistory(true); // Assuming loadingHistory will cover initial data fetch
        try {
            const [settingsRes, webhooksRes, historyRes] = await Promise.all([
                axios.get('/api/marketing/settings'),
                axios.get('/api/webhooks/list'),
                axios.get('/api/webhooks/history')
            ]);
            setSettings(settingsRes.data);
            setWebhooks(webhooksRes.data.webhooks || []);
            setHistory(historyRes.data || []);
        } catch (error) {
            console.error('Erro ao buscar dados:', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Atualiza histórico a cada 30s se a aba estiver aberta
        const interval = setInterval(async () => {
            try {
                const res = await axios.get('/api/webhooks/history');
                setHistory(res.data || []);
            } catch (error) {
                console.error('Erro ao buscar histórico no intervalo:', error);
            }
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleRegisterWebhook = async () => {
        setRegistering(true);
        try {
            const res = await axios.post('/api/webhooks/register');
            toast.success(res.data.message || 'Webhook registrado!');
            
            // Atualiza a lista
            const listRes = await axios.get('/api/webhooks/list');
            setWebhooks(listRes.data.webhooks || []);
        } catch (error) {
            const msg = error.response?.data?.message || 'Erro ao registrar webhook.';
            toast.error(msg);
            console.error(error);
        } finally {
            setRegistering(false);
        }
    };

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

    const captionPreview = (settings.feed_caption_template || defaultCaption)
        .replace(/{{product_name}}/g, 'Nome do Produto')
        .replace(/{{product_link}}/g, 'clothsublimacao.com.br/produto');

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
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
                        <h1 className="text-2xl font-black text-white tracking-tighter flex items-center gap-3">
                        Instagram Auto-Post
                        <span className="text-[10px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-mono">v5.2</span>
                    </h1>
                        <p className="text-slate-400 max-w-xl text-lg">
                            Configure suas credenciais e personalize a legenda do Feed. Stories postam automaticamente com o link do produto.
                        </p>
                    </div>
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Formulário */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 shadow-xl backdrop-blur-sm">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Key className="text-blue-400" size={20} />
                            Credenciais do Meta
                        </h2>
                        
                        <form onSubmit={handleSave} className="space-y-6">
                            {/* Token */}
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
                                    Use um token de "Usuário do Sistema" no Business Manager — nunca expira.
                                </p>
                            </div>

                            {/* Page ID */}
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
                                        placeholder="Ex: 1239980869347062"
                                        className="w-full bg-slate-950/50 border border-slate-800 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-700 transition-all outline-none"
                                    />
                                </div>
                            </div>

                            {/* Legenda do Feed */}
                            <div className="pt-4 border-t border-slate-800 space-y-4">
                                <div className="flex items-center gap-2">
                                    <FileText className="text-pink-400" size={18} />
                                    <h3 className="text-base font-bold text-white">Legenda do Feed</h3>
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Personalize a legenda das postagens no <b className="text-slate-300">Feed</b>. Use{' '}
                                    <code className="bg-slate-800 text-pink-300 px-1 rounded">{'{{product_name}}'}</code>{' '}
                                    e{' '}
                                    <code className="bg-slate-800 text-pink-300 px-1 rounded">{'{{product_link}}'}</code>{' '}
                                    como variáveis automáticas.
                                </p>
                                <div className="relative">
                                    <textarea
                                        value={settings.feed_caption_template}
                                        onChange={(e) => setSettings({...settings, feed_caption_template: e.target.value})}
                                        rows={8}
                                        placeholder={defaultCaption}
                                        className="w-full bg-slate-950/50 border border-slate-800 focus:border-pink-500/50 focus:ring-4 focus:ring-pink-500/10 rounded-2xl py-4 px-5 text-white placeholder:text-slate-700 transition-all outline-none font-mono text-sm resize-none leading-relaxed"
                                    />
                                    {settings.feed_caption_template && (
                                        <button
                                            type="button"
                                            onClick={() => setSettings({...settings, feed_caption_template: ''})}
                                            className="absolute top-3 right-3 text-[10px] text-slate-600 hover:text-rose-400 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg transition-colors"
                                        >
                                            resetar padrão
                                        </button>
                                    )}
                                </div>
                                {!settings.feed_caption_template && (
                                    <p className="text-[11px] text-slate-600 italic ml-1">Deixe em branco para usar o modelo padrão.</p>
                                )}
                            </div>

                            {/* Stories - informativo */}
                            <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/10 border border-purple-500/20 rounded-2xl p-5 flex gap-4 items-start">
                                <div className="w-9 h-9 bg-purple-500/20 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                                    <Link2 className="text-purple-400" size={16} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-white">Stories: Link Automático</p>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        Os <b>Stories</b> não exibem legenda de texto — postam a foto do produto com o <b>link direto</b> para a página do produto automaticamente. Nenhuma configuração adicional é necessária.
                                    </p>
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

                    {/* Guia */}
                    <div className="bg-blue-600/5 border border-blue-500/20 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-6">
                        <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center shrink-0">
                            <HelpCircle className="text-blue-400" size={32} />
                        </div>
                        <div className="space-y-1 flex-1">
                            <h3 className="text-lg font-bold text-white">Não sabe como gerar as chaves?</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Preparamos um guia para você conseguir seu Token e ID da página em menos de 5 minutos.
                            </p>
                        </div>
                        <a 
                            href="#" 
                            onClick={(e) => e.preventDefault()}
                            className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors"
                        >
                            Ver Guia
                            <ExternalLink size={14} />
                        </a>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Como funciona */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                        <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest px-2">Como funciona?</h4>
                        <div className="space-y-4">
                            {[
                                { t: 'Cadastro', d: 'Você cadastra o produto na Nuvemshop.', i: CheckCircle2, c: 'text-blue-400' },
                                { t: 'Gatilho', d: 'O AI Manager detecta via Webhook.', i: Zap, c: 'text-pink-400' },
                                { t: 'Processamento', d: 'Usa sua legenda personalizada para o Feed.', i: Sparkles, c: 'text-orange-400' },
                                { t: 'Postagem', d: 'Feed com legenda + Story com link direto.', i: Share2, c: 'text-purple-400' },
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

                    {/* Limites */}
                    <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Share2 className="text-pink-500" size={24} />
                            <div>
                                <p className="text-sm font-bold text-white">Limites de API</p>
                                <p className="text-xs text-slate-500">25 posts / 24h</p>
                            </div>
                        </div>
                        <HelpCircle size={14} className="text-slate-700" />
                    </div>

                    {/* Automação Nuvemshop */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest">Automação Nuvemshop</h4>
                            <div className={`w-2 h-2 rounded-full ${webhooks.some(wh => wh.event === 'product/created') ? 'bg-green-500 animate-pulse' : 'bg-slate-700'}`} />
                        </div>
                        
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Ative o <b>Gatilho Automático</b> para que cada novo produto cadastrado na Nuvemshop seja postado imediatamente.
                        </p>

                        {webhooks.some(wh => wh.event === 'product/created') ? (
                            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex items-center gap-3">
                                <CheckCircle2 className="text-green-500 shrink-0" size={18} />
                                <span className="text-xs font-bold text-green-400">Automação Ativa</span>
                            </div>
                        ) : (
                            <button
                                onClick={handleRegisterWebhook}
                                disabled={registering}
                                className="w-full py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 group border border-slate-700"
                            >
                                {registering ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                                ) : (
                                    <>
                                        <Zap size={14} className="group-hover:text-yellow-400 transition-colors" />
                                        Ativar Automação
                                    </>
                                )}
                            </button>
                        )}
                        
                        {webhooks.length > 0 && (
                            <div className="pt-2">
                                <p className="text-[10px] text-slate-600 uppercase font-bold mb-2">Webhooks Ativos:</p>
                                <div className="space-y-1">
                                    {webhooks.map((wh, i) => (
                                        <div key={i} className="text-[10px] text-slate-500 bg-slate-950/50 p-2 rounded-lg border border-slate-800/50 flex items-center justify-between">
                                            <span>{wh.event}</span>
                                            <span className="text-slate-700 truncate max-w-[100px] ml-2">{wh.url}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Preview legenda em tempo real */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3">
                        <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest">Preview do Feed</h4>
                        <div className="bg-slate-950/50 border border-slate-800/50 rounded-2xl p-4">
                            <pre className="text-xs text-slate-400 whitespace-pre-wrap leading-relaxed font-sans break-words italic">
                                "{captionPreview}"
                            </pre>
                        </div>
                    </div>

                    {/* Histórico de Automação */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                        <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center justify-between">
                            Histórico Recente
                            <button onClick={fetchData} className="text-blue-400 hover:text-blue-300 transition-colors">
                                <Share2 size={12} className={loadingHistory ? 'animate-spin' : ''} />
                            </button>
                        </h4>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {history.length === 0 ? (
                                <p className="text-[10px] text-slate-600 italic px-2">Nenhuma atividade registrada ainda.</p>
                            ) : (
                                history.map((log, i) => (
                                    <div key={i} className="bg-slate-950/40 border border-slate-800/40 rounded-xl p-3 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className={`text-[10px] font-bold uppercase ${
                                                log.status === 'Success' ? 'text-green-500' : 
                                                log.status === 'Processing' ? 'text-blue-400' : 'text-red-400'
                                            }`}>
                                                {log.status === 'Success' ? '✅ Postado' : 
                                                 log.status === 'Processing' ? '⏳ Processando' : '❌ Falhou'}
                                            </span>
                                            <span className="text-[9px] text-slate-700">{new Date(log.ts).toLocaleTimeString()}</span>
                                        </div>
                                        <p className="text-[11px] text-white font-medium truncate">{log.productName || `ID: ${log.productId}`}</p>
                                        {log.status === 'Processing' && log.details && (
                                            <p className="text-[9px] text-blue-300/80 animate-pulse font-medium">{log.details}</p>
                                        )}
                                        {log.error && (
                                            <p className="text-[9px] text-red-500 leading-tight italic bg-red-500/5 p-1 rounded">
                                                {typeof log.error === 'string' ? log.error : JSON.stringify(log.error)}
                                            </p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Marketing;

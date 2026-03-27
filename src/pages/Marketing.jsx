import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  Share2, Globe, Key, Save, ExternalLink, 
  HelpCircle, CheckCircle2, AlertCircle,
  Zap, Sparkles, FileText, Link2, X, ChevronRight, Info,
  RefreshCw, Clock, Circle, Layout, Settings, Activity, Monitor, Trash2,
  Image as ImageIcon
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const Marketing = () => {
    const [settings, setSettings] = useState({
        meta_token: '',
        fb_page_id: '',
        feed_caption_template: ''
    });
    const [saving, setSaving] = useState(false);
    const [validating, setValidating] = useState(false);
    const [webhooks, setWebhooks] = useState([]);
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [registering, setRegistering] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [queue, setQueue] = useState([]);
    const [processingQueue, setProcessingQueue] = useState(false);
    const [activeTab, setActiveTab] = useState('activity');


    const defaultCaption = `✨ NOVIDADE NA CLOTH! ✨\n\n{{product_name}}\n\nGaranta o seu agora mesmo no nosso site! 🚀\n\n🔗 {{product_link}}\n\n#clothsublimacao #novidade #sublimacao #personalizados`;

    const fetchData = async () => {
        setLoadingHistory(true); // Assuming loadingHistory will cover initial data fetch
        try {
            const [settingsRes, webhooksRes, historyRes, queueRes] = await Promise.all([
                axios.get('/api/marketing/settings'),
                axios.get('/api/webhooks/list'),
                axios.get('/api/webhooks/logs'),
                axios.get('/api/marketing/queue')
            ]);
            setSettings(settingsRes.data);
            setWebhooks(webhooksRes.data.webhooks || []);
            setHistory(historyRes.data || []);
            setQueue(queueRes.data || []);

        } catch (error) {
            console.error('Erro ao buscar dados:', error);
            const msg = error.response?.data?.message || 'Erro ao buscar dados.';
            toast.error(msg);
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        fetchData();

        // --- SUB-SCRIÇÃO REALTIME (SUPABASE) ---
        // Ouvir mudanças na Fila e no Histórico em tempo real
        const queueChannel = supabase
            .channel('realtime:post_queue')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'post_queue' }, (payload) => {
                console.log('🔄 Realtime Queue:', payload);
                if (payload.eventType === 'INSERT') {
                    setQueue(prev => [payload.new, ...prev]);
                } else if (payload.eventType === 'DELETE') {
                    setQueue(prev => prev.filter(item => item.id !== payload.old.id));
                } else if (payload.eventType === 'UPDATE') {
                    setQueue(prev => prev.map(item => item.id === payload.new.id ? payload.new : item));
                }
            })
            .subscribe();

        const historyChannel = supabase
            .channel('realtime:automation_history')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'automation_history' }, (payload) => {
                console.log('🔄 Realtime History:', payload);
                const newLog = {
                    ...payload.new,
                    ts: payload.new.created_at,
                    productName: payload.new.product_name,
                    productId: payload.new.product_id
                };
                setHistory(prev => [newLog, ...prev].slice(0, 50));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(queueChannel);
            supabase.removeChannel(historyChannel);
        };
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

    const handleValidate = async () => {
        setValidating(true);
        try {
            const res = await axios.get('/api/marketing/validate');
            if (res.data.valid) {
                toast.success(
                  <div className="flex flex-col gap-1">
                    <span className="font-bold">✅ Conexão Estabelecida!</span>
                    <span className="text-xs opacity-90">Sua conta do Instagram foi identificada com sucesso.</span>
                  </div>, 
                  { duration: 6000 }
                );
            } else {
                toast.error(
                  <div className="flex flex-col gap-1">
                    <span className="font-bold">❌ Falha na Conexão</span>
                    <span className="text-xs opacity-90">{res.data.error}</span>
                    <button 
                      onClick={() => setShowGuide(true)}
                      className="text-[10px] underline text-left mt-1 hover:text-white"
                    >
                      Como resolver isso?
                    </button>
                  </div>,
                  { duration: 8000 }
                );
            }
        } catch (error) {
            toast.error('Erro ao validar: ' + (error.response?.data?.error || error.message));
        } finally {
            setValidating(false);
        }
    };

    const handleForceProcess = async () => {
        setProcessingQueue(true);
        try {
            // Usamos a chave de segurança definida no backend (ClothSecret2026)
            await axios.get('/api/cron/process-queue?key=ClothSecret2026');
            toast.success('Processamento disparado com sucesso!');
            fetchData();
        } catch (error) {
            console.error('Erro ao processar fila:', error);
            toast.error('Erro ao processar fila: ' + (error.response?.data?.error || error.message));
        } finally {
            setProcessingQueue(false);
        }
    };

    const handleRemoveFromQueue = async (id) => {
        if (!window.confirm('Deseja remover este item da fila?')) return;
        try {
            await axios.delete(`/api/marketing/queue/${id}`);
            toast.success('Item removido da fila');
            setQueue(prev => prev.filter(item => item.id !== id));
        } catch (error) {
            toast.error('Erro ao remover item');
        }
    };

    const captionPreview = (settings.feed_caption_template || defaultCaption)

        .replace(/{{product_name}}/g, 'Nome do Produto')
        .replace(/{{product_link}}/g, 'clothsublimacao.com.br/produto');

    // Componente Auxiliar de Aba
    const TabButton = ({ id, label, icon: Icon }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all ${
                activeTab === id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
            }`}
        >
            <Icon size={18} />
            {label}
        </button>
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Reduzido */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-slate-800 p-6 shadow-xl">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-pink-600/20 rounded-2xl flex items-center justify-center border border-pink-500/20">
                            <Zap size={24} className="text-pink-500 fill-pink-500/20" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-white tracking-tight">Postagem Automática no Instagram</h1>
                            <p className="text-slate-500 text-xs">Gestão autônoma de redes sociais para Nuvemshop</p>
                        </div>
                    </div>
                    
                    {/* Navegação por Abas */}
                    <div className="flex bg-slate-950/50 p-1 rounded-2xl border border-slate-800/50">
                        <TabButton id="activity" label="Atividade" icon={Monitor} />
                        <TabButton id="config" label="Configurações" icon={Settings} />
                        <TabButton id="guide" label="Guia de Ajuda" icon={HelpCircle} />
                    </div>
                </div>
            </div>

            {/* Aba: MONITORAMENTO / ATIVIDADE */}
            {activeTab === 'activity' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
                    {/* Coluna Esquerda: Fila e Resumo */}
                    <div className="lg:col-span-8 space-y-6">
                        {/* Status da Fila */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <Activity size={20} className="text-yellow-400" />
                                        Fila de Postagem
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">Produtos aguardando o momento ideal de postagem (Drip Feed)</p>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Capacidade</span>
                                    <span className="text-xs font-bold text-slate-300">25 posts / 24h</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {queue.length === 0 ? (
                                    <div className="md:col-span-2 py-12 flex flex-col items-center justify-center bg-slate-950/20 rounded-2xl border border-dashed border-slate-800">
                                        <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center mb-3">
                                            <CheckCircle2 size={24} className="text-slate-700" />
                                        </div>
                                        <p className="text-sm text-slate-500 italic">Tudo limpo! Fila vazia no momento.</p>
                                    </div>
                                ) : (
                                    queue.map((job, i) => (
                                        <div key={i} className={`p-4 rounded-2xl border transition-all ${
                                            job.status === 'failed' ? 'bg-rose-500/5 border-rose-500/20' : 'bg-slate-950/80 border-slate-800 group hover:border-slate-700'
                                        }`}>
                                            <div className="flex gap-4">
                                                {/* Imagem do Produto */}
                                                <div className="w-16 h-16 rounded-lg bg-white/5 border border-white/10 flex-shrink-0 overflow-hidden flex items-center justify-center">
                                                    {job.image_url ? (
                                                        <img src={job.image_url} alt={job.product_name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <ImageIcon className="text-white/20 w-6 h-6" />
                                                    )}
                                                </div>
                                                
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="text-xs font-bold text-white truncate pr-2">
                                                            {job.product_name || `Produto: ${job.product_id}`}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-black tracking-tighter ${
                                                                job.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' :
                                                                job.status === 'processing' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' :
                                                                'bg-red-500/20 text-red-400 border border-red-500/40'
                                                            }`}>
                                                                {job.status}
                                                            </span>
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleRemoveFromQueue(job.id);
                                                                }}
                                                                className="p-1.5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-500 rounded-lg transition-all"
                                                                title="Remover da fila"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-3 text-[10px] text-white/40 mb-2">
                                                        <div className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            <span>Posta em: {new Date(job.scheduled_for).toLocaleTimeString()}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Circle className={`w-1.5 h-1.5 fill-current ${
                                                                job.status === 'pending' ? 'animate-pulse text-yellow-400' : 
                                                                job.status === 'processing' ? 'animate-spin text-blue-400' : 'text-red-400'
                                                            }`} />
                                                        </div>
                                                    </div>

                                                    {(() => {
                                                        if (job.status !== 'pending') return <p className="text-[10px] text-slate-500 italic">Processando...</p>;
                                                        const scheduledDate = new Date(job.scheduled_for);
                                                        const now = new Date();
                                                        const isPast = scheduledDate < now;
                                                        const timeStr = scheduledDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                                        const today = new Date(); today.setHours(0,0,0,0);
                                                        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
                                                        const schedDay = new Date(scheduledDate); schedDay.setHours(0,0,0,0);
                                                        let dateLabel;
                                                        if (schedDay.getTime() === today.getTime()) dateLabel = 'Hoje';
                                                        else if (schedDay.getTime() === tomorrow.getTime()) dateLabel = 'Amanhã';
                                                        else {
                                                            const days = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
                                                            dateLabel = `${days[scheduledDate.getDay()]}, ${scheduledDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
                                                        }
                                                        return (
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                {isPast ? (
                                                                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 tracking-wider">Atrasado</span>
                                                                ) : null}
                                                                <p className={`text-[10px] italic ${isPast ? 'text-rose-400/70' : 'text-slate-400'}`}>
                                                                    🕐 {dateLabel} às {timeStr}
                                                                </p>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>

                                            {job.status === 'failed' && job.error_log && (
                                                <div className="mt-3 p-3 bg-red-500/10 rounded-xl border border-red-500/10 text-[10px] text-red-400 leading-tight italic">
                                                    {typeof job.error_log.error === 'string' ? job.error_log.error : JSON.stringify(job.error_log.error)}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            {queue.length > 0 && (
                                <div className="mt-6 flex items-center justify-between pt-6 border-t border-slate-800/50">
                                    <p className="text-[11px] text-slate-500">Deseja ignorar o agendamento e postar agora?</p>
                                    <button
                                        onClick={handleForceProcess}
                                        disabled={processingQueue}
                                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
                                    >
                                        {processingQueue ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
                                        Forçar Processamento
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Preview Realista */}
                        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8">
                            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Monitor size={16} />
                                Visão da Bio / Feed
                            </h3>
                            <div className="max-w-md mx-auto aspect-square rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center relative group shadow-2xl overflow-hidden ring-1 ring-white/5">
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60 z-10" />
                                <Sparkles className="text-slate-800 group-hover:text-pink-500/20 transition-colors" size={100} />
                                <div className="absolute bottom-0 left-0 right-0 p-6 z-20 space-y-2">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-pink-400">
                                        <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700" />
                                        @seu_instagram • Agora
                                    </div>
                                    <p className="text-xs text-white leading-relaxed line-clamp-3 font-medium">
                                        {captionPreview}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Coluna Direita: Histórico */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 h-full shadow-2xl flex flex-col">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">Logs de Automação de Marketing</h3>
                                <button onClick={fetchData} className="p-2 hover:bg-slate-800 rounded-xl text-blue-400 transition-all">
                                    <RefreshCw size={16} className={loadingHistory ? 'animate-spin' : ''} />
                                </button>
                            </div>

                            <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[700px]">
                                {history.length === 0 ? (
                                    <div className="py-20 text-center text-slate-600">
                                        <p className="text-xs italic">Sem logs registrados ainda.</p>
                                    </div>
                                ) : (
                                    history.map((log, i) => (
                                        <div key={i} className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-4 group hover:border-slate-700 transition-all">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                                    log.status === 'Success' ? 'bg-green-500/10 text-green-500' : 
                                                    log.status === 'Warning' ? 'bg-yellow-500/10 text-yellow-500' :
                                                    log.status === 'Processing' ? 'bg-blue-500/10 text-blue-400' : 
                                                    'bg-rose-500/10 text-rose-500'
                                                }`}>
                                                    {log.status === 'Success' ? 'Postado' : 
                                                     log.status === 'Warning' ? 'Parcial' :
                                                     log.status === 'Processing' ? 'Processando' : 
                                                     log.status === 'Waiting' ? 'Aguardando' : 'Falhou'}
                                                </div>
                                                <span className="text-[10px] text-slate-700 font-mono tracking-tighter">
                                                    {new Date(log.ts).toLocaleTimeString()}
                                                </span>
                                            </div>
                                            
                                            <div className="flex items-center gap-3">
                                                {/* Imagem no Histórico */}
                                                <div className="w-10 h-10 rounded bg-white/5 border border-white/10 flex-shrink-0 overflow-hidden flex items-center justify-center">
                                                    {log.image_url ? (
                                                        <img src={log.image_url} alt={log.productName} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <ImageIcon className="text-white/20 w-4 h-4" />
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-white font-bold truncate mb-1">{log.productName || `Prod ID: ${log.productId}`}</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase font-bold ${
                                                            log.status === 'Success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                                        }`}>
                                                            {log.status}
                                                        </span>
                                                        <span className="text-[10px] text-white/30 truncate">{log.details}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {log.error && (
                                                <div className="mt-2 p-2 bg-rose-500/5 rounded-lg border border-rose-500/10">
                                                    <p className="text-[9px] text-rose-500 leading-tight font-mono">{typeof log.error === 'string' ? log.error : 'Log de erro detalhado disponível.'}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Aba: CONFIGURAÇÃO */}
            {activeTab === 'config' && (
                <div className="max-w-4xl mx-auto space-y-8 pb-20 fade-in duration-500">
                    {/* Credenciais Deep Config */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
                        <header className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
                                    <Key className="text-blue-400" size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white tracking-tight">Backend de Integração</h2>
                                    <p className="text-slate-500 text-xs mt-1">Configure os tokens de acesso da Graph API da Meta</p>
                                </div>
                            </div>
                            <button
                                onClick={handleValidate}
                                disabled={validating || !settings.meta_token}
                                className="bg-slate-950 hover:bg-slate-800 text-blue-400 border border-slate-800 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-30 shadow-lg flex items-center gap-3"
                            >
                                {validating ? <RefreshCw className="animate-spin" size={14} /> : <Globe size={14} />}
                                Testar Conexão
                            </button>
                        </header>

                        <form onSubmit={handleSave} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Token de Acesso da Meta</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-600 group-focus-within:text-blue-400 transition-colors">
                                            <Key size={18} />
                                        </div>
                                        <input 
                                            type="password"
                                            value={settings.meta_token}
                                            onChange={(e) => setSettings({...settings, meta_token: e.target.value})}
                                            placeholder="Token de longa duração..."
                                            className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-700 transition-all outline-none font-mono text-sm"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-600 italic">Dê preferência a tokens de "System User" para estabilidade.</p>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">ID da Página do Facebook</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-600 group-focus-within:text-blue-400 transition-colors">
                                            <Globe size={18} />
                                        </div>
                                        <input 
                                            type="text"
                                            value={settings.fb_page_id}
                                            onChange={(e) => setSettings({...settings, fb_page_id: e.target.value})}
                                            placeholder="Ex: 1239980869347062"
                                            className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-700 transition-all outline-none text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-slate-800 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <FileText className="text-pink-400" size={20} />
                                        <h3 className="text-lg font-bold text-white">Template de Legenda</h3>
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-600">Suporta Markdown e Emojis</span>
                                </div>
                                <div className="relative bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
                                    <div className="flex gap-2 p-2 bg-slate-900/50 border-b border-slate-800">
                                        <div className="px-2 py-1 bg-slate-800 rounded-md text-[9px] font-bold text-pink-400">{'{{product_name}}'}</div>
                                        <div className="px-2 py-1 bg-slate-800 rounded-md text-[9px] font-bold text-pink-400">{'{{product_link}}'}</div>
                                    </div>
                                    <textarea
                                        value={settings.feed_caption_template}
                                        onChange={(e) => setSettings({...settings, feed_caption_template: e.target.value})}
                                        rows={8}
                                        placeholder={defaultCaption}
                                        className="w-full bg-transparent py-4 px-5 text-white placeholder:text-slate-700 transition-all outline-none font-mono text-sm resize-none leading-relaxed"
                                    />
                                    {settings.feed_caption_template && (
                                        <button
                                            type="button"
                                            onClick={() => setSettings({...settings, feed_caption_template: ''})}
                                            className="absolute top-12 right-4 text-[9px] font-black text-rose-500 hover:text-white transition-colors"
                                        >
                                            RESETAR PARA PADRÃO
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                {/* Webhooks Check */}
                                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Gatilhos Nuvemshop</h4>
                                        <div className={`w-2 h-2 rounded-full ${webhooks.some(wh => wh.event === 'product/created') ? 'bg-green-500 animate-pulse' : 'bg-slate-700'}`} />
                                    </div>
                                    {webhooks.some(wh => wh.event === 'product/created') ? (
                                        <div className="text-[10px] text-green-400 font-bold flex items-center gap-2">
                                            <CheckCircle2 size={12} /> Webhook operacional e ouvindo novos produtos.
                                        </div>
                                    ) : (
                                        <button
                                            onClick={handleRegisterWebhook}
                                            disabled={registering}
                                            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-slate-800"
                                        >
                                            {registering ? <RefreshCw className="animate-spin" size={12} /> : 'Ativar Gatilho Automático'}
                                        </button>
                                    )}
                                </div>

                                {/* Stories Disclaimer */}
                                <div className="bg-purple-900/10 border border-purple-500/20 rounded-2xl p-6 flex gap-4">
                                    <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center shrink-0">
                                        <Monitor className="text-purple-400" size={18} />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-white">Lógica de Stories</p>
                                        <p className="text-[10px] text-slate-400 leading-tight">Stories são postados sem legenda, usando um sticker de link automático para o produto.</p>
                                    </div>
                                </div>
                            </div>

                            <button 
                                type="submit"
                                disabled={saving}
                                className="w-full py-5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-2xl flex items-center justify-center gap-3 group"
                            >
                                {saving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} className="group-hover:scale-110 transition-transform" />}
                                Salvar Configurações Mestres
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Aba: GUIA / AJUDA */}
            {activeTab === 'guide' && (
                <div className="max-w-3xl mx-auto pb-20 fade-in duration-500">
                    <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-10 shadow-2xl space-y-12">
                        <header className="text-center space-y-4">
                            <div className="w-20 h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center mx-auto border border-blue-500/20 shadow-inner">
                                <Info className="text-blue-400" size={40} />
                            </div>
                            <h2 className="text-3xl font-black text-white tracking-tighter">Guia de Integração Profissional</h2>
                            <p className="text-slate-500 text-sm max-w-md mx-auto">Siga estes passos para configurar sua automação no Instagram em menos de 10 minutos.</p>
                        </header>

                        <div className="space-y-12">
                            {[
                                { 
                                    step: '1', 
                                    t: 'Requisitos Prévios', 
                                    c: 'Certifique-se que sua conta do Instagram seja Comercial e esteja vinculada a uma Página do Facebook.',
                                    icon: Activity,
                                    color: 'text-pink-400'
                                },
                                { 
                                    step: '2', 
                                    t: 'Meta for Developers', 
                                    c: 'Crie um App tipo "Empresa" no portal de desenvolvedores do Meta e adicione o produto "Instagram Graph API".',
                                    icon: Globe,
                                    color: 'text-blue-400'
                                },
                                { 
                                    step: '3', 
                                    t: 'Permissões Essenciais', 
                                    c: 'Gere um token com as permissões: instagram_basic, instagram_content_publish, pages_show_list, pages_read_engagement.',
                                    extra: ['instagram_basic', 'instagram_content_publish', 'pages_read_engagement'],
                                    icon: Key,
                                    color: 'text-purple-400'
                                },
                                { 
                                    step: '4', 
                                    t: 'Configuração Final', 
                                    c: 'Copie o Access Token e o Page ID (encontrado nas configurações da página no Facebook) e cole na aba de Configuração.',
                                    icon: Save,
                                    color: 'text-green-400'
                                }
                            ].map((item, idx) => (
                                <div key={idx} className="flex gap-8 relative">
                                    {idx < 3 && <div className="absolute top-16 left-8 w-px h-full bg-slate-800" />}
                                    <div className={`w-16 h-16 rounded-3xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 z-10 ${item.color}`}>
                                        <item.icon size={28} />
                                    </div>
                                    <div className="space-y-3 pt-2">
                                        <h4 className="text-lg font-bold text-white flex items-center gap-3">
                                            <span className="text-xs bg-slate-800 text-slate-500 px-2 py-0.5 rounded-lg border border-slate-700">Passo {item.step}</span>
                                            {item.t}
                                        </h4>
                                        <p className="text-slate-400 text-sm leading-relaxed">{item.c}</p>
                                        {item.extra && (
                                            <div className="flex flex-wrap gap-2 pt-2">
                                                {item.extra.map(p => (
                                                    <span key={p} className="text-[9px] font-mono bg-slate-950 text-slate-600 border border-slate-800 px-2 py-0.5 rounded">{p}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-8 bg-blue-600/5 border border-blue-500/10 rounded-2xl flex items-center gap-6">
                            <Info className="text-blue-400 shrink-0" size={24} />
                            <p className="text-xs text-slate-400 leading-relaxed italic">
                                Dica Sênior: Para evitar que o token expire a cada 60 dias, use um <b>System User</b> direto do seu Business Manager. Isso garantirá automação infinita.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Marketing;

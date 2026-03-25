import React, { useState } from 'react';
import { ExternalLink, CheckCircle, ShieldCheck, Zap, Calculator, Phone, Rocket, AlertCircle, Globe } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const ScriptManager = ({ storeId, apiBase }) => {
  const [enabled, setEnabled] = useState(true);
  const [whatsapp, setWhatsapp] = useState('5511999999999');
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState(false);
  const [scriptStatus, setScriptStatus] = useState(null); // { success, scriptUrl, error }

  // Inicia o fluxo de instalação nativa (OAuth)
  const handleConnectApp = () => {
    const installUrl = `${apiBase}/api/auth/install`;
    window.location.href = installUrl;
  };

  // Salva configurações E ativa o script na loja real
  const handleActivateOnStore = async () => {
    setActivating(true);
    setScriptStatus(null);
    try {
      // Passo 1: Salva as configurações (whatsapp, enabled)
      await axios.post(`${apiBase}/api/store-script-settings`, { enabled, whatsapp }, {
        headers: { 'x-store-id': storeId }
      });
      // Passo 2: Injeta o script na loja via API Nuvemshop
      const resp = await axios.post(`${apiBase}/api/store-script`, {}, {
        headers: { 'x-store-id': storeId }
      });
      setScriptStatus({ success: true, scriptUrl: resp.data.scriptUrl });
      toast.success('🚀 Calculadora ativada na loja!');
    } catch (error) {
      const msg = error.response?.data?.error || error.message;
      setScriptStatus({ success: false, error: msg });
      toast.error('Erro ao ativar na loja. Veja detalhes abaixo.');
    } finally {
      setActivating(false);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      await axios.post(`${apiBase}/api/store-script-settings`, {
        enabled,
        whatsapp
      }, {
        headers: { 'x-store-id': storeId }
      });
      toast.success('Configurações salvas!');
    } catch (error) {
      toast.error('Erro ao salvar configurações.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 1. Status Connection Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900/50 p-8 rounded-[2rem] border border-slate-800 shadow-2xl overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[120px] rounded-full -mr-32 -mt-32"></div>
        
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center border border-blue-500/20 shadow-inner">
            <Zap className="w-10 h-10 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Conexão Nativa</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className={`flex h-2 w-2 rounded-full ${storeId ? 'bg-emerald-500' : 'bg-blue-500 animate-pulse'}`}></span>
              <p className="text-slate-400 font-medium">
                {storeId ? `Conectado à Loja ${storeId}` : 'Aguardando Instalação Profissional'}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleConnectApp}
          className="px-8 py-5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-3 group active:scale-95 relative z-10"
        >
          <ExternalLink className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          {storeId ? 'REINSTALAR / ATUALIZAR' : 'INSTALAR NA MINHA LOJA'}
        </button>
      </div>

      {/* 2. Configurações em Tempo Real */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Painel de Controle */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-6">
            <div>
              <label className="text-xs text-slate-500 uppercase font-black mb-3 block">Calculadora Ativa</label>
              <button
                onClick={() => setEnabled(!enabled)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  enabled ? 'bg-blue-600/10 border-blue-500/30 text-blue-300' : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                <span className="font-bold">{enabled ? 'ATIVADA' : 'DESATIVADA'}</span>
                <Calculator className={`w-5 h-5 ${enabled ? 'text-blue-400' : 'text-slate-700'}`} />
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-500 uppercase font-black mb-3 block">WhatsApp de Vendas</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white font-medium focus:outline-none focus:border-blue-500 transition-all"
                  placeholder="5511999999999"
                />
              </div>
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={loading || activating}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black rounded-2xl transition-all shadow-lg shadow-emerald-900/20"
            >
              {loading ? 'SALVANDO...' : 'SALVAR NA NUVEM'}
            </button>

            {/* Botão principal: Ativar na Loja Real */}
            <button
              onClick={handleActivateOnStore}
              disabled={loading || activating || !storeId}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:opacity-40 text-white font-black rounded-2xl transition-all shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2"
            >
              <Rocket className="w-5 h-5" />
              {activating ? 'ATIVANDO...' : 'ATIVAR NA LOJA'}
            </button>

            {/* Feedback de status */}
            {scriptStatus && (
              <div className={`p-4 rounded-2xl border text-sm font-medium ${
                scriptStatus.success
                  ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-900/20 border-red-500/30 text-red-300'
              }`}>
                {scriptStatus.success ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>Calculadora ativa na sua loja!</span>
                    </div>
                    <a href={scriptStatus.scriptUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-400 underline text-xs break-all">
                      <Globe className="w-3 h-3 flex-shrink-0" />
                      {scriptStatus.scriptUrl}
                    </a>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <span className="break-all">{scriptStatus.error}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Benefícios Cloud */}
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-900/40 p-8 rounded-[2rem] border border-slate-800 hover:border-blue-500/20 transition-all group">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-lg font-black text-white mb-2">Segurança OAuth</h3>
            <p className="text-sm text-slate-400 leading-relaxed font-medium">
              Conexão oficial aprovada pela Nuvemshop. Sem necessidade de compartilhar senhas ou chaves privadas.
            </p>
          </div>

          <div className="bg-slate-900/40 p-8 rounded-[2rem] border border-slate-800 hover:border-blue-500/20 transition-all group">
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-black text-white mb-2">Zero Manutenção</h3>
            <p className="text-sm text-slate-400 leading-relaxed font-medium">
              O script se atualiza sozinho. Quando lançarmos novas funções, elas aparecem na sua loja sem você fazer nada.
            </p>
          </div>

          <div className="sm:col-span-2 bg-gradient-to-r from-blue-600/10 to-transparent p-8 rounded-[2rem] border border-blue-500/10">
            <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest mb-2">Como funciona o Novo Modelo</h3>
            <p className="text-sm text-slate-300 leading-relaxed font-medium">
              Diferente do método antigo (FTP), o <b>Modelo Nativo</b> injeta uma ponte inteligente. 
              Isso significa que você tem controle total aqui no painel e estabilidade total na sua loja.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ScriptManager;

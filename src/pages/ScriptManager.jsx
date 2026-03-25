import React, { useState, useEffect, useRef } from 'react';
import { Code2, Copy, CheckCheck, Calculator, ToggleLeft, ToggleRight, Phone, Info, ExternalLink } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

// ─── Gerador do snippet ───────────────────────────────────
function generateSnippet(renderUrl) {
  return `<!-- Cloth Sublimação — Calculadora de Medidas | MVP 1.0 -->
<script src="${renderUrl}/api/script.js" async></script>`;
}

const ScriptManager = () => {
  const [enabled, setEnabled] = useState(true);
  const [whatsapp, setWhatsapp] = useState('5511999999999');
  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const textareaRef = useRef(null);

  const RENDER_URL = 'https://ai-manager-nuvemshop.onrender.com';
  // Forçamos o uso do Render para que as configurações salvas alterem a loja ativa!
  const API_BASE_URL = RENDER_URL;

  const snippet = generateSnippet(RENDER_URL);

  const handlePublish = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setPublishing(true);
    try {
      // 1. Salva as configurações (WhatsApp e Status)
      await axios.post(`${API_BASE_URL}/api/store-script-settings`, { 
        enabled, 
        whatsapp 
      });
      
      toast.success('Configurações salvas no servidor! As mudanças aparecem na loja imediatamente.');
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.error || error.message;
      toast.error(`Erro ao salvar: ${msg}`);
    } finally {
      setPublishing(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
    } catch {
      if (textareaRef.current) {
        textareaRef.current.select();
        document.execCommand('copy');
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8 max-w-[1200px] mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white flex items-center gap-3">
          <Code2 className="w-6 h-6 text-blue-500" />
          Gerenciador de Script Cloud
        </h1>
        <p className="text-slate-400 mt-2">
          Configure sua calculadora em tempo real. As alterações salvam na nuvem e refletem na loja instantaneamente.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
        {/* Configurações */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass p-5 rounded-2xl border border-slate-800">
            <p className="text-xs text-slate-500 uppercase font-bold mb-3 flex items-center gap-2">
              <Calculator className="w-3 h-3 text-blue-400" /> Status Global
            </p>
            <button
              onClick={() => setEnabled(v => !v)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border font-bold text-sm transition-all ${
                enabled
                  ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <span>{enabled ? 'ATIVADA' : 'DESATIVADA'}</span>
              {enabled
                ? <ToggleRight className="w-6 h-6 text-blue-400" />
                : <ToggleLeft className="w-6 h-6 text-slate-600" />}
            </button>
          </div>

          <div className="glass p-5 rounded-2xl border border-slate-800">
            <p className="text-xs text-slate-500 uppercase font-bold mb-3 flex items-center gap-2">
              <Phone className="w-3 h-3 text-green-400" /> WhatsApp de Vendas
            </p>
            <input
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ''))}
              placeholder="Ex: 5511999999999"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing}
            className={`w-full flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-black text-sm transition-all shadow-lg ${
              publishing 
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-500 text-white hover:scale-105 active:scale-95'
            }`}
          >
            {publishing ? 'SALVANDO...' : '💾 SALVAR CONFIGURAÇÕES'}
          </button>

          <div className="glass p-5 rounded-2xl border border-blue-500/20 bg-blue-950/20">
            <p className="text-xs text-blue-300 font-bold mb-3 flex items-center gap-2">
              <Info className="w-3 h-3" /> Por que usar Cloud?
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Com o script dinâmico, você só precisa instalar o código na Nuvemshop <b>uma única vez</b>. 
              Depois, qualquer mudança de WhatsApp ou Status feita aqui salva no servidor e atualiza sua loja na hora!
            </p>
          </div>
        </div>

        {/* Console / Publicação */}
        <div className="lg:col-span-3">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
                  <ExternalLink className="text-blue-400" size={20} />
                  Instalação Manual do Código
                </h3>
                <p className="text-sm text-slate-400">
                  A API da Nuvemshop bloqueou atualizações automáticas de scripts não credenciados no Portal de Parceiros por motivos de segurança (Erro 422: script_id missing). 
                  Por favor, <strong className="text-white">copie o código abaixo</strong> e cole-o no seu painel Nuvemshop indo em: 
                  <br />
                  <span className="text-blue-300 font-mono text-xs block mt-2">Configurações {'>'} Códigos Externos {'>'} Códigos de Rastreamento</span>
                </p>
              </div>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm transition-all shadow-lg ${
                  copied 
                    ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                    : 'bg-blue-600 hover:bg-blue-500 text-white hover:scale-105 active:scale-95'
                }`}
              >
                {copied ? <CheckCheck size={18} /> : <Copy size={18} />}
                {copied ? 'COPIADO!' : 'COPIAR CÓDIGO'}
              </button>
            </div>

            <div className="flex-1 bg-slate-950/80 border border-slate-800/50 rounded-xl p-6 font-mono relative group">
              <p className="text-xs text-blue-400 mb-4">// Cole este código no final da aba de Códigos Externos:</p>
              <code className="text-[12px] text-slate-300 break-all leading-relaxed">
                {snippet}
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScriptManager;

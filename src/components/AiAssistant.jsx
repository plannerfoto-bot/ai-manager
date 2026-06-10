import React, { useState, useEffect } from 'react';
import { Sparkles, Key, X, BrainCircuit, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { GoogleGenAI } from '@google/genai';

const AiAssistant = ({ profitData, sim2Results, sim2CartValue }) => {
  const [isOpen, setIsOpen] = useState(false);
  const defaultKey = 'AQ.Ab8RN6Iy5t' + 'bn25S2YYcGTAlnzhTX8Nt-U652gsEzCGRUxnp1oQ';
  const [apiKey, setApiKey] = useState(defaultKey);
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState('');

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  const saveKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('gemini_api_key', apiKey.trim());
      setIsEditingKey(false);
    }
  };

  const clearKey = () => {
    localStorage.removeItem('gemini_api_key');
    setApiKey('');
    setIsEditingKey(true);
  };

  const analyzeData = async () => {
    if (!apiKey) return;
    
    setIsLoading(true);
    setResponse('');
    
    try {
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
      
      const prompt = `
Você é um consultor financeiro e especialista em e-commerce (focado em Nuvemshop).
Seu objetivo é analisar os dados reais de vendas e a projeção de uma promoção de parcelamento sem juros, e fornecer um feedback estratégico, ideias de promoção, e análises de viabilidade.

Aqui estão os dados financeiros do período selecionado:
- Faturamento Total (Real): R$ ${profitData?.totalRevenue?.toFixed(2) || 0}
- Lucro Total (Real): R$ ${profitData?.totalProfit?.toFixed(2) || 0}
- Quantidade de Vendas: ${profitData?.orders?.length || 0}
- Ticket Médio: R$ ${profitData?.averageTicket?.toFixed(2) || 0}

Dados da Projeção de Parcelamento Sem Juros (Simulador):
- Se oferecer ${sim2Results?.sim2Installments || 3}x sem juros para carrinhos acima de R$ ${sim2CartValue || 0}.
- Custo extra absorvido pela loja: R$ ${sim2Results?.baseExtraFeeCost?.toFixed(2) || 0}
- Vendas extras estimadas pelo lojista: +${sim2Results?.sim2ExtraSales || 0} vendas
- Novo Lucro Líquido Projetado: R$ ${sim2Results?.projectedProfit?.toFixed(2) || 0}
- Lucro Adicional Limpo (vs Realidade): R$ ${sim2Results?.projectedProfitDifference?.toFixed(2) || 0}
- Ponto de Equilíbrio (Break-Even): Precisa de +${sim2Results?.breakEvenSalesNeeded || 0} vendas extras só para pagar o custo dos juros.

Com base nesses dados, escreva um feedback em português do Brasil, usando formatação Markdown (negritos, listas, etc).
Seja direto, profissional, mas encorajador.
Divida sua resposta em:
1. **Diagnóstico da Realidade**: Um breve comentário sobre o cenário atual.
2. **Análise da Projeção**: Vale a pena oferecer esse parcelamento com essa estimativa de vendas? O ponto de equilíbrio é alcançável?
3. **Ideias de Promoção**: Sugira 2 a 3 ideias criativas e práticas para o lojista realmente conseguir atingir ou superar essa meta de novas vendas usando o argumento do "parcelamento sem juros".
`;

      const geminiResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      setResponse(geminiResponse.text);
    } catch (error) {
      console.error(error);
      setResponse(`**Erro ao analisar os dados.**\n\nVerifique se sua chave de API é válida e se você tem conexão com a internet.\n\nDetalhes do erro: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Botão Flutuante */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-5 py-3 rounded-full font-bold shadow-xl shadow-purple-900/50 transition-all hover:scale-105 active:scale-95 group"
      >
        <Sparkles size={20} className="text-purple-200 group-hover:animate-pulse" />
        <span>Consultor IA</span>
      </button>

      {/* Modal/Painel Lateral */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            
            <motion.div
              initial={{ x: '100%', opacity: 0.5 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.5 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-lg bg-[var(--surface-base)] border-l border-[var(--border-soft)] z-50 shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-[var(--border-soft)] bg-gradient-to-br from-purple-900/20 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-xl text-purple-400">
                    <BrainCircuit size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Consultor IA</h2>
                    <p className="text-xs text-[var(--text-muted)]">Insights estratégicos gratuitos via Gemini</p>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-2 text-[var(--text-muted)] hover:text-white bg-[var(--surface-input)] hover:bg-[var(--surface-card)] rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                
                {/* Configuração da Chave API */}
                {isEditingKey ? (
                  <div className="bg-[var(--surface-card)] border border-[var(--border-soft)] rounded-xl p-5 mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Key size={18} className="text-amber-500" />
                      <h3 className="font-bold text-[var(--text-primary)]">Configurar API Gratuita</h3>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] mb-4">
                      Para usar a Inteligência Artificial gratuitamente, gere uma chave no <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-purple-400 hover:text-purple-300 underline">Google AI Studio</a> e cole abaixo. Ela ficará salva apenas no seu navegador.
                    </p>
                    <div className="flex gap-2">
                      <input 
                        type="password" 
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="flex-1 bg-[var(--surface-input)] border border-[var(--border-soft)] rounded-lg px-3 py-2 text-white outline-none focus:border-purple-500"
                      />
                      <button onClick={saveKey} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-semibold transition-colors">
                        Salvar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-emerald-400">IA Conectada e Pronta</span>
                    </div>
                    <button onClick={clearKey} className="text-xs text-[var(--text-muted)] hover:text-white underline">
                      Trocar Chave
                    </button>
                  </div>
                )}

                {/* Área de Ação e Resposta */}
                {!isEditingKey && (
                  <div className="flex flex-col h-full">
                    {!response && !isLoading && (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-70">
                        <Sparkles size={48} className="text-[var(--text-muted)] mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-2">Pronto para analisar?</h3>
                        <p className="text-sm text-[var(--text-secondary)] mb-6">
                          Vou ler todos os dados reais e as simulações que você configurou na tela para te dar um plano de ação.
                        </p>
                        <button 
                          onClick={analyzeData}
                          className="w-full py-4 bg-[var(--surface-card)] hover:bg-[var(--surface-input)] border border-[var(--border-soft)] hover:border-purple-500/50 rounded-xl font-bold text-purple-400 transition-all flex items-center justify-center gap-2"
                        >
                          <BrainCircuit size={20} />
                          Gerar Análise Completa
                        </button>
                      </div>
                    )}

                    {isLoading && (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 size={32} className="text-purple-500 animate-spin mb-4" />
                        <p className="text-[var(--text-secondary)] animate-pulse">Lendo seus resultados e pensando...</p>
                      </div>
                    )}

                    {response && !isLoading && (
                      <div className="prose prose-invert prose-purple max-w-none pb-8">
                        <ReactMarkdown>{response}</ReactMarkdown>
                        
                        <button 
                          onClick={analyzeData}
                          className="mt-8 w-full py-3 bg-[var(--surface-input)] hover:bg-[var(--surface-card)] border border-[var(--border-soft)] rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2"
                        >
                          <Sparkles size={16} />
                          Analisar Novamente
                        </button>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default AiAssistant;

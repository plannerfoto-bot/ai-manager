import React, { useState } from 'react';
import { 
  Sparkles, 
  Wand2, 
  Save, 
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import Card from '../components/atoms/Card';
import Button from '../components/atoms/Button';
import Input from '../components/atoms/Input';

const AICreator = ({ onGenerate, onSave, status }) => {
  const [concept, setConcept] = useState('');
  const [visualAnalysis, setVisualAnalysis] = useState('');
  const [aiResult, setAiResult] = useState(null);

  const handleGenerate = async () => {
    if (!concept) return;
    const result = await onGenerate(concept, visualAnalysis);
    setAiResult(result);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600/10 text-blue-500 rounded-full text-xs font-bold uppercase tracking-wider">
          <Sparkles size={12} />
          Tecnologia AIOX 5.0
        </div>
        <h2 className="text-4xl font-bold text-white tracking-tight">IA Creator</h2>
        <p className="text-slate-400">Gere SEO e descrições irresistíveis usando inteligência artificial</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Conceito do Produto" subtitle="O que você está criando?">
          <div className="space-y-4">
            <Input 
              label="Nome Base ou Ideia"
              placeholder="Ex: Caneca de cerâmica gamer"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
            />
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Análise Visual (IA Vision)</label>
              <textarea 
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 min-h-[120px]"
                placeholder="Descreva a imagem ou arraste um arquivo... (IA analisará o padrão visual)"
                value={visualAnalysis}
                onChange={(e) => setVisualAnalysis(e.target.value)}
              />
            </div>
            <Button 
              className="w-full" 
              onClick={handleGenerate}
              disabled={!concept || status === 'loading'}
            >
              {status === 'loading' ? 'Processando...' : 'Gerar Título e Descrição'}
              <Wand2 size={18} />
            </Button>
          </div>
        </Card>

        <Card title="Resultado Sugerido" subtitle="Gerado com foco em conversão e SEO">
          {aiResult ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="p-4 bg-blue-600/5 border border-blue-500/20 rounded-xl">
                <p className="text-xs text-blue-400 font-bold uppercase mb-1">Título SEO</p>
                <p className="text-white font-semibold">{aiResult.name}</p>
              </div>
              <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Descrição Profissional</p>
                <p className="text-slate-200 text-sm leading-relaxed">{aiResult.description}</p>
              </div>
              <Button 
                variant="primary" 
                className="w-full"
                onClick={() => onSave(aiResult)}
              >
                Publicar na Nuvemshop
                <Save size={18} />
              </Button>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-10 opacity-30 text-center">
              <ImageIcon size={48} className="mb-4" />
              <p className="text-sm">Aguardando dados para geração...</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AICreator;

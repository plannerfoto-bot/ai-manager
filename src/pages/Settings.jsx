import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings as SettingsIcon, Save, RefreshCw, Scissors, DollarSign } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3001' 
  : 'https://ai-manager-nuvemshop.onrender.com';

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    finance: {
      bobina120g: 22.50,
      bobina160g: 24.70,
      bobinaEspecial: 24.90,
      costuraOverloque: 4.00,
      costuraEmenda: 13.00,
      costuraEspecial: 6.00
    },
    commissions: {
      valorFixo: 50.00
    }
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/settings`);
      setSettings(res.data);
    } catch (error) {
      toast.error('Erro ao carregar configurações.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await axios.post(`${API_BASE_URL}/api/settings`, settings);
      toast.success('Configurações salvas e aplicadas!');
    } catch (error) {
      toast.error('Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (section, field, value) => {
    const numValue = parseFloat(value) || 0;
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: numValue
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-emerald-400" />
            Configurações do Sistema
          </h1>
          <p className="text-[var(--text-muted)] mt-1">Gerencie os custos bases de produção e taxas de comissão.</p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-[var(--text-primary)] font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Salvar Alterações
        </button>
      </div>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CARD: Custos de Bobina */}
        <motion.div variants={itemVariants} className="bg-[var(--surface-glass)]/50 border border-[var(--border-soft)] rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-40 h-40 btn-primary/10 blur-3xl rounded-full group-hover:btn-primary/20 transition-all duration-500" />
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 btn-primary/20 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Custos de Bobina (por Metro)</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Tecido 120g Padrão</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">R$</span>
                <input 
                  type="number" step="0.01" 
                  className="w-full bg-slate-950 border border-[var(--border-soft)] rounded-xl py-3 pl-10 pr-4 text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  value={settings.finance.bobina120g}
                  onChange={(e) => handleChange('finance', 'bobina120g', e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Tecido 160g Padrão</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">R$</span>
                <input 
                  type="number" step="0.01" 
                  className="w-full bg-slate-950 border border-[var(--border-soft)] rounded-xl py-3 pl-10 pr-4 text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  value={settings.finance.bobina160g}
                  onChange={(e) => handleChange('finance', 'bobina160g', e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Tecido 120g Especial (Painéis c/ mais de 1.70m)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">R$</span>
                <input 
                  type="number" step="0.01" 
                  className="w-full bg-slate-950 border border-[var(--border-soft)] rounded-xl py-3 pl-10 pr-4 text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  value={settings.finance.bobinaEspecial}
                  onChange={(e) => handleChange('finance', 'bobinaEspecial', e.target.value)}
                />
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">Neste caso, a conta é feita em Metros Quadrados (m²) ao invés de linear.</p>
            </div>
          </div>
        </motion.div>

        {/* CARD: Custos de Costura */}
        <motion.div variants={itemVariants} className="bg-[var(--surface-glass)]/50 border border-[var(--border-soft)] rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-violet-500/10 blur-3xl rounded-full group-hover:bg-violet-500/20 transition-all duration-500" />
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-violet-500/20 rounded-xl flex items-center justify-center">
              <Scissors className="w-5 h-5 text-violet-400" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Custos de Costura (por Unidade)</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Overloque Padrão</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">R$</span>
                <input 
                  type="number" step="0.01" 
                  className="w-full bg-slate-950 border border-[var(--border-soft)] rounded-xl py-3 pl-10 pr-4 text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  value={settings.finance.costuraOverloque}
                  onChange={(e) => handleChange('finance', 'costuraOverloque', e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Emendas (Ambas medidas &gt;= 1.70m)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">R$</span>
                <input 
                  type="number" step="0.01" 
                  className="w-full bg-slate-950 border border-[var(--border-soft)] rounded-xl py-3 pl-10 pr-4 text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  value={settings.finance.costuraEmenda}
                  onChange={(e) => handleChange('finance', 'costuraEmenda', e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Overloque Especial (Painéis c/ mais de 1.70m mas sem emenda)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">R$</span>
                <input 
                  type="number" step="0.01" 
                  className="w-full bg-slate-950 border border-[var(--border-soft)] rounded-xl py-3 pl-10 pr-4 text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  value={settings.finance.costuraEspecial}
                  onChange={(e) => handleChange('finance', 'costuraEspecial', e.target.value)}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* CARD: Comissões */}
        <motion.div variants={itemVariants} className="bg-[var(--surface-glass)]/50 border border-[var(--border-soft)] rounded-3xl p-6 relative overflow-hidden group md:col-span-1 lg:col-span-2">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 blur-3xl rounded-full group-hover:bg-emerald-500/20 transition-all duration-500" />
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Taxa de Comissão (Parceiros)</h2>
          </div>
          
          <div className="max-w-md">
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Valor Fixo Pago por Unidade (R$)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">R$</span>
              <input 
                type="number" step="0.01" 
                className="w-full bg-slate-950 border border-[var(--border-soft)] rounded-xl py-3 pl-10 pr-4 text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                value={settings.commissions.valorFixo}
                onChange={(e) => handleChange('commissions', 'valorFixo', e.target.value)}
              />
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2">Este valor será utilizado para calcular as comissões devidas no menu "Comissões & Financeiro".</p>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
};

export default Settings;

import React, { useState, useEffect, useRef } from 'react';
import { HardDrive, TerminalSquare, LayoutGrid, CheckCircle2, Database, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

// ==========================================
// WORKSPACE COMPONENT (Personagem 2.5D Animado de Verdade)
// ==========================================
function WorkerDesk({ name, active, latestLog, color, facing, badgeIcon: BadgeIcon }) {
  let speech = "...";
  if (latestLog) {
    if (name === "Motor NuvemShop") {
       if (latestLog.includes('Buscando página')) speech = "Acessando os arquivos antigos na NuvemShop...";
       else if (latestLog.includes('Salvando')) speech = "Anotando no caderninho (BD)! 📝";
       else if (latestLog.includes('Rate limit')) speech = "Eles me bloquearam! Fui rápido demais! 🏃💨";
       else if (latestLog.includes('concluída')) speech = "Limpei tudo, chefe! Pode mandar mais! 🧹✨";
       else if (latestLog.includes('Vazio')) speech = "Essa pasta tava vazia... que deprê. 🕷️";
       else if (latestLog.includes('Erro')) speech = "Deu ruim! Bateu no servidor e voltou... 🚑";
       else speech = "Lendo a fita K7 dos seus produtos... 📼";
    } else {
       // SEO
       if (latestLog.includes('Criando SEO')) speech = "Destilando magia marqueteira pro texto! ✨";
       else if (latestLog.includes('Salvando')) speech = "Escrevendo um poema no banco de dados! ✒️";
       else if (latestLog.includes('Rate limit')) speech = "ChatGPT pediu arrego! Respirando... 🧘‍♀️";
       else if (latestLog.includes('Atualizando')) speech = "Botando brilho nas palavras! 💎";
       else if (latestLog.includes('Buscando')) speech = "Me dá logo esse produto pra eu enfeitar! 🎨";
       else if (latestLog.includes('Erro')) speech = "O cérebro digital pifou. Rebota, pelo amor! 💥";
       else if (latestLog.includes('concluída')) speech = "Terminei a poesia aqui, patrão! 🥂";
       else speech = "Canalizando a criatividade infinita do Universo! 🌌";
    }
  }

  // Define um deslocamento (offset) baseado no sentido do boneco para não cobrir o rosto
  const bubbleOffset = facing === 'left' ? { left: '-120px', top: '-110px' } : { right: '-100px', top: '-110px' };

  return (
    <div className={`desk-container ${facing}`}>
      
      {/* HUD: Base Iluminada Isométrica no chão */}
      <div className="iso-base-glow" style={{ background: `radial-gradient(circle, ${color}55 0%, transparent 60%)` }}></div>
      
      {/* BALÃO DE FALA (HUD Flutuante e Deslocado) */}
      <div className="virtual-head-anchor" style={{ position: 'absolute', zIndex: 50, ...bubbleOffset }}>
         <div className="speech-bubble-wrapper" style={{ position: 'relative', width: 220 }}>
            <AnimatePresence>
               {active && latestLog && (
                 <motion.div 
                   className="clear-speech-bubble"
                   initial={{ opacity: 0, scale: 0.8, y: 10 }}
                   animate={{ opacity: 1, scale: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.9, y: 5 }}
                   transition={{ type: "spring", stiffness: 300, damping: 20 }}
                   key={speech}
                   style={{ borderColor: color, color: '#1e293b', fontSize: '14px', lineHeight: '1.4' }}
                 >
                   {speech}
                   {/* setinha do balão com base na pose */}
                   <div style={{
                     position: 'absolute',
                     bottom: '-12px',
                     [facing === 'left' ? 'right' : 'left']: '40px',
                     borderWidth: '12px 12px 0 12px',
                     borderStyle: 'solid',
                     borderColor: `${color} transparent transparent transparent`,
                   }}></div>
                   {/* miolo da setinha */}
                   <div style={{
                     position: 'absolute',
                     bottom: '-8px',
                     [facing === 'left' ? 'right' : 'left']: '42px',
                     borderWidth: '10px 10px 0 10px',
                     borderStyle: 'solid',
                     borderColor: `#fff transparent transparent transparent`,
                   }}></div>
                 </motion.div>
               )}
            </AnimatePresence>
         </div>

         {/* EFEITOS DE SONO (Qdo inativo) */}
         {!active && (
            <div className="sleeping-fx">
               <motion.div animate={{ opacity: [0, 1, 0], y: [0, -20] }} transition={{ repeat: Infinity, duration: 2 }} style={{ color: '#64748b', fontWeight: 'bold', fontSize: 18 }}>Zzz...</motion.div>
            </div>
         )}
      </div>

      {/* BONECO 2.5D DESENHADO PURAMENTE EM REACT/CSS! */}
      <div style={{ position: 'relative', width: 140, height: 160, zIndex: 10, filter: 'drop-shadow(0 20px 20px rgba(0,0,0,0.5))' }}>
        
        {/* Corpo Bouncing */}
        <motion.div
          animate={active ? { y: [0, -2, 0] } : { y: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: active ? 0.3 : 3 }}
          style={{ position: 'absolute', bottom: 20, left: 30, width: 80, height: 90, background: color, borderRadius: '40px 40px 10px 10px', boxShadow: 'inset -5px -5px 15px rgba(0,0,0,0.4)', zIndex: 1 }}
        >
          {/* Cabeça */}
          <div style={{ position: 'absolute', top: -45, left: 10, width: 60, height: 60, background: '#f8fafc', borderRadius: '50%', border: '4px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 5px 10px rgba(0,0,0,0.2)' }}>
             {/* Olhinhos Blink */}
             <motion.div style={{ display: 'flex', gap: 10 }}>
                <motion.div animate={active ? { scaleY: [1, 1, 0.1, 1] } : { scaleY: [1, 0.1, 1], transition: { duration: 3, repeat: Infinity }}} transition={{ repeat: Infinity, duration: 4, times: [0, 0.9, 0.95, 1] }} style={{ width: 8, height: 14, background: '#1e293b', borderRadius: 4 }} />
                <motion.div animate={active ? { scaleY: [1, 1, 0.1, 1] } : { scaleY: [1, 0.1, 1], transition: { duration: 3, repeat: Infinity }}} transition={{ repeat: Infinity, duration: 4, times: [0, 0.9, 0.95, 1] }} style={{ width: 8, height: 14, background: '#1e293b', borderRadius: 4 }} />
             </motion.div>
          </div>
        </motion.div>

        {/* Mesa Cilíndrica Futuristic */}
        <div style={{ position: 'absolute', bottom: 0, left: -20, width: 180, height: 60, background: '#1e293b', borderRadius: '10px 10px 30px 30px', borderTop: '4px solid #334155', display: 'flex', justifyContent: 'center', zIndex: 5, boxShadow: '0 10px 20px rgba(0,0,0,0.5)' }}>
           
           {/* Tela (Glowing quando Ativo) */}
           <div style={{ position: 'absolute', top: -35, width: 100, height: 65, background: '#0f172a', borderRadius: 8, border: '4px solid #334155', overflow: 'hidden' }}>
              {active && <motion.div animate={{ opacity: [0.1, 0.4] }} transition={{ repeat: Infinity, alternate: true, duration: 0.5 }} style={{ width: '100%', height: '100%', background: color }} />}
           </div>
           
           {/* Teclado Isométrico */}
           <div style={{ position: 'absolute', top: 5, width: 80, height: 20, background: '#0f172a', borderRadius: 4, transform: 'perspective(100px) rotateX(40deg)' }}>
              {active && <motion.div animate={{ opacity: [0, 0.5, 0] }} transition={{ repeat: Infinity, duration: 0.15 }} style={{ width: '100%', height: '100%', background: color, borderRadius: 4 }} />}
           </div>
           
           {/* Partículas voando do teclado */}
           {active && (
            <div className="typing-fx" style={{ zIndex: 20 }}>
               <motion.div animate={{ opacity: [0, 1, 0], y: [0, -20], x: [0, 10] }} transition={{ repeat: Infinity, duration: 0.6 }} className="fx-spark" style={{ background: color }}/>
               <motion.div animate={{ opacity: [0, 1, 0], y: [0, -30], x: [0, -15] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }} className="fx-spark" style={{ background: color }}/>
               <motion.div animate={{ opacity: [0, 1, 0], y: [0, -25], x: [0, 20] }} transition={{ repeat: Infinity, duration: 0.5, delay: 0.4 }} className="fx-spark" style={{ background: color }}/>
            </div>
           )}
        </div>

        {/* Mão Dinâmica Esquerda */}
        <motion.div
          animate={active ? { y: [0, -15, 0] } : { y: 0 }}
          transition={{ repeat: Infinity, duration: 0.15, ease: "linear" }}
          style={{ position: 'absolute', bottom: 35, left: 20, width: 24, height: 24, background: color, borderRadius: '50%', border: '4px solid #1e293b', zIndex: 10 }}
        />

        {/* Mão Dinâmica Direita */}
        <motion.div
          animate={active ? { y: [-15, 0, -15] } : { y: 0 }}
          transition={{ repeat: Infinity, duration: 0.15, ease: "linear" }}
          style={{ position: 'absolute', bottom: 35, right: 20, width: 24, height: 24, background: color, borderRadius: '50%', border: '4px solid #1e293b', zIndex: 10 }}
        />
      </div>

      <div className="desk-badge" style={{ marginTop: '20px' }}>
        <div className={`status-led ${active ? 'led-on' : ''}`} style={{ backgroundColor: color }}></div>
        <BadgeIcon size={18} color={color} />
        <span className="desk-name" style={{ color: '#0f172a' }}>{name}</span>
      </div>
    </div>
  );
}

// ==========================================
// APLICAÇÃO PRINCIPAL
// ==========================================
function App() {
  const [logs, setLogs] = useState({ sync: [], seo: [], totalProducts: 14500 });
  const logSyncRef = useRef(null);
  const logSeoRef = useRef(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch('http://localhost:3001/logs');
        const data = await response.json();
        setLogs(data);
      } catch (err) {
        // Silently retry or handle error
      }
    };

    const interval = setInterval(fetchLogs, 1000);
    return () => clearInterval(interval);
  }, []);

  const syncLogs = logs.sync || [];
  const seoLogs = logs.seo || [];

  useEffect(() => {
    if (logSyncRef.current) logSyncRef.current.scrollTop = logSyncRef.current.scrollHeight;
    if (logSeoRef.current) logSeoRef.current.scrollTop = logSeoRef.current.scrollHeight;
  }, [syncLogs, seoLogs]);
  
  const getPage = (arr) => {
    const pageLog = [...arr].reverse().find(l => l.includes('Buscando página'));
    if (!pageLog) return 0;
    const match = pageLog.match(/página (\d+)/);
    return match ? parseInt(match[1]) : 0;
  };

  const syncPage = getPage(syncLogs);
  
  // Métricas de Progresso Real-time
  const totalProducts = logs.totalProducts || 14991;
  const safeProcessed = logs.metrics ? Math.min(logs.metrics.syncProcessedCount, totalProducts) : 0;
  const seoProcessosSalvos = logs.metrics ? logs.metrics.seoProcessedCount : 0;
  
  const remainingProducts = Math.max(0, totalProducts - safeProcessed);
  const progressPercent = Math.min(100, (safeProcessed / totalProducts) * 100).toFixed(1);

  // Páginas
  const totalPages = logs.metrics?.totalPages || 300;
  const metadataPage = logs.metrics?.metadataPage || 1;
  const seoPage = logs.metrics?.seoPage || 1;
  const metadataPagesLeft = logs.metrics?.metadataPagesLeft || 0;
  const seoPagesLeft = logs.metrics?.seoPagesLeft || 0;

  const isSyncActive = syncLogs.length > 0 && !syncLogs[syncLogs.length - 1].includes('concluída');
  const isSeoActive = seoLogs.length > 0 && !seoLogs[seoLogs.length - 1].includes('concluída');

  return (
    <div className="bright-office">
      
      {/* 1. TOPO: PAINEL DE CONTROLE CLEAN E INFORMATIVO */}
      <header className="clean-header">
        <div className="ch-title">
          <LayoutGrid size={28} color="#4f46e5" />
          <h1>CENTRAL DE OPERAÇÕES • CLOTH SUBLIMAÇÃO</h1>
        </div>

        <div className="ch-metrics">
          <div className="cbox">
             <span className="c-label">Produtos Lidos (BD Local)</span>
             <span className="c-val" style={{ color: '#10b981' }}>{safeProcessed} / {totalProducts}</span>
          </div>
          <div className="cbox">
             <span className="c-label">Páginas Faltantes (Sync)</span>
             <span className="c-val" style={{ color: '#10b981' }}>{metadataPagesLeft} de {totalPages}</span>
             <div className="mini-progress"><div className="mf" style={{ width: `${(metadataPage/totalPages)*100}%`, backgroundColor: '#10b981' }}></div></div>
          </div>
          <div className="cbox">
             <span className="c-label">Páginas Faltantes (SEO)</span>
             <span className="c-val" style={{ color: '#f43f5e' }}>{seoPagesLeft} de {totalPages}</span>
             <div className="mini-progress"><div className="mf" style={{ width: `${(seoPage/totalPages)*100}%`, backgroundColor: '#f43f5e' }}></div></div>
          </div>
          <div className="cbox" style={{ background: 'rgba(79, 70, 229, 0.1)' }}>
             <span className="c-label">SEO Atualizados</span>
             <span className="c-val" style={{ color: '#4f46e5' }}>~{seoProcessosSalvos}</span>
          </div>
        </div>

        <div className="ch-progress-bar">
          <div className="ch-progress-fill" style={{ width: `${progressPercent}%` }}></div>
          <div className="ch-progress-text">{progressPercent}% do Catálogo Mapeado no Banco de Dados</div>
        </div>
      </header>

      {/* 2. ÁREA DOS PERSONAGENS */}
      <div className="bright-stage">
        
        {/* ESQUERDA: WORKER DO SYNC */}
        <WorkerDesk 
          name="Motor NuvemShop" 
          active={isSyncActive} 
          latestLog={syncLogs[syncLogs.length - 1]} 
          color="#10b981"
          facing="left"
          badgeIcon={Database}
        />

        {/* DIREITA: WORKER DO SEO */}
        <WorkerDesk 
          name="Motor SEO IA" 
          active={isSeoActive} 
          latestLog={seoLogs[seoLogs.length - 1]} 
          color="#f43f5e"
          facing="right"
          badgeIcon={Bot}
        />
        
      </div>

      {/* 3. RODAPÉ: OS TERMINAIS CODE-LIKE */}
      <footer className="clean-terminals">
        <div className="term box-shadow-soft">
          <div className="term-head" style={{ borderBottom: '3px solid #3b82f6' }}>
            <span className="term-pill bg-blue">DADOS BRUTOS</span> 
            Log do Agente de Metadados
          </div>
          <div className="term-body" ref={logSyncRef}>
            {syncLogs.slice(-25).map((l, i) => <div key={i} className="log-line text-blue-300">{l}</div>)}
          </div>
        </div>

        <div className="term box-shadow-soft">
          <div className="term-head" style={{ borderBottom: '3px solid #e11d48' }}>
            <span className="term-pill bg-red">INTELIGÊNCIA</span> 
            Log do Agente de SEO
          </div>
          <div className="term-body" ref={logSeoRef}>
            {seoLogs.slice(-25).map((l, i) => <div key={i} className="log-line text-red-300">{l}</div>)}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

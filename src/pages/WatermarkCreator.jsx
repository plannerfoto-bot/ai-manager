import React, { useState, useEffect, useRef } from 'react';
import { 
  UploadCloud, 
  Trash2, 
  Download, 
  Sparkles, 
  Loader2, 
  Grid, 
  FileImage,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import JSZip from 'jszip';
import toast from 'react-hot-toast';

// Fontes das imagens padrão no diretório public
const WATERMARKS = [
  {
    id: 'aline_martins',
    name: 'Aline Martins + Cloth',
    url: '/watermark_aline_martins.png',
    desc: 'Grade completa contendo ambos os logotipos'
  },
  {
    id: 'cloth',
    name: 'Apenas Cloth Sublimação',
    url: '/watermark_cloth.png',
    desc: 'Grade simplificada contendo apenas o logotipo Cloth'
  }
];

// Componente de pré-visualização dinâmica individual com marca d'água (declarado fora para evitar desmontar e recarregar a cada render do pai)
const ImagePreviewItem = ({ 
  fileObj, 
  selectedWatermark, 
  opacity, 
  setUploadedFiles, 
  removeFile, 
  applyWatermark 
}) => {
  const [previewSrc, setPreviewSrc] = useState('');
  const [itemLoading, setItemLoading] = useState(true);
  
  // Armazena os parâmetros da última renderização para evitar re-processamentos inúteis do Canvas
  const lastRenderProps = useRef({ wmId: '', opacity: 0 });

  useEffect(() => {
    const configChanged = lastRenderProps.current.wmId !== selectedWatermark.id || 
                         lastRenderProps.current.opacity !== opacity;

    // Só executa o processamento do Canvas e reinicia o loading se a configuração de fato mudou 
    // ou se o preview desta imagem específica ainda não foi gerado pela primeira vez.
    if (configChanged || !previewSrc) {
      setItemLoading(true);
      applyWatermark(fileObj, selectedWatermark.id, opacity, 'original')
        .then(res => {
          setPreviewSrc(res);
          setItemLoading(false);
          lastRenderProps.current = { wmId: selectedWatermark.id, opacity };
        })
        .catch(() => {
          setPreviewSrc(fileObj.previewUrl);
          setItemLoading(false);
        });
    }
  }, [fileObj, selectedWatermark, opacity, previewSrc, applyWatermark]);

  return (
    <div className={`relative group glass-panel overflow-hidden border rounded-2xl flex flex-col aspect-square transition-all duration-300 ${
      fileObj.dragged 
        ? 'border-emerald-500/20 shadow-md shadow-emerald-500/5' 
        : 'border-[var(--border-soft)] hover:shadow-xl hover:shadow-[var(--accent-glow)]/10 hover:border-[var(--accent)]/30'
    }`}>
      {/* Badge Verde de "Enviada" para indicar que a imagem já foi arrastada */}
      {fileObj.dragged && (
        <div className="absolute top-3 left-3 bg-emerald-500 text-white text-[10px] font-black tracking-wider uppercase px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg shadow-emerald-500/25 border border-emerald-400/20 z-10 animate-fade-in">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Enviada
        </div>
      )}

      {itemLoading ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950/20 text-slate-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
          <span className="text-xs font-medium">Aplicando grade...</span>
        </div>
      ) : (
        <img 
          src={previewSrc} 
          alt={fileObj.name} 
          draggable="true"
          onDragStart={(e) => {
            const mimeType = "image/jpeg";
            const fileName = fileObj.name.replace(/\.[^/.]+$/, "") + "_grade.jpg";
            const downloadUrl = `${mimeType}:${fileName}:${previewSrc}`;
            e.dataTransfer.setData("DownloadURL", downloadUrl);
          }}
          onDragEnd={() => {
            // Quando o usuário termina de arrastar e solta a imagem com sucesso
            setUploadedFiles(prev => prev.map(f => {
              if (f.id === fileObj.id) {
                return { ...f, dragged: true };
              }
              return f;
            }));
            toast.success(`Foto "${fileObj.name.substring(0, 15)}..." marcada como enviada!`);
          }}
          className={`w-full h-full object-contain bg-slate-950/60 cursor-grab active:cursor-grabbing transition-all duration-300 ${
            fileObj.dragged ? 'opacity-30 grayscale-[30%]' : ''
          }`}
          title={fileObj.dragged ? "Esta foto já foi arrastada!" : "Clique e arraste esta foto direto para a Nuvemshop!"}
        />
      )}
      
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="overflow-hidden mr-2">
          <p className="text-white text-xs font-bold truncate">{fileObj.name}</p>
          <p className="text-slate-300 text-[10px] font-medium">
            {(fileObj.file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
        <button 
          type="button"
          onClick={() => removeFile(fileObj.id, fileObj.previewUrl)}
          className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all duration-200"
          title="Remover imagem"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default function WatermarkCreator({
  uploadedFiles: propUploadedFiles,
  setUploadedFiles: propSetUploadedFiles,
  opacity: propOpacity,
  setOpacity: propSetOpacity,
  selectedWatermark: propSelectedWatermark,
  setSelectedWatermark: propSetSelectedWatermark
}) {
  // Fallbacks locais para manter o componente 100% autônomo se for usado sem props
  const [localFiles, localSetFiles] = useState([]);
  const [localOpacity, localSetOpacity] = useState(0.95); // Padrão 95%
  const [localSelected, localSetSelected] = useState(WATERMARKS[0]);

  const uploadedFiles = propUploadedFiles !== undefined ? propUploadedFiles : localFiles;
  const setUploadedFiles = propSetUploadedFiles !== undefined ? propSetUploadedFiles : localSetFiles;
  const opacity = propOpacity !== undefined ? propOpacity : localOpacity;
  const setOpacity = propSetOpacity !== undefined ? propSetOpacity : localSetOpacity;
  const selectedWatermark = propSelectedWatermark !== undefined ? propSelectedWatermark : localSelected;
  const setSelectedWatermark = propSetSelectedWatermark !== undefined ? propSetSelectedWatermark : localSetSelected;

  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [dragActive, setDragActive] = useState(false);
  
  // Cache de imagens da marca d'água carregadas em memória para evitar recarregar toda vez
  const watermarkCache = useRef({});

  // Efeito para carregar as imagens de marca d'água na memória
  useEffect(() => {
    WATERMARKS.forEach(wm => {
      const img = new Image();
      img.src = wm.url;
      img.onload = () => {
        watermarkCache.current[wm.id] = img;
      };
    });
  }, []);

  // Lida com o arrastar e soltar (Drag and Drop)
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFileList = (files) => {
    const validImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const imageFiles = Array.from(files).filter(file => validImageTypes.includes(file.type));

    if (imageFiles.length === 0) {
      toast.error('Nenhuma imagem válida selecionada (use JPG, PNG ou WebP).');
      return;
    }

    const newFiles = imageFiles.map(file => ({
      id: Math.random().toString(36).substring(2, 9) + Date.now(),
      file,
      name: file.name,
      previewUrl: URL.createObjectURL(file),
      processedPreview: null // Será gerado dinamicamente
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
    toast.success(`${imageFiles.length} imagem(ns) adicionada(s) com sucesso!`);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFileList(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFileList(e.target.files);
    }
  };

  // Remove imagem da lista
  const removeFile = (id, previewUrl) => {
    URL.revokeObjectURL(previewUrl);
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  // Limpa todas as imagens
  const clearAll = () => {
    uploadedFiles.forEach(f => URL.revokeObjectURL(f.previewUrl));
    setUploadedFiles([]);
    toast.success('Lista de imagens limpa!');
  };

  // Fortalece as cores e o canal Alpha da marca d'água em tempo real no Canvas
  const drawProcessedWatermark = (ctx, wmImg, width, height, opVal) => {
    // 1. Cria um canvas temporário do tamanho correto
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // 2. Desenha a marca d'água no canvas temporário
    tempCtx.drawImage(wmImg, 0, 0, width, height);
    
    // 3. Modifica os pixels da marca d'água para clarear os tons de cinza e intensificar o Alpha
    try {
      const imgData = tempCtx.getImageData(0, 0, width, height);
      const data = imgData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i+3];
        if (alpha > 0) {
          // Clareia os canais RGB (torna a grade cinza escura muito mais brilhante e próxima do branco)
          // Multiplicando por 3.5 os pixels cinza claro/escuro ficam extremamente nítidos
          data[i] = Math.min(255, data[i] * 3.5);     // Red
          data[i+1] = Math.min(255, data[i+1] * 3.5); // Green
          data[i+2] = Math.min(255, data[i+2] * 3.5); // Blue
          
          // Aumenta a opacidade das linhas finas/semitransparentes para dar corpo à grade
          data[i+3] = Math.min(255, alpha * 2.0);     // Alpha boost
        }
      }
      tempCtx.putImageData(imgData, 0, 0);
    } catch (e) {
      console.warn("Manipulação de pixels da marca d'água falhou, usando imagem padrão:", e);
    }
    
    // 4. Desenha a marca d'água fortalecida no canvas principal com a opacidade definida no slider
    ctx.globalAlpha = opVal;
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.globalAlpha = 1.0;
  };

  // Desenha a marca d'água em uma imagem e retorna a DataURL processada
  const applyWatermark = (fileObj, wmId, opVal, size = 'original') => {
    return new Promise((resolve, reject) => {
      const originalImg = new Image();
      originalImg.src = fileObj.previewUrl;
      
      originalImg.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Define as dimensões do canvas
        if (size === 'preview') {
          const maxDim = 600;
          let w = originalImg.width;
          let h = originalImg.height;
          
          if (w > h && w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else if (h > maxDim) {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
          canvas.width = w;
          canvas.height = h;
        } else {
          canvas.width = originalImg.width;
          canvas.height = originalImg.height;
        }

        // 1. Desenha a imagem de fundo original do cliente
        ctx.drawImage(originalImg, 0, 0, canvas.width, canvas.height);
        
        // 2. Obtém a imagem da marca d'água do cache
        const wmImg = watermarkCache.current[wmId];
        
        if (wmImg && wmImg.complete) {
          // Aplica o desenho processado e fortalecido da marca d'água
          drawProcessedWatermark(ctx, wmImg, canvas.width, canvas.height, opVal);
          resolve(canvas.toDataURL('image/jpeg', 0.95));
        } else {
          // Se a marca d'água não estiver pronta em cache, carrega-a dinamicamente
          const backupWm = new Image();
          const targetWm = WATERMARKS.find(w => w.id === wmId);
          backupWm.src = targetWm.url;
          
          backupWm.onload = () => {
            drawProcessedWatermark(ctx, backupWm, canvas.width, canvas.height, opVal);
            resolve(canvas.toDataURL('image/jpeg', 0.95));
          };
          
          backupWm.onerror = () => {
            // Se falhar o carregamento da marca d'água, retorna apenas a imagem original
            resolve(canvas.toDataURL('image/jpeg', 1.0));
          };
        }
      };
      
      originalImg.onerror = (err) => {
        reject(err);
      };
    });
  };

  // Lógica principal de download em lote compactado em ZIP
  const downloadAllAsZip = async () => {
    if (uploadedFiles.length === 0) {
      toast.error('Adicione fotos antes de fazer o download.');
      return;
    }

    setProcessing(true);
    setProgress({ current: 0, total: uploadedFiles.length });
    
    try {
      const zip = new JSZip();
      
      for (let i = 0; i < uploadedFiles.length; i++) {
        const fileObj = uploadedFiles[i];
        setProgress({ current: i + 1, total: uploadedFiles.length });
        
        // Aplica a marca d'água na resolução máxima da imagem original
        const dataUrl = await applyWatermark(fileObj, selectedWatermark.id, opacity, 'original');
        
        // Converte dataURL para blob
        const base64Data = dataUrl.split(',')[1];
        
        // Adiciona a imagem tratada ao arquivo zip
        // Preserva o nome do arquivo original mas garante a extensão JPG
        const cleanName = fileObj.name.replace(/\.[^/.]+$/, "") + "_grade.jpg";
        zip.file(cleanName, base64Data, { base64: true });
      }
      
      // Gera o zip final e dispara o download no navegador
      toast.success('Gerando arquivo ZIP de alta qualidade...');
      const content = await zip.generateAsync({ type: 'blob' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `fotos_com_marca_dagua_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Download do ZIP concluído com sucesso!');
    } catch (err) {
      console.error('Erro na exportação para ZIP:', err);
      toast.error('Erro ao gerar arquivo ZIP das imagens.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* ── Cabeçalho Didático ── */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-3">
            <Grid className="text-[var(--accent)] w-8 h-8" />
            Gerador de Marca d'Água em Grade
          </h2>
          <p className="text-[var(--text-muted)] mt-1 font-medium max-w-3xl">
            Faça o upload de várias fotos de uma vez e aplique a grade com logos. Ajuste a opacidade de forma instantânea e baixe tudo pronto em um único arquivo ZIP de alta qualidade.
          </p>
        </div>
        
        {uploadedFiles.length > 0 && (
          <button
            onClick={clearAll}
            disabled={processing}
            className="px-4 py-2 border border-red-500/30 text-red-500 bg-red-500/5 hover:bg-red-500 hover:text-white rounded-xl transition-all duration-300 font-bold text-sm disabled:opacity-50"
          >
            Limpar Todas
          </button>
        )}
      </div>

      {/* ── Seção de Upload e Configuração Lado a Lado ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Painel Esquerdo: Configurações e Ações */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-6 border border-[var(--border-soft)] space-y-6">
            <h3 className="text-lg font-bold text-[var(--text-primary)] border-b border-[var(--border-soft)] pb-3">
              Configurações
            </h3>
            
            {/* Escolha da Marca d'Água */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-[var(--text-primary)] opacity-85 block">
                Escolha a Grade
              </label>
              <div className="space-y-2">
                {WATERMARKS.map(wm => (
                  <button
                    key={wm.id}
                    onClick={() => setSelectedWatermark(wm)}
                    className={`w-full text-left p-3.5 rounded-xl border text-sm transition-all duration-300 ${
                      selectedWatermark.id === wm.id
                        ? 'bg-[var(--accent-glow)] border-[var(--accent)] text-[var(--accent)] shadow-md shadow-[var(--accent-glow)]/10 font-bold'
                        : 'glass-panel border-[var(--border-soft)] hover:bg-[var(--border-soft)] text-[var(--text-primary)] opacity-80'
                    }`}
                  >
                    <div className="font-bold">{wm.name}</div>
                    <div className={`text-xs mt-1 font-medium ${selectedWatermark.id === wm.id ? 'text-[var(--accent)] opacity-80' : 'text-[var(--text-muted)]'}`}>
                      {wm.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Slider de Opacidade */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-[var(--text-primary)] opacity-85">
                  Opacidade da Grade
                </label>
                <span className="text-xs font-black bg-[var(--accent-glow)] text-[var(--accent)] px-2 py-0.5 rounded-md">
                  {Math.round(opacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.95"
                step="0.05"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-full accent-[var(--accent)] bg-slate-800 rounded-lg cursor-pointer h-2"
              />
              <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-medium px-0.5">
                <span>Mais Suave (5%)</span>
                <span>Mais Forte (95%)</span>
              </div>
            </div>

            {/* Botão de Exportação */}
            <button
              onClick={downloadAllAsZip}
              disabled={uploadedFiles.length === 0 || processing}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[var(--accent)] hover:shadow-lg hover:shadow-[var(--accent-glow)] text-white font-bold rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Compactando ZIP ({progress.current}/{progress.total})...</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                  <span>Baixar Fotos com Grade (ZIP)</span>
                </>
              )}
            </button>
            
            {uploadedFiles.length > 0 && (
              <div className="flex gap-2 items-center bg-[var(--accent-glow)]/40 border border-[var(--accent)]/10 text-[var(--accent)] px-4 py-3 rounded-xl text-xs font-bold justify-center">
                <CheckCircle2 className="w-4 h-4 text-[var(--accent)] shrink-0" />
                {uploadedFiles.length} foto(s) prontas para download
              </div>
            )}
          </div>
        </div>

        {/* Painel Direito: Upload e Preview das Fotos */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Zona de Drop e Upload */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`relative rounded-3xl border-2 border-dashed flex flex-col items-center justify-center p-10 text-center cursor-pointer transition-all duration-300 ${
              dragActive 
                ? 'border-[var(--accent)] bg-[var(--accent-glow)]/20 shadow-2xl scale-[1.01]' 
                : 'border-[var(--border-soft)] bg-[var(--surface-glass)] hover:border-[var(--accent)]/45'
            }`}
          >
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileInput}
              id="file-upload-input"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={processing}
            />
            
            <div className="p-4 bg-slate-900/35 rounded-2xl text-[var(--accent)] shadow-inner">
              <UploadCloud className="w-10 h-10 animate-pulse" />
            </div>
            
            <h4 className="text-lg font-bold text-[var(--text-primary)] mt-4">
              Arraste e solte suas imagens aqui
            </h4>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">
              Ou clique para procurar em seu computador (JPG, PNG, WebP)
            </p>
            <div className="flex gap-2 items-center mt-3 text-xs text-[var(--text-muted)] font-medium">
              <FileImage className="w-4 h-4 text-[var(--accent)]" />
              <span>Dica: Você pode selecionar várias imagens de uma só vez.</span>
            </div>
          </div>

          {/* Lista de Imagens / Galeria de Previsualizações */}
          {uploadedFiles.length > 0 ? (
            <div className="glass-panel p-6 border border-[var(--border-soft)] space-y-4">
              <div className="flex justify-between items-center border-b border-[var(--border-soft)] pb-3">
                <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  Pré-visualização do Lote 
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-black bg-slate-800 text-[var(--text-muted)]">
                    {uploadedFiles.length}
                  </span>
                </h3>
                <span className="text-xs text-[var(--accent)] font-bold flex items-center gap-1.5 bg-[var(--accent-glow)] px-3 py-1.5 rounded-lg border border-[var(--accent)]/10">
                  <Sparkles className="w-3.5 h-3.5" />
                  Dica: Arraste a foto do preview direto para o painel de produtos da Nuvemshop!
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {uploadedFiles.map(fileObj => (
                  <ImagePreviewItem 
                    key={fileObj.id} 
                    fileObj={fileObj} 
                    selectedWatermark={selectedWatermark}
                    opacity={opacity}
                    setUploadedFiles={setUploadedFiles}
                    removeFile={removeFile}
                    applyWatermark={applyWatermark}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="glass-panel p-12 border border-[var(--border-soft)] text-center text-[var(--text-muted)] flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-slate-900/30 flex items-center justify-center text-slate-500 mb-3 border border-dashed border-slate-700">
                <FileImage className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-[var(--text-primary)] opacity-75">Nenhuma imagem carregada ainda</p>
              <p className="text-xs text-[var(--text-muted)] mt-1 font-medium max-w-sm">
                As fotos carregadas aparecerão aqui com a marca d'água aplicada para que você veja como ficarão antes do download.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

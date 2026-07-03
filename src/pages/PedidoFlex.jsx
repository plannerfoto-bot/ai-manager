import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Layers, Search, AlertTriangle, CheckCircle2, XCircle, 
  ArrowRight, FileText, RefreshCw, Copy, RotateCcw, ShieldCheck, 
  Clock, Package, User, DollarSign, HelpCircle, CheckSquare
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3001' 
  : 'https://ai-manager-nuvemshop.onrender.com';

const PedidoFlex = () => {
  // Estados Gerais
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pedido localizado
  const [order, setOrder] = useState(null);
  const [selectedLineItem, setSelectedLineItem] = useState(null);
  const [productCatalog, setProductCatalog] = useState(null);
  
  // Troca de Variação
  const [selectedNewVariantId, setSelectedNewVariantId] = useState('');
  const [eligibilityResult, setEligibilityResult] = useState(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [reasanOfChange, setReasonOfChange] = useState('Teste de alteracao controlado do PedidoFlex no AI-Manager');
  
  // Confirmação e Edição
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [simulated, setSimulated] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);
  const [lastApiResult, setLastApiResult] = useState(null);
  
  // Histórico local
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchDiagnostics();
    fetchHistory();
  }, []);

  // 1. Diagnóstico de Integração e Escopos
  const fetchDiagnostics = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/pedido-flex/diagnostics`);
      setDiagnostics(res.data);
    } catch (error) {
      console.error('Erro ao obter diagnóstico de integração:', error);
      toast.error('Erro ao conectar com as APIs de diagnóstico.');
    }
  };

  // 2. Buscar Histórico de Alterações
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/pedido-flex/edits`);
      setHistory(res.data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // 3. Buscar Pedido por ID ou Número Visível
  const handleSearchOrder = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setOrder(null);
    setSelectedLineItem(null);
    setProductCatalog(null);
    setSelectedNewVariantId('');
    setEligibilityResult(null);
    setSimulated(false);
    setSimulationResult(null);
    setLastApiResult(null);

    try {
      const res = await axios.get(`${API_BASE_URL}/api/pedido-flex/orders/search?q=${searchQuery.trim()}`);
      const foundOrder = res.data;
      setOrder(foundOrder);
      toast.success(`Pedido #${foundOrder.number} localizado!`);
      
      // Auto selecionar primeira linha do pedido se houver
      const products = foundOrder.products || foundOrder.line_items || [];
      if (products.length > 0) {
        handleSelectLineItem(products[0], foundOrder);
      }
    } catch (error) {
      console.error('Erro na busca do pedido:', error);
      const errMsg = error.response?.data?.error || 'Pedido não localizado na loja.';
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // 4. Selecionar linha do pedido e buscar o produto no catálogo para variantes
  const handleSelectLineItem = async (lineItem, currentOrder) => {
    setSelectedLineItem(lineItem);
    setProductCatalog(null);
    setSelectedNewVariantId('');
    setEligibilityResult(null);
    setSimulated(false);

    try {
      const res = await axios.get(`${API_BASE_URL}/api/products/${lineItem.product_id}`);
      setProductCatalog(res.data);
    } catch (error) {
      console.error('Erro ao buscar produto do catálogo:', error);
      toast.error('Não foi possível carregar as variações deste produto no catálogo.');
    }
  };

  // 5. Acionar verificação de elegibilidade ao mudar a variante desejada
  useEffect(() => {
    if (!selectedLineItem || !selectedNewVariantId || !order) return;

    const runEligibilityCheck = async () => {
      setCheckingEligibility(true);
      setEligibilityResult(null);
      setSimulated(false);
      
      const payload = {
        oldLineItemId: String(selectedLineItem.id),
        productId: String(selectedLineItem.product_id),
        oldVariantId: String(selectedLineItem.variant_id),
        newVariantId: String(selectedNewVariantId),
        quantity: Number(selectedLineItem.quantity),
        fulfillmentOrderId: String(order.fulfillment_orders?.[0]?.id || '')
      };

      try {
        const res = await axios.post(`${API_BASE_URL}/api/pedido-flex/orders/${order.id}/eligibility`, payload);
        setEligibilityResult(res.data);
      } catch (error) {
        console.error('Erro ao testar elegibilidade:', error);
        toast.error('Erro na análise de elegibilidade.');
      } finally {
        setCheckingEligibility(false);
      }
    };

    runEligibilityCheck();
  }, [selectedNewVariantId, selectedLineItem, order]);

  // 6. Modo Simulação
  const handleSimulate = async () => {
    if (!order || !selectedLineItem || !selectedNewVariantId) return;

    setLoading(true);
    setLastApiResult(null);
    
    const payload = {
      oldLineItemId: String(selectedLineItem.id),
      productId: String(selectedLineItem.product_id),
      oldVariantId: String(selectedLineItem.variant_id),
      newVariantId: String(selectedNewVariantId),
      quantity: Number(selectedLineItem.quantity),
      fulfillmentOrderId: String(order.fulfillment_orders?.[0]?.id || '')
    };

    try {
      const res = await axios.post(`${API_BASE_URL}/api/pedido-flex/orders/${order.id}/simulate`, payload);
      setSimulationResult(res.data);
      setSimulated(true);
      toast.success('Simulação concluída com sucesso!');
      fetchHistory();
    } catch (error) {
      console.error('Erro na simulação:', error);
      toast.error(error.response?.data?.error || 'Erro ao registrar simulação.');
    } finally {
      setLoading(false);
    }
  };

  // 7. Modo Edição Real (POST)
  const handleApplyRealEdit = async () => {
    if (!order || !selectedLineItem || !selectedNewVariantId || !simulated) return;

    // Confirmação por texto
    const expectedConfirmationText = `ALTERAR PEDIDO #${order.number}`;
    if (typedConfirmation.trim() !== expectedConfirmationText) {
      toast.error(`Por favor, digite exatamente a frase: ${expectedConfirmationText}`);
      return;
    }

    if (!termsAccepted) {
      toast.error('Você deve marcar a caixa de consentimento de teste.');
      return;
    }

    setLoading(true);
    setLastApiResult(null);

    const payload = {
      oldLineItemId: String(selectedLineItem.id),
      productId: String(selectedLineItem.product_id),
      oldVariantId: String(selectedLineItem.variant_id),
      newVariantId: String(selectedNewVariantId),
      quantity: Number(selectedLineItem.quantity),
      fulfillmentOrderId: String(order.fulfillment_orders?.[0]?.id || '')
    };

    try {
      const res = await axios.post(`${API_BASE_URL}/api/pedido-flex/orders/${order.id}/apply`, payload);
      setLastApiResult(res.data);
      if (res.data.success) {
        toast.success(`Pedido #${order.number} alterado com sucesso!`);
        // Recarregar pedido para mostrar as mudanças
        handleSearchOrder();
      } else {
        toast.error(`Falha no fechamento: ${res.data.reason || 'Resultado inconclusivo.'}`);
      }
      fetchHistory();
    } catch (error) {
      console.error('Erro na aplicação real:', error);
      const errMsg = error.response?.data?.error || 'Erro na comunicação de escrita.';
      toast.error(errMsg);
      setLastApiResult({
        success: false,
        status: 'FAILED',
        errorMsg: errMsg,
        details: error.response?.data
      });
    } finally {
      setLoading(false);
      setTypedConfirmation('');
      setTermsAccepted(false);
    }
  };

  // 8. Reverter Teste Anterior
  const handleRevert = async (editId, orderNumber) => {
    if (!window.confirm(`Tem certeza que deseja reverter o teste do Pedido #${orderNumber}? A variante original será recolocada.`)) return;

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/pedido-flex/edits/${editId}/revert`);
      if (res.data.success) {
        toast.success('Reversão executada com sucesso!');
        fetchHistory();
        if (order && String(order.number) === String(orderNumber)) {
          handleSearchOrder();
        }
      } else {
        toast.error('A reversão falhou ou foi bloqueada.');
      }
    } catch (error) {
      console.error('Erro ao reverter:', error);
      toast.error(error.response?.data?.error || 'Falha ao processar reversão.');
    } finally {
      setLoading(false);
    }
  };

  // 9. Copiar Relatório Técnico para a Área de Transferência
  const copyTechnicalReport = () => {
    const reportObj = {
      timestamp: new Date().toISOString(),
      storeId: diagnostics?.storeId,
      orderId: order?.id,
      orderNumber: order?.number,
      scopes: diagnostics?.scopes,
      eligibilityResult: eligibilityResult,
      simulationPayload: simulationResult?.simulationSnapshot?.conceptPayload,
      lastApiResult: lastApiResult
    };

    navigator.clipboard.writeText(JSON.stringify(reportObj, null, 2));
    toast.success('Relatório técnico copiado para a área de transferência!');
  };

  const hasWriteScope = diagnostics?.scopes?.includes('write_orders');

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-3">
            <Layers className="w-8 h-8 text-indigo-500 animate-pulse" />
            PedidoFlex Beta
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            Painel de testes de modificação e troca de variantes de pedidos ativos na API Unstable da Nuvemshop.
          </p>
        </div>
        <button 
          onClick={fetchDiagnostics}
          className="p-2.5 rounded-xl bg-[var(--surface-glass)] hover:bg-[var(--border-soft)] border border-[var(--border-soft)] text-[var(--text-primary)] transition-all"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Grid Superior: Status da Integração & Checklist de Teste */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Status da Integração */}
        <div className="glass p-6 rounded-2xl border border-[var(--border-soft)] space-y-4">
          <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-500" /> Status da Integração
          </h2>
          {diagnostics ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Loja ID:</span>
                <span className="font-mono text-[var(--text-primary)]">{diagnostics.storeId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Modo de Teste:</span>
                <span className="font-semibold text-emerald-400">Ativo (Simulação)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Edição Real:</span>
                <span className={`font-semibold ${diagnostics.realEditEnabled ? 'text-emerald-400' : 'text-amber-500'}`}>
                  {diagnostics.realEditEnabled ? 'Habilitada (Prod)' : 'Desativada (.env)'}
                </span>
              </div>
              <div className="border-t border-[var(--border-soft)]/50 pt-2 space-y-2">
                <p className="text-xs font-bold text-[var(--text-muted)] uppercase">Escopos Detectados</p>
                <div className="flex flex-wrap gap-1.5">
                  {diagnostics.scopes?.map(scope => (
                    <span key={scope} className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full font-mono">
                      {scope}
                    </span>
                  ))}
                  {diagnostics.scopes?.length === 0 && (
                    <span className="text-xs text-rose-400">Nenhum escopo lido.</span>
                  )}
                </div>
              </div>

              {/* Alerta de Escopo write_orders ausente */}
              {!hasWriteScope && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-500 space-y-1.5">
                  <p className="font-bold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Escopo write_orders Ausente</p>
                  <p>O token atual não possui permissão de escrita de pedidos. Para habilitar:</p>
                  <ol className="list-decimal pl-4 space-y-0.5">
                    <li>Altere os escopos do aplicativo no Console de Parceiros da Nuvemshop.</li>
                    <li>Inclua o escopo `write_orders`.</li>
                    <li>Reautorize o aplicativo para atualizar as credenciais do banco.</li>
                  </ol>
                </div>
              )}
            </div>
          ) : (
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-slate-800 rounded w-2/3"></div>
              <div className="h-4 bg-slate-800 rounded w-1/2"></div>
            </div>
          )}
        </div>

        {/* Guia de Preparação de Pedido de Teste */}
        <div className="glass p-6 rounded-2xl border border-[var(--border-soft)] lg:col-span-2 space-y-3">
          <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-emerald-500" /> Como preparar o pedido de teste perfeito
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            Siga estas premissas para garantir que as validações de elegibilidade do MVP aprovem seu pedido:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-xs text-[var(--text-primary)]">
            <div className="flex items-start gap-1.5"><span className="text-emerald-500 font-bold">✓</span> Crie um produto comum com 2 variantes (Ex: M e G)</div>
            <div className="flex items-start gap-1.5"><span className="text-emerald-500 font-bold">✓</span> Defina o mesmo preço, peso e dimensões nas duas</div>
            <div className="flex items-start gap-1.5"><span className="text-emerald-500 font-bold">✓</span> Adicione estoque disponível em ambas</div>
            <div className="flex items-start gap-1.5"><span className="text-emerald-500 font-bold">✓</span> Crie um pedido com apenas 1 unidade de uma delas</div>
            <div className="flex items-start gap-1.5"><span className="text-emerald-500 font-bold">✓</span> Não aplique cupom nem descontos de promoção</div>
            <div className="flex items-start gap-1.5"><span className="text-emerald-500 font-bold">✓</span> Não empacote nem emita etiqueta do pedido (UNPACKED)</div>
          </div>
        </div>
      </div>

      {/* Seção 2: Localizar Pedido */}
      <div className="glass p-6 rounded-2xl border border-[var(--border-soft)] space-y-4">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Localizar Pedido para Teste</h2>
        <form onSubmit={handleSearchOrder} className="flex gap-3 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-5 h-5 text-[var(--text-muted)]" />
            <input 
              type="text" 
              placeholder="Digite o número visível do pedido ou ID interno..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-glass)] text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 text-sm"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center gap-2 text-sm shadow shadow-indigo-900/40 disabled:opacity-50 transition-all"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Buscar Pedido'}
          </button>
        </form>
      </div>

      {/* Painel do Pedido Localizado */}
      {order && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          
          {/* Esquerda: Resumo do Pedido & Linha do Produto */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Informações Gerais */}
            <div className="glass p-6 rounded-2xl border border-[var(--border-soft)] space-y-4">
              <div className="flex justify-between items-start border-b border-[var(--border-soft)]/50 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)]">Pedido #{order.number}</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">ID Interno: {order.id}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider bg-slate-800 text-[var(--text-primary)]">
                    F.O. packing: {order.fulfillment_orders?.[0]?.packing_status || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-[var(--text-muted)] uppercase font-bold">Cliente</p>
                  <p className="text-[var(--text-primary)] font-medium mt-1">
                    {order.customer?.name ? `${order.customer.name.substring(0, 3)}***` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] uppercase font-bold">Total do Pedido</p>
                  <p className="text-[var(--text-primary)] font-medium mt-1">R$ {parseFloat(order.total || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] uppercase font-bold">Status do Envio</p>
                  <p className="text-[var(--text-primary)] font-medium mt-1">{order.shipping_status || 'unshipped'}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] uppercase font-bold">Status do Pagamento</p>
                  <p className="text-[var(--text-primary)] font-medium mt-1">{order.payment_status || 'paid'}</p>
                </div>
              </div>
            </div>

            {/* Linhas de Itens do Pedido */}
            <div className="glass p-6 rounded-2xl border border-[var(--border-soft)] space-y-4">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Selecione o produto para trocar a variação</h3>
              <div className="space-y-3">
                {(order.products || order.line_items || []).map(item => (
                  <div 
                    key={item.id}
                    onClick={() => handleSelectLineItem(item, order)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between hover:bg-[var(--border-soft)]/20 ${selectedLineItem?.id === item.id ? 'border-indigo-500 bg-indigo-950/10' : 'border-[var(--border-soft)]'}`}
                  >
                    <div className="flex gap-4 items-center">
                      <div className="p-2.5 bg-slate-800 rounded-lg text-[var(--text-muted)]">
                        <Package className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-[var(--text-primary)] text-sm">{item.name}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">SKU: {item.sku || 'N/A'} | ID da Linha: {item.id}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[var(--text-primary)] text-sm">R$ {parseFloat(item.price || 0).toFixed(2)}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">Qtd: {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Escolha da Variante Alternativa */}
            {selectedLineItem && productCatalog && (
              <div className="glass p-6 rounded-2xl border border-[var(--border-soft)] space-y-4">
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Escolha a Variante de Destino</h3>
                <div className="space-y-2 text-sm text-[var(--text-muted)]">
                  <p>Troca autorizada apenas por variante alternativa do **mesmo produto** com **mesmo preço**.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Variante de Destino</label>
                    <select 
                      value={selectedNewVariantId}
                      onChange={(e) => setSelectedNewVariantId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-glass)] text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 text-sm"
                    >
                      <option value="">Selecione a nova variante...</option>
                      {productCatalog.variants?.map(v => {
                        const isOriginal = String(v.id) === String(selectedLineItem.variant_id);
                        return (
                          <option key={v.id} value={v.id} disabled={isOriginal}>
                            {v.values?.map(val => val.pt || val.es || val).join(' / ') || `ID: ${v.id}`} {isOriginal ? '(Atual)' : ''} (Estoque: {v.stock ?? 'Ilimitado'})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Motivo Interno do Fechamento</label>
                    <input 
                      type="text" 
                      value={reasanOfChange}
                      onChange={(e) => setReasonOfChange(e.target.value)}
                      placeholder="Motivo do teste de edição..."
                      className="w-full px-3 py-2.5 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-glass)] text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 text-sm"
                    />
                  </div>
                </div>

                {/* Exibição Comparativa das Variantes */}
                {selectedNewVariantId && (
                  <div className="p-4 bg-[var(--surface-glass)] border border-[var(--border-soft)]/50 rounded-xl grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="font-bold text-[var(--text-muted)] uppercase">Variante Anterior</p>
                      <p className="text-[var(--text-primary)] mt-1 font-semibold">ID: {selectedLineItem.variant_id}</p>
                      <p className="text-[var(--text-muted)]">SKU: {selectedLineItem.sku || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-bold text-indigo-400 uppercase">Variante Nova</p>
                      <p className="text-[var(--text-primary)] mt-1 font-semibold">ID: {selectedNewVariantId}</p>
                      <p className="text-[var(--text-muted)]">
                        SKU: {productCatalog.variants?.find(v => String(v.id) === String(selectedNewVariantId))?.sku || 'N/A'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Direita: Diagnóstico de Elegibilidade & Painel de Aplicação */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Checklist de Elegibilidade */}
            <div className="glass p-6 rounded-2xl border border-[var(--border-soft)] space-y-4">
              <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-500" /> Checklist de Elegibilidade
              </h3>
              
              {checkingEligibility ? (
                <div className="flex items-center justify-center py-6 text-sm text-[var(--text-muted)] gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" /> Analisando pedido...
                </div>
              ) : eligibilityResult ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 bg-[var(--surface-glass)] border border-[var(--border-soft)]/50 rounded-xl">
                    {eligibilityResult.isEligible ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                    )}
                    <div className="text-xs">
                      <p className="font-bold text-[var(--text-primary)]">
                        {eligibilityResult.isEligible ? 'Aprovado para Simulação' : 'Pedido Inelegível'}
                      </p>
                      <p className="text-[var(--text-muted)]">
                        {eligibilityResult.isEligible ? 'Todas as validações do MVP passaram.' : 'Corrija os erros listados abaixo.'}
                      </p>
                    </div>
                  </div>

                  <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                    {eligibilityResult.checks?.map((chk, i) => (
                      <div key={i} className="p-2 border border-[var(--border-soft)]/40 rounded-lg text-xs space-y-0.5">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-[var(--text-primary)]">{chk.name}</span>
                          <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${chk.approved ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                            {chk.approved ? 'Aprovado' : 'Bloqueado'}
                          </span>
                        </div>
                        {chk.valueFound && (
                          <p className="text-[var(--text-muted)] text-[11px]">Encontrado: {chk.valueFound}</p>
                        )}
                        {chk.reason && (
                          <p className="text-amber-500 font-medium text-[10px]">{chk.reason}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center border border-dashed border-[var(--border-soft)] rounded-xl text-xs text-[var(--text-muted)]">
                  Selecione uma variante para analisar as regras do MVP.
                </div>
              )}
            </div>

            {/* Painel de Ações de Escrita */}
            {selectedNewVariantId && eligibilityResult && (
              <div className="glass p-6 rounded-2xl border border-[var(--border-soft)] space-y-4">
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Ações de Teste</h3>
                
                {/* 1. Botão de Simulação */}
                <div className="space-y-2">
                  <button
                    onClick={handleSimulate}
                    disabled={loading || checkingEligibility}
                    className="w-full py-3 bg-[var(--surface-glass)] hover:bg-[var(--border-soft)] border border-[var(--border-soft)] text-[var(--text-primary)] font-bold rounded-xl text-sm transition-all duration-200"
                  >
                    Simular Alteração (Sem Escrita)
                  </button>
                  <p className="text-[10px] text-center text-[var(--text-muted)]">
                    Simula os payloads e cria o snapshot de validação de forma segura.
                  </p>
                </div>

                {/* 2. Formulário de Aplicação Real */}
                {simulated && (
                  <div className="border-t border-[var(--border-soft)]/50 pt-4 space-y-4">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-500 space-y-1">
                      <p className="font-bold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Edição Real no Endpoint Unstable</p>
                      <p>Isso alterará os dados oficiais do pedido de teste na Nuvemshop.</p>
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={termsAccepted}
                          onChange={(e) => setTermsAccepted(e.target.checked)}
                          className="mt-0.5" 
                        />
                        <span className="text-[10px] text-[var(--text-muted)] leading-tight select-none">
                          Confirmo que este é um pedido de teste e compreendo que a Nuvemshop será alterada.
                        </span>
                      </label>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase">Confirmação de Segurança</label>
                        <input 
                          type="text" 
                          value={typedConfirmation}
                          onChange={(e) => setTypedConfirmation(e.target.value)}
                          placeholder={`Digite: ALTERAR PEDIDO #${order.number}`}
                          className="w-full px-3 py-2 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-glass)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-rose-500"
                        />
                      </div>

                      <button
                        onClick={handleApplyRealEdit}
                        disabled={loading || !termsAccepted || typedConfirmation !== `ALTERAR PEDIDO #${order.number}` || !diagnostics?.realEditEnabled}
                        className="w-full py-3 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-xl text-sm transition-all duration-200 shadow-lg shadow-rose-900/30"
                      >
                        Aplicar Edição Real
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Relatório Técnico de Diagnóstico */}
      {(eligibilityResult || lastApiResult || simulationResult) && (
        <div className="glass p-6 rounded-2xl border border-[var(--border-soft)] space-y-4">
          <div className="flex justify-between items-center border-b border-[var(--border-soft)]/50 pb-3">
            <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" /> Diagnóstico Técnico do Endpoint
            </h3>
            <button 
              onClick={copyTechnicalReport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface-glass)] hover:bg-[var(--border-soft)] border border-[var(--border-soft)] rounded-lg text-xs text-[var(--text-primary)] font-bold transition-all"
            >
              <Copy className="w-3.5 h-3.5" /> Copiar Relatório Técnico
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            
            {/* Payload Enviado */}
            <div className="space-y-1.5">
              <p className="font-bold text-[var(--text-muted)] uppercase">Payload Sanitizado Enviado</p>
              <pre className="bg-[#0b1329] p-4 rounded-xl border border-slate-800 overflow-x-auto text-[11px] leading-relaxed max-h-56 pr-2 scrollbar-thin text-indigo-300">
                {JSON.stringify(simulationResult?.simulationSnapshot?.conceptPayload || lastApiResult?.details?.payload || { status: 'Sem requisição ativa' }, null, 2)}
              </pre>
            </div>

            {/* Resposta Recebida */}
            <div className="space-y-1.5">
              <p className="font-bold text-[var(--text-muted)] uppercase">Resposta Técnica Sanitizada</p>
              <pre className="bg-[#0b1329] p-4 rounded-xl border border-slate-800 overflow-x-auto text-[11px] leading-relaxed max-h-56 pr-2 scrollbar-thin text-emerald-300">
                {JSON.stringify(lastApiResult || simulationResult?.simulationSnapshot || { status: 'Sem retorno técnico' }, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Histórico Recente de Operações */}
      <div className="glass p-6 rounded-2xl border border-[var(--border-soft)] space-y-4">
        <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-500" /> Histórico Recente de Operações do PedidoFlex
        </h3>
        
        {loadingHistory ? (
          <div className="py-6 text-center text-sm text-[var(--text-muted)]">Carregando histórico...</div>
        ) : history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-soft)] text-xs text-[var(--text-muted)] uppercase">
                  <th className="py-3 px-4">Pedido</th>
                  <th className="py-3 px-4">Modo</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Antiga</th>
                  <th className="py-3 px-4">Nova</th>
                  <th className="py-3 px-4">Qtd</th>
                  <th className="py-3 px-4">Criação</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]/40 font-medium">
                {history.map(item => (
                  <tr key={item.id} className="text-xs text-[var(--text-primary)] hover:bg-[var(--border-soft)]/10">
                    <td className="py-3.5 px-4">#{item.order_number}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded font-bold ${item.mode === 'REAL' ? 'bg-rose-500/10 text-rose-400' : 'bg-blue-500/10 text-blue-400'}`}>
                        {item.mode}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded font-black ${
                        item.status === 'VERIFIED' ? 'bg-emerald-500/15 text-emerald-400' : 
                        item.status === 'INCONCLUSIVE' ? 'bg-amber-500/15 text-amber-400' : 
                        item.status === 'REVERTED' ? 'bg-indigo-500/15 text-indigo-400' : 'bg-rose-500/15 text-rose-400'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[10px]">{item.old_variant_id}</td>
                    <td className="py-3.5 px-4 font-mono text-[10px]">{item.new_variant_id}</td>
                    <td className="py-3.5 px-4">{item.quantity}</td>
                    <td className="py-3.5 px-4">{new Date(item.created_at).toLocaleDateString('pt-BR')}</td>
                    <td className="py-3.5 px-4 text-right">
                      {item.status === 'VERIFIED' && (
                        <button
                          onClick={() => handleRevert(item.id, item.order_number)}
                          disabled={loading}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-lg flex items-center gap-1.5 text-[10px] ml-auto transition-all"
                        >
                          <RotateCcw className="w-3 h-3" /> Reverter Teste
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-soft)] rounded-xl">
            Nenhuma operação executada anteriormente.
          </div>
        )}
      </div>
    </div>
  );
};

export default PedidoFlex;

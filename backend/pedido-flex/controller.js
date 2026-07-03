/**
 * CONTROLLER - PEDIDOFLEX
 * Intermedeia as requisições HTTP Express para as rotas da funcionalidade.
 */

import { supabase } from './supabaseClient.js';
import { validateEditPayload } from './validator.js';
import { checkEligibility } from './eligibilityService.js';
import { simulateEdit, applyEdit, revertEdit } from './editService.js';
import axios from 'axios';

// Helper para instanciar cliente da API v1
async function getNormalClient(storeId) {
  const { data: store, error } = await supabase
    .from('stores')
    .select('access_token')
    .eq('id', String(storeId))
    .single();
    
  if (error || !store) {
    throw new Error(`Credenciais não encontradas para a loja ${storeId}`);
  }

  const baseUrl = process.env.TIENDANUBE_BASE_URL || 'https://api.tiendanube.com/v1';
  return axios.create({
    baseURL: `${baseUrl}/${storeId}`,
    headers: {
      'Authentication': `bearer ${store.access_token}`,
      'User-Agent': 'AI-Manager (contato@plannerfoto.com.br)',
      'Content-Type': 'application/json'
    }
  });
}

/**
 * 1. BUSCAR PEDIDO (Por ID interno ou Número visível com igualdade exata)
 */
export async function searchOrder(req, res) {
  const storeId = req.headers['x-store-id'];
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Parâmetro de busca "q" é obrigatório.' });
  }

  try {
    const apiClient = await getNormalClient(storeId);
    let order = null;

    // A. Tentar buscar no banco de dados local primeiro (por ID ou número exato)
    const { data: dbOrders } = await supabase
      .from('nuvemshop_orders')
      .select('raw_data')
      .eq('store_id', String(storeId))
      .or(`id.eq.${q},number.eq.${q}`);

    if (dbOrders && dbOrders.length > 0) {
      // Filtrar por igualdade exata se vier mais de um
      const exactMatch = dbOrders.find(o => String(o.raw_data.number) === String(q) || String(o.raw_data.id) === String(q));
      if (exactMatch) order = exactMatch.raw_data;
    }

    // B. Fallback: Buscar diretamente na API da Nuvemshop se não achou local
    if (!order) {
      try {
        // Tenta como ID interno direto
        const idRes = await apiClient.get(`/orders/${q}?aggregates=fulfillment_orders`);
        order = idRes.data;
      } catch (err) {
        // Se falhar, pesquisa por texto/q e filtra exato pelo número do pedido
        try {
          const searchRes = await apiClient.get(`/orders`, { params: { q: String(q), aggregates: 'fulfillment_orders' } });
          const list = searchRes.data || [];
          // FILTRO POR IGUALDADE EXATA DO NÚMERO
          const matched = list.find(o => String(o.number) === String(q));
          if (matched) {
            order = matched;
          }
        } catch (searchErr) {
          console.warn('Erro na busca secundária de pedidos na API:', searchErr.message);
        }
      }
    }

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    // Se o pedido não tiver os fulfillment_orders populados na resposta (fallback), busca agregando
    if (!order.fulfillment_orders) {
      try {
        const detailRes = await apiClient.get(`/orders/${order.id}?aggregates=fulfillment_orders`);
        order = detailRes.data;
      } catch (fErr) {
        console.warn('Erro ao carregar agregados do pedido:', fErr.message);
      }
    }

    res.json(order);
  } catch (error) {
    console.error('Erro ao buscar pedido:', error.message);
    res.status(500).json({ error: 'Falha ao buscar pedido no servidor.' });
  }
}

/**
 * 2. DIAGNÓSTICO DE ELEGIBILIDADE
 */
export async function getEligibility(req, res) {
  const storeId = req.headers['x-store-id'];
  const { orderId } = req.params;
  const payload = req.body;

  const validation = validateEditPayload(payload);
  if (!validation.isValid) {
    return res.status(400).json({ error: 'Dados inválidos', details: validation.errors });
  }

  try {
    const apiClient = await getNormalClient(storeId);
    const result = await checkEligibility({ storeId, orderId, payload, apiClient });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * 3. EXECUTAR SIMULAÇÃO
 */
export async function simulateOrderEdit(req, res) {
  const storeId = req.headers['x-store-id'];
  const { orderId } = req.params;
  const payload = req.body;
  const userId = req.user?.id;

  const validation = validateEditPayload(payload);
  if (!validation.isValid) {
    return res.status(400).json({ error: 'Dados inválidos', details: validation.errors });
  }

  try {
    const result = await simulateEdit({ storeId, orderId, payload, userId });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * 4. APLICAR ALTERAÇÃO REAL
 */
export async function applyOrderEdit(req, res) {
  const storeId = req.headers['x-store-id'];
  const { orderId } = req.params;
  const payload = req.body;
  const userId = req.user?.id;

  // Feature flags de segurança no backend
  const enabled = process.env.PEDIDOFLEX_ENABLED !== 'false';
  const realEditEnabled = process.env.PEDIDOFLEX_REAL_EDIT_ENABLED === 'true';

  if (!enabled) {
    return res.status(403).json({ error: 'O módulo PedidoFlex está desativado nesta loja.' });
  }

  if (!realEditEnabled) {
    return res.status(403).json({ 
      error: 'Edição real desativada por configuração de segurança (PEDIDOFLEX_REAL_EDIT_ENABLED=false).' 
    });
  }

  const validation = validateEditPayload(payload);
  if (!validation.isValid) {
    return res.status(400).json({ error: 'Dados inválidos', details: validation.errors });
  }

  try {
    const result = await applyEdit({ storeId, orderId, payload, userId });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * 5. REVERTER ALTERAÇÃO
 */
export async function revertOrderEdit(req, res) {
  const { editId } = req.params;
  const userId = req.user?.id;

  try {
    const result = await revertEdit({ editId, userId });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * 6. LISTAR HISTÓRICO DE EDIÇÕES
 */
export async function getEditsList(req, res) {
  const storeId = req.headers['x-store-id'];

  try {
    const { data, error } = await supabase
      .from('pedido_flex_order_edits')
      .select('*')
      .eq('store_id', String(storeId))
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * 7. OBTER DETALHE DE UMA EDIÇÃO
 */
export async function getEditDetails(req, res) {
  const { editId } = req.params;

  try {
    const { data: edit, error } = await supabase
      .from('pedido_flex_order_edits')
      .select('*')
      .eq('id', editId)
      .single();

    if (error) throw error;
    res.json(edit);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * 8. DIAGNÓSTICO DE INTEGRAÇÃO (Consulta de escopos reais via headers da Nuvemshop)
 */
export async function getDiagnostics(req, res) {
  const storeId = req.headers['x-store-id'];

  try {
    const apiClient = await getNormalClient(storeId);
    
    // Faz a consulta e analisa os cabeçalhos de escopos retornados
    const storeRes = await apiClient.get('/store');
    const scopesHeader = storeRes.headers['x-oauth-scopes'] || '';
    const scopesList = scopesHeader ? scopesHeader.split(',').map(s => s.trim()) : [];

    res.json({
      storeId,
      scopes: scopesList,
      enabled: process.env.PEDIDOFLEX_ENABLED !== 'false',
      realEditEnabled: process.env.PEDIDOFLEX_REAL_EDIT_ENABLED === 'true'
    });
  } catch (error) {
    console.error('Erro no diagnóstico de escopos:', error.message);
    res.json({
      storeId,
      scopes: [],
      enabled: process.env.PEDIDOFLEX_ENABLED !== 'false',
      realEditEnabled: process.env.PEDIDOFLEX_REAL_EDIT_ENABLED === 'true',
      error: error.response?.data || error.message
    });
  }
}

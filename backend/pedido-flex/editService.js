/**
 * SERVIÇO DE EDICÃO E GRAVAÇÃO - PEDIDOFLEX
 * Centraliza as operações de simulação, aplicação real na API Unstable e reversão de testes.
 */

import axios from 'axios';
import { supabase } from './supabaseClient.js';
import { sanitizeOrder, sanitizePayload } from './sanitizer.js';
import { checkEligibility } from './eligibilityService.js';

const UNSTABLE_BASE_URL = 'https://api.nuvemshop.com.br/unstable';
const USER_AGENT = 'AI-Manager (contato@plannerfoto.com.br)';

// Helper para obter credenciais
async function getStoreToken(storeId) {
  const { data: store, error } = await supabase
    .from('stores')
    .select('access_token')
    .eq('id', String(storeId))
    .single();
    
  if (error || !store) {
    throw new Error(`Credenciais não encontradas no banco para a loja ${storeId}`);
  }
  return store.access_token;
}

// Helper para instanciar cliente da API Unstable
async function getUnstableClient(storeId) {
  const token = await getStoreToken(storeId);
  return axios.create({
    baseURL: `${UNSTABLE_BASE_URL}/${storeId}`,
    headers: {
      'Authentication': `bearer ${token}`,
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/json'
    },
    timeout: 15000 // 15s timeout
  });
}

// Helper para instanciar cliente da API normal (v1)
async function getNormalClient(storeId) {
  const token = await getStoreToken(storeId);
  const baseUrl = process.env.TIENDANUBE_BASE_URL || 'https://api.tiendanube.com/v1';
  return axios.create({
    baseURL: `${baseUrl}/${storeId}`,
    headers: {
      'Authentication': `bearer ${token}`,
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/json'
    },
    timeout: 15000
  });
}

/**
 * 1. SIMULAR ALTERAÇÃO (Modo Simulação)
 */
export async function simulateEdit({ storeId, orderId, payload, userId }) {
  const apiClient = await getNormalClient(storeId);
  
  // A. Validar elegibilidade
  const eligibility = await checkEligibility({ storeId, orderId, payload, apiClient });
  
  // Buscar os dados do pedido e produto para o snapshot de simulação
  const orderRes = await apiClient.get(`/orders/${orderId}?aggregates=fulfillment_orders`);
  const productRes = await apiClient.get(`/products/${payload.productId}`);
  
  // B. Montar payload conceitual da simulação
  const requestPayload = {
    products: [
      {
        line_item_id: Number(payload.oldLineItemId),
        quantity: 0,
        modify_stock: true,
        fulfillment_order_id: String(payload.fulfillmentOrderId)
      },
      {
        product_id: Number(payload.productId),
        variant_id: Number(payload.newVariantId),
        quantity: Number(payload.quantity),
        modify_stock: true,
        fulfillment_order_id: String(payload.fulfillmentOrderId)
      }
    ],
    skip_shipping_requote: false,
    auto_partial_refund: false,
    notify_customer: false,
    reason: "Simulação de teste do PedidoFlex no AI-Manager"
  };

  const simulationSnapshot = {
    eligibilityChecks: eligibility.checks,
    isEligible: eligibility.isEligible,
    conceptPayload: requestPayload,
    orderSnapshot: sanitizeOrder(orderRes.data),
    productSnapshot: productRes.data
  };

  // C. Gravar simulação no banco
  const { data: dbRow, error: dbErr } = await supabase
    .from('pedido_flex_order_edits')
    .insert({
      store_id: String(storeId),
      order_id: String(orderId),
      order_number: String(orderRes.data.number || ''),
      mode: 'SIMULATE',
      status: 'SIMULATED',
      old_line_item_id: String(payload.oldLineItemId),
      product_id: String(payload.productId),
      old_variant_id: String(payload.oldVariantId),
      new_variant_id: String(payload.newVariantId),
      quantity: Number(payload.quantity),
      fulfillment_order_id: String(payload.fulfillmentOrderId),
      order_updated_at_before: orderRes.data.updated_at,
      before_snapshot: sanitizeOrder(orderRes.data),
      simulation_snapshot: simulationSnapshot,
      request_payload_sanitized: sanitizePayload(requestPayload),
      created_by_user_id: userId,
      completed_at: new Date().toISOString()
    })
    .select()
    .single();

  if (dbErr) throw dbErr;

  return {
    editId: dbRow.id,
    eligibility,
    simulationSnapshot
  };
}

/**
 * 2. APLICAR ALTERAÇÃO REAL (POST Unstable)
 */
export async function applyEdit({ storeId, orderId, payload, userId }) {
  const normalClient = await getNormalClient(storeId);
  const unstableClient = await getUnstableClient(storeId);

  // A. Revalidar elegibilidade imediatamente antes da escrita
  const eligibility = await checkEligibility({ storeId, orderId, payload, apiClient: normalClient });
  if (!eligibility.isEligible) {
    throw new Error('O pedido não atende aos critérios obrigatórios de elegibilidade.');
  }

  // Buscar estado antes
  const orderBefore = (await normalClient.get(`/orders/${orderId}?aggregates=fulfillment_orders`)).data;

  // B. Criar registro no banco com status 'PROCESSING' para LOCK de concorrência
  // Se houver outra ativa, falhará pela regra de chave única
  let dbRow = null;
  try {
    const { data, error } = await supabase
      .from('pedido_flex_order_edits')
      .insert({
        store_id: String(storeId),
        order_id: String(orderId),
        order_number: String(orderBefore.number || ''),
        mode: 'REAL',
        status: 'PROCESSING',
        old_line_item_id: String(payload.oldLineItemId),
        product_id: String(payload.productId),
        old_variant_id: String(payload.oldVariantId),
        new_variant_id: String(payload.newVariantId),
        quantity: Number(payload.quantity),
        fulfillment_order_id: String(payload.fulfillmentOrderId),
        order_updated_at_before: orderBefore.updated_at,
        before_snapshot: sanitizeOrder(orderBefore),
        created_by_user_id: userId
      })
      .select()
      .single();

    if (error) throw error;
    dbRow = data;
  } catch (err) {
    // Trata violação de índice exclusivo (código 23505 no Postgres)
    if (err.code === '23505') {
      throw new Error('Conflito: Já existe uma operação do PedidoFlex em andamento para este pedido.');
    }
    throw new Error(`Falha ao registrar bloqueio de concorrência: ${err.message}`);
  }

  const editId = dbRow.id;

  // C. Preparar payload oficial
  const requestPayload = {
    products: [
      {
        line_item_id: Number(payload.oldLineItemId),
        quantity: 0,
        modify_stock: true,
        fulfillment_order_id: String(payload.fulfillmentOrderId)
      },
      {
        product_id: Number(payload.productId),
        variant_id: Number(payload.newVariantId),
        quantity: Number(payload.quantity),
        modify_stock: true,
        fulfillment_order_id: String(payload.fulfillmentOrderId)
      }
    ],
    skip_shipping_requote: false,
    auto_partial_refund: false,
    notify_customer: false,
    reason: "Teste controlado do PedidoFlex no AI-Manager: troca de variante"
  };

  try {
    // Envia POST para a URL Unstable
    const response = await unstableClient.post(`/orders/${orderId}/edit`, requestPayload);
    const apiAcceptedAt = new Date().toISOString();

    // D. Registrar aceite temporário e prosseguir para verificação por GET
    await supabase
      .from('pedido_flex_order_edits')
      .update({
        api_accepted_at: apiAcceptedAt,
        request_payload_sanitized: sanitizePayload(requestPayload),
        response_payload_sanitized: sanitizePayload(response.data),
        http_status: response.status
      })
      .eq('id', editId);

    // E. GET pós-sucesso para verificar se as alterações de fato constam na Nuvemshop
    const verificationRes = await normalClient.get(`/orders/${orderId}?aggregates=fulfillment_orders`);
    const orderAfter = verificationRes.data;
    
    const productsAfter = orderAfter.products || orderAfter.line_items || [];
    
    // Procura a nova variante adicionada
    const newAddedLine = productsAfter.find(p => String(p.variant_id) === String(payload.newVariantId) && String(p.id) !== String(payload.oldLineItemId));
    const oldLineRemoved = !productsAfter.some(p => String(p.id) === String(payload.oldLineItemId) && parseInt(p.quantity || 0) > 0);

    if (newAddedLine && oldLineRemoved) {
      // Alteração confirmada!
      await supabase
        .from('pedido_flex_order_edits')
        .update({
          status: 'VERIFIED',
          new_line_item_id_after: String(newAddedLine.id),
          order_updated_at_after: orderAfter.updated_at,
          verification_snapshot: sanitizeOrder(orderAfter),
          completed_at: new Date().toISOString()
        })
        .eq('id', editId);
      
      return { success: true, status: 'VERIFIED', editId, newLineItemId: String(newAddedLine.id) };
    } else {
      // Aceito pela API, mas as alterações não aparecem na leitura ainda
      await supabase
        .from('pedido_flex_order_edits')
        .update({
          status: 'INCONCLUSIVE',
          verification_snapshot: sanitizeOrder(orderAfter),
          error_message: 'A API da Nuvemshop respondeu com sucesso, mas a alteração não foi identificada na leitura do pedido.'
        })
        .eq('id', editId);

      return { success: false, status: 'INCONCLUSIVE', editId, reason: 'Alteração não pôde ser confirmada na leitura pós-envio.' };
    }

  } catch (error) {
    console.error('Erro na requisição real de edição:', error.response?.data || error.message);
    
    const isTimeoutOrNetwork = error.code === 'ECONNABORTED' || error.message.includes('timeout') || !error.response;
    const httpStatus = error.response?.status || null;
    const errData = error.response?.data || {};
    const errCode = errData.code || errData.error || null;
    const errMsg = errData.message || error.message;

    if (isTimeoutOrNetwork) {
      // Timeout/Erro de Conexão: Não repete. Registra como INCONCLUSIVE e tenta um GET de emergência para ver se aplicou.
      await supabase
        .from('pedido_flex_order_edits')
        .update({
          status: 'INCONCLUSIVE',
          http_status: httpStatus,
          error_code: 'TIMEOUT_OR_NETWORK',
          error_message: `Ocorreu um erro de rede ou timeout durante a gravação: ${errMsg}`
        })
        .eq('id', editId);

      try {
        const verifyRes = await normalClient.get(`/orders/${orderId}?aggregates=fulfillment_orders`);
        const orderAfter = verifyRes.data;
        const productsAfter = orderAfter.products || orderAfter.line_items || [];
        const newAddedLine = productsAfter.find(p => String(p.variant_id) === String(payload.newVariantId));
        
        if (newAddedLine) {
          // Se a alteração realmente ocorreu
          await supabase
            .from('pedido_flex_order_edits')
            .update({
              status: 'VERIFIED',
              new_line_item_id_after: String(newAddedLine.id),
              order_updated_at_after: orderAfter.updated_at,
              verification_snapshot: sanitizeOrder(orderAfter),
              completed_at: new Date().toISOString()
            })
            .eq('id', editId);
          return { success: true, status: 'VERIFIED', editId, newLineItemId: String(newAddedLine.id) };
        }
      } catch (getErr) {
        console.warn('Falha na consulta emergencial pós-timeout:', getErr.message);
      }

      return { success: false, status: 'INCONCLUSIVE', editId, reason: 'Timeout ou erro de rede durante o envio. Verifique manualmente.' };
    } else {
      // Erro HTTP comum (400, 422, 403, 404, etc.)
      await supabase
        .from('pedido_flex_order_edits')
        .update({
          status: 'FAILED',
          http_status: httpStatus,
          error_code: String(errCode || httpStatus),
          error_message: errMsg,
          completed_at: new Date().toISOString()
        })
        .eq('id', editId);

      return { success: false, status: 'FAILED', editId, httpStatus, errCode, errMsg };
    }
  }
}

/**
 * 3. REVERTER ALTERAÇÃO (Reversão)
 */
export async function revertEdit({ editId, userId }) {
  // A. Buscar a edição original no banco
  const { data: originalEdit, error: dbErr } = await supabase
    .from('pedido_flex_order_edits')
    .select('*')
    .eq('id', editId)
    .single();

  if (dbErr || !originalEdit) {
    throw new Error('Registro de edição original não encontrado.');
  }

  if (originalEdit.status !== 'VERIFIED') {
    throw new Error('Apenas edições com status VERIFIED podem ser revertidas.');
  }

  if (!originalEdit.new_line_item_id_after) {
    throw new Error('Não é possível reverter: new_line_item_id_after ausente na edição original.');
  }

  const { store_id, order_id, old_line_item_id, product_id, old_variant_id, new_variant_id, quantity, fulfillment_order_id } = originalEdit;

  const normalClient = await getNormalClient(store_id);
  const unstableClient = await getUnstableClient(store_id);

  // B. Buscar pedido para validação atual antes do POST
  const currentOrder = (await normalClient.get(`/orders/${order_id}?aggregates=fulfillment_orders`)).data;
  const products = currentOrder.products || currentOrder.line_items || [];
  
  // Garantir que a linha nova ainda exista no pedido
  const lineToRevert = products.find(p => String(p.id) === String(originalEdit.new_line_item_id_after));
  if (!lineToRevert) {
    throw new Error('A linha criada para a nova variante não existe mais no pedido (alteração externa detectada).');
  }

  // C. Criar registro de reversão no banco com LOCK
  let revertRow = null;
  try {
    const { data, error } = await supabase
      .from('pedido_flex_order_edits')
      .insert({
        store_id: String(store_id),
        order_id: String(order_id),
        order_number: String(originalEdit.order_number),
        mode: 'REAL',
        status: 'PROCESSING',
        old_line_item_id: String(originalEdit.new_line_item_id_after),
        product_id: String(product_id),
        old_variant_id: String(new_variant_id),
        new_variant_id: String(old_variant_id),
        quantity: Number(quantity),
        fulfillment_order_id: String(fulfillment_order_id),
        order_updated_at_before: currentOrder.updated_at,
        before_snapshot: sanitizeOrder(currentOrder),
        parent_edit_id: editId,
        created_by_user_id: userId
      })
      .select()
      .single();

    if (error) throw error;
    revertRow = data;
  } catch (err) {
    if (err.code === '23505') {
      throw new Error('Conflito: Já existe uma operação do PedidoFlex em andamento para este pedido.');
    }
    throw err;
  }

  const revertEditId = revertRow.id;

  // D. Montar payload de reversão (Remover a nova linha e readicionar a variante original)
  const requestPayload = {
    products: [
      {
        line_item_id: Number(originalEdit.new_line_item_id_after),
        quantity: 0,
        modify_stock: true,
        fulfillment_order_id: String(fulfillment_order_id)
      },
      {
        product_id: Number(product_id),
        variant_id: Number(old_variant_id),
        quantity: Number(quantity),
        modify_stock: true,
        fulfillment_order_id: String(fulfillment_order_id)
      }
    ],
    skip_shipping_requote: false,
    auto_partial_refund: false,
    notify_customer: false,
    reason: "Reversão de teste do PedidoFlex no AI-Manager"
  };

  try {
    const response = await unstableClient.post(`/orders/${order_id}/edit`, requestPayload);
    
    // E. GET de verificação pós-reversão
    const verificationRes = await normalClient.get(`/orders/${order_id}?aggregates=fulfillment_orders`);
    const orderAfter = verificationRes.data;
    const productsAfter = orderAfter.products || orderAfter.line_items || [];
    
    // Verifica se a variante original voltou e a variante nova sumiu
    const revertedLine = productsAfter.find(p => String(p.variant_id) === String(old_variant_id));
    const lineRemoved = !productsAfter.some(p => String(p.id) === String(originalEdit.new_line_item_id_after) && parseInt(p.quantity || 0) > 0);

    if (revertedLine && lineRemoved) {
      // Reversão concluída com sucesso!
      await supabase
        .from('pedido_flex_order_edits')
        .update({
          status: 'VERIFIED',
          new_line_item_id_after: String(revertedLine.id),
          order_updated_at_after: orderAfter.updated_at,
          verification_snapshot: sanitizeOrder(orderAfter),
          completed_at: new Date().toISOString()
        })
        .eq('id', revertEditId);

      // Atualiza o registro original vinculando a reversão
      await supabase
        .from('pedido_flex_order_edits')
        .update({
          status: 'REVERTED',
          reversal_edit_id: revertEditId,
          reverted_at: new Date().toISOString()
        })
        .eq('id', editId);

      return { success: true, status: 'VERIFIED', revertEditId };
    } else {
      await supabase
        .from('pedido_flex_order_edits')
        .update({
          status: 'REVERT_FAILED',
          verification_snapshot: sanitizeOrder(orderAfter),
          error_message: 'Reversão aceita pela API, mas não confirmada na leitura do pedido.'
        })
        .eq('id', revertEditId);

      return { success: false, status: 'REVERT_FAILED', revertEditId };
    }

  } catch (error) {
    console.error('Erro na reversão real:', error.response?.data || error.message);
    const httpStatus = error.response?.status || null;
    const errData = error.response?.data || {};
    const errMsg = errData.message || error.message;

    await supabase
      .from('pedido_flex_order_edits')
      .update({
        status: 'FAILED',
        http_status: httpStatus,
        error_message: `Erro na reversão: ${errMsg}`,
        completed_at: new Date().toISOString()
      })
      .eq('id', revertEditId);

    return { success: false, status: 'FAILED', revertEditId, httpStatus, errMsg };
  }
}

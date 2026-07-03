/**
 * SERVIÇO DE ELEGIBILIDADE - PEDIDOFLEX
 * Valida todas as 22 condições obrigatórias para autorizar a simulação ou a edição real de um pedido.
 */

import { supabase } from './supabaseClient.js';

// Função auxiliar para normalizar valores monetários em centavos (evita ponto flutuante do JS)
function toCents(val) {
  if (val === undefined || val === null) return 0;
  return Math.round(parseFloat(val) * 100);
}

export async function checkEligibility({ storeId, orderId, payload, apiClient }) {
  const checks = [];
  let isEligible = true;

  const addCheck = (name, approved, valueFound, reason = '') => {
    checks.push({ name, approved, valueFound: String(valueFound), reason });
    if (!approved) isEligible = false;
  };

  try {
    // 1. Verificar se há outra edição em andamento no banco para o mesmo pedido (Lock Concorrência)
    const { data: activeEdits, error: dbErr } = await supabase
      .from('pedido_flex_order_edits')
      .select('id, status')
      .eq('store_id', String(storeId))
      .eq('order_id', String(orderId))
      .eq('status', 'PROCESSING');

    if (dbErr) {
      addCheck('Sem edições ativas em processamento', false, 'Erro no DB', `Falha ao consultar banco: ${dbErr.message}`);
    } else {
      const hasActive = activeEdits && activeEdits.length > 0;
      addCheck(
        'Sem edições ativas em processamento',
        !hasActive,
        hasActive ? 'Bloqueado (PROCESSING)' : 'Livre',
        hasActive ? 'Já existe uma edição sendo enviada para a API deste pedido' : ''
      );
    }

    // 2. Buscar o pedido atualizado com fulfillment_orders agregados
    let order = null;
    try {
      const orderRes = await apiClient.get(`/orders/${orderId}?aggregates=fulfillment_orders`);
      order = orderRes.data;
      addCheck('Pedido encontrado na API Nuvemshop', !!order, order ? `ID: ${order.id}` : 'Não encontrado', order ? '' : 'Pedido inválido ou inexistente.');
    } catch (err) {
      addCheck('Pedido encontrado na API Nuvemshop', false, 'Erro API', `API retornou erro: ${err.response?.data?.message || err.message}`);
      return { isEligible: false, checks };
    }

    if (!order) return { isEligible: false, checks };

    // 3. Pedido não cancelado
    const notCancelled = order.status !== 'cancelled';
    addCheck('Pedido não cancelado', notCancelled, order.status, notCancelled ? '' : 'O pedido está cancelado e não pode ser editado.');

    // 4. Pedido não fechado de forma incompatível
    const notClosed = order.status === 'open';
    addCheck('Pedido aberto', notClosed, order.status, notClosed ? '' : 'O pedido está fechado (arquivado/concluído).');

    // 5. shipping_status compatível (não enviado e não entregue)
    const validShippingStatus = order.shipping_status !== 'shipped' && order.shipping_status !== 'delivered';
    addCheck(
      'Status de envio compatível',
      validShippingStatus,
      order.shipping_status || 'unshipped',
      validShippingStatus ? '' : 'O pedido já foi enviado ou entregue.'
    );

    // 6. Apenas um Fulfillment Order no primeiro MVP
    const fOrders = order.fulfillment_orders || [];
    const hasExactlyOneFO = fOrders.length === 1;
    addCheck(
      'Apenas um Fulfillment Order',
      hasExactlyOneFO,
      `${fOrders.length} F.O.`,
      hasExactlyOneFO ? '' : 'O PedidoFlex suporta apenas pedidos com exatamente 1 lote de postagem (Fulfillment Order).'
    );

    // 7. Fulfillment Order correspondente em estado UNPACKED
    let matchedFO = null;
    if (hasExactlyOneFO) {
      matchedFO = fOrders[0];
    } else if (fOrders.length > 1 && payload?.fulfillmentOrderId) {
      matchedFO = fOrders.find(fo => String(fo.id) === String(payload.fulfillmentOrderId));
    }

    if (matchedFO) {
      const packingStatus = String(matchedFO.packing_status || matchedFO.status || '').toLowerCase();
      const isUnpacked = packingStatus === 'unpacked' || packingStatus === 'unfulfilled';
      addCheck(
        'Fulfillment Order desempacotado',
        isUnpacked,
        packingStatus,
        isUnpacked ? '' : 'O lote de postagem já está embalado (packed) ou enviado.'
      );
    } else {
      addCheck(
        'Fulfillment Order desempacotado',
        false,
        'Nenhum encontrado',
        'Fulfillment Order correspondente não localizado ou ausente no pedido.'
      );
    }

    // 8. Localizar linha original pelo line_item_id
    const products = order.products || order.line_items || [];
    const originalLineItem = products.find(p => String(p.id) === String(payload.oldLineItemId));
    addCheck('Linha original encontrada no pedido', !!originalLineItem, payload.oldLineItemId, originalLineItem ? '' : 'O item original não faz parte deste pedido.');

    if (!originalLineItem) {
      return { isEligible: false, checks };
    }

    // 9. Mesma quantidade da linha original
    const sameQty = parseInt(payload.quantity, 10) === parseInt(originalLineItem.quantity, 10);
    addCheck(
      'Mesma quantidade da linha original',
      sameQty,
      `Payload: ${payload.quantity} vs Item: ${originalLineItem.quantity}`,
      sameQty ? '' : 'A quantidade solicitada para a nova variante deve ser exatamente igual à quantidade original.'
    );

    // 10. Produto não pertencente a kit (tags e propriedades)
    const isKit = String(originalLineItem.name || '').toLowerCase().includes('kit') || 
                  (originalLineItem.properties && originalLineItem.properties.length > 0);
    addCheck(
      'Produto não é um kit ou pacote especial',
      !isKit,
      isKit ? 'Kit/Propriedades Complexas' : 'Produto comum',
      !isKit ? '' : 'Kits e produtos com propriedades personalizadas complexas não são editáveis no MVP.'
    );

    // 11. Linha sem propriedades personalizadas complexas
    const hasComplexProps = originalLineItem.properties && originalLineItem.properties.length > 0;
    addCheck(
      'Linha sem propriedades personalizadas complexas',
      !hasComplexProps,
      hasComplexProps ? 'Possui propriedades' : 'Nenhuma',
      !hasComplexProps ? '' : 'O item selecionado possui propriedades customizadas que não podem ser alteradas.'
    );

    // 12. Buscar produto no catálogo para validar variante
    let productCatalog = null;
    try {
      const prodRes = await apiClient.get(`/products/${payload.productId}`);
      productCatalog = prodRes.data;
      addCheck('Produto encontrado no catálogo', !!productCatalog, payload.productId, productCatalog ? '' : 'O produto correspondente não existe no catálogo da loja.');
    } catch (err) {
      addCheck('Produto encontrado no catálogo', false, 'Erro API', `API erro ao buscar produto: ${err.message}`);
      return { isEligible: false, checks };
    }

    if (!productCatalog) return { isEligible: false, checks };

    // 13. Nova variante pertence ao mesmo product_id
    const newVariant = productCatalog.variants?.find(v => String(v.id) === String(payload.newVariantId));
    addCheck(
      'Nova variante pertence ao mesmo produto',
      !!newVariant,
      newVariant ? `ID: ${newVariant.id}` : 'Não encontrada',
      newVariant ? '' : 'A variante de destino não pertence ao mesmo produto selecionado.'
    );

    if (!newVariant) return { isEligible: false, checks };

    // 14. Nova variante diferente da atual
    const isDiffVariant = String(payload.newVariantId) !== String(payload.oldVariantId);
    addCheck('Nova variante diferente da atual', isDiffVariant, `Nova: ${payload.newVariantId} vs Antiga: ${payload.oldVariantId}`, isDiffVariant ? '' : 'A variante de destino é idêntica à atual.');

    // 15. Nova variante ativa ou disponível para venda
    // Na API Nuvemshop, se active for null/undefined ou true, está ativo.
    const isNewVariantActive = newVariant.active !== false;
    addCheck('Nova variante ativa no catálogo', isNewVariantActive, isNewVariantActive ? 'Ativa' : 'Inativa', isNewVariantActive ? '' : 'A nova variante está inativa no catálogo.');

    // 16. Estoque suficiente para a quantidade
    const unlimitedStock = newVariant.stock === null;
    const hasStock = unlimitedStock || parseInt(newVariant.stock || 0, 10) >= parseInt(payload.quantity, 10);
    addCheck(
      'Estoque suficiente para a quantidade',
      hasStock,
      unlimitedStock ? 'Ilimitado' : `Estoque: ${newVariant.stock} (Qtd: ${payload.quantity})`,
      hasStock ? '' : 'Estoque insuficiente para a variante de destino.'
    );

    // 17. Nova variante ainda não presente em outra linha do pedido
    const alreadyPresent = products.some(p => String(p.id) !== String(payload.oldLineItemId) && String(p.variant_id) === String(payload.newVariantId));
    addCheck(
      'Nova variante ainda não presente em outra linha',
      !alreadyPresent,
      alreadyPresent ? 'Duplicada' : 'Única',
      !alreadyPresent ? '' : 'A variante de destino já está cadastrada em outra linha deste pedido.'
    );

    // 18. Mesmo preço da linha original (normalizado em centavos)
    const originalPriceCents = toCents(originalLineItem.price);
    const newPriceCents = toCents(newVariant.price);
    const samePrice = originalPriceCents === newPriceCents;
    addCheck(
      'Mesmo preço da linha original',
      samePrice,
      `Original: R$ ${(originalPriceCents/100).toFixed(2)} vs Nova: R$ ${(newPriceCents/100).toFixed(2)}`,
      samePrice ? '' : 'A nova variante possui preço de venda diferente da variante original (divergência de preço no MVP).'
    );

    // 19. Mesmo peso e dimensões (Verificação informativa: "mesmo peso e dimensões, preferencialmente")
    // Se não bater, aprovamos com aviso no checklist
    const originalVariant = productCatalog.variants?.find(v => String(v.id) === String(payload.oldVariantId));
    const sameWeight = originalVariant && parseFloat(originalVariant.weight || 0) === parseFloat(newVariant.weight || 0);
    addCheck(
      'Mesmo peso e dimensões (Preferencial)',
      true, // Informacional
      sameWeight ? 'Aprovado (Mesmo peso)' : `Divergente (Antigo: ${originalVariant?.weight || 0}kg vs Novo: ${newVariant.weight || 0}kg)`,
      sameWeight ? '' : 'Aviso: Há diferença de peso entre as variantes. Isso pode afetar o frete no futuro, mas o MVP permite prosseguir.'
    );

    // 20. Pedido sem cupom
    const noCoupon = !order.coupon;
    addCheck('Pedido sem cupom de desconto', noCoupon, order.coupon ? 'Cupom ativo' : 'Nenhum', noCoupon ? '' : 'Pedidos com cupons promocionais não são editáveis no MVP.');

    // 21. Pedido sem desconto promocional
    const noPromoDiscount = toCents(order.promotional_discount) === 0;
    addCheck('Pedido sem desconto promocional', noPromoDiscount, `R$ ${parseFloat(order.promotional_discount || 0).toFixed(2)}`, noPromoDiscount ? '' : 'Pedidos com descontos promocionais ativos não são editáveis no MVP.');

    // 22. Pedido sem desconto de gateway que possa interferir no teste
    const noGatewayDiscount = toCents(order.gateway_discount) === 0;
    addCheck('Pedido sem desconto de gateway', noGatewayDiscount, `R$ ${parseFloat(order.gateway_discount || 0).toFixed(2)}`, noGatewayDiscount ? '' : 'Pedidos com descontos concedidos por intermediadores de pagamento não são editáveis no MVP.');

  } catch (err) {
    addCheck('Validação de elegibilidade concluída', false, 'Erro geral', err.message);
  }

  return {
    isEligible,
    checks
  };
}

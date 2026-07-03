/**
 * VALIDADO DE PAYLOADS - PEDIDOFLEX
 * Valida a integridade e formato dos dados recebidos para simulação e execução.
 */

export function validateEditPayload(payload) {
  const errors = [];
  
  if (!payload.oldLineItemId) {
    errors.push('O campo oldLineItemId é obrigatório.');
  } else {
    payload.oldLineItemId = String(payload.oldLineItemId);
  }

  if (!payload.productId) {
    errors.push('O campo productId é obrigatório.');
  } else {
    payload.productId = String(payload.productId);
  }

  if (!payload.oldVariantId) {
    errors.push('O campo oldVariantId é obrigatório.');
  } else {
    payload.oldVariantId = String(payload.oldVariantId);
  }

  if (!payload.newVariantId) {
    errors.push('O campo newVariantId é obrigatório.');
  } else {
    payload.newVariantId = String(payload.newVariantId);
  }

  if (payload.quantity === undefined || payload.quantity === null) {
    errors.push('O campo quantity é obrigatório.');
  } else {
    const qty = parseInt(payload.quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      errors.push('O campo quantity deve ser um número maior que zero.');
    } else {
      payload.quantity = qty;
    }
  }

  if (!payload.fulfillmentOrderId) {
    errors.push('O campo fulfillmentOrderId é obrigatório.');
  } else {
    payload.fulfillmentOrderId = String(payload.fulfillmentOrderId);
  }

  if (payload.oldVariantId && payload.newVariantId && payload.oldVariantId === payload.newVariantId) {
    errors.push('A nova variante deve ser diferente da variante atual.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

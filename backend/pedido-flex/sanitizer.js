/**
 * SERVIÇO DE SANITIZAÇÃO DE DADOS - PEDIDOFLEX
 * Garante que nenhuma informação pessoal identificável (PII), tokens, cookies ou credenciais sejam persistidos no banco de dados.
 */

export function sanitizeOrder(order) {
  if (!order) return null;
  
  // Clone profundo do objeto para evitar mutação indesejada
  const clean = JSON.parse(JSON.stringify(order));

  // 1. Sanitizar dados do cliente (customer)
  if (clean.customer) {
    clean.customer = {
      id: clean.customer.id,
      name: clean.customer.name ? `${clean.customer.name.substring(0, 3)}***` : '***',
      email: '***@***.com',
      phone: '***',
      identification: '***'
    };
  }

  // 2. Sanitizar endereços
  if (clean.shipping_address) {
    clean.shipping_address = {
      city: clean.shipping_address.city || null,
      province: clean.shipping_address.province || null,
      country: clean.shipping_address.country || null,
      zipcode: '***'
    };
  }

  if (clean.billing_address) {
    clean.billing_address = {
      city: clean.billing_address.city || null,
      province: clean.billing_address.province || null,
      country: clean.billing_address.country || null,
      zipcode: '***'
    };
  }

  // 3. Sanitizar campos técnicos e sensíveis
  delete clean.ip;
  delete clean.token;
  delete clean.owner_token;
  delete clean.access_token;
  delete clean.checkout_enabled;
  delete clean.cart_id;
  delete clean.payment_id;
  delete clean.gateway_id;
  delete clean.gateway_link;
  
  if (clean.payment_details) {
    clean.payment_details = {
      method: clean.payment_details.method || null,
      card_brand: clean.payment_details.card_brand || null
    };
  }

  return clean;
}

export function sanitizePayload(payload) {
  if (!payload) return null;

  const clean = JSON.parse(JSON.stringify(payload));
  
  // Remover possíveis vazamentos de tokens nas cabeçalhas ou parâmetros
  delete clean.token;
  delete clean.access_token;
  delete clean.Authorization;
  delete clean.authorization;
  delete clean.headers;
  delete clean.cookies;

  return clean;
}

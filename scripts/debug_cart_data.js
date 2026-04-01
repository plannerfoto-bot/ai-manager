import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function debugData() {
  const storeId = process.env.NUVEMSHOP_STORE_ID || '2767708';
  const token = process.env.NUVEMSHOP_ACCESS_TOKEN || '454761d47b7ce42c4d539deb3025366ac8dbe358';

  console.log(`🔍 [DEBUG] Analisando Loja: ${storeId}`);

  // 1. Config do Banco
  const { data: config } = await supabase.from('abandoned_cart_config').select('*').eq('store_id', storeId).maybeSingle();
  console.log('📄 [DEBUG] Configuração do Painel (vinda do banco):', {
    template: config?.message_template?.substring(0, 50) + '...',
    rules: config?.coupon_rules
  });

  // 2. Carrinho da Nuvemshop
  console.log('🛒 [DEBUG] Buscando último carrinho da Nuvemshop...');
  const res = await axios.get(`https://api.tiendanube.com/v1/${storeId}/checkouts`, {
    params: { status: 'abandoned', per_page: 1 },
    headers: { 'Authentication': `bearer ${token}`, 'User-Agent': 'AIManager/Debug' }
  });

  const cart = res.data?.[0];
  if (!cart) return console.log('❌ Nenhum carrinho encontrado.');

  console.log('📌 [DEBUG] Dados Brutos do Carrinho:', {
    id: cart.id,
    customer_name: cart.contact_name || cart.billing_name || cart.shipping_name,
    customer_obj: cart.customer,
    contact_phone: cart.contact_phone,
    total: cart.total,
    items: cart.line_items?.length
  });

  // 3. Simulação de Processamento (Igual ao backend.js)
  const name = cart.contact_name || cart.billing_name || cart.shipping_name || cart.customer?.name || 'Cliente';
  const firstName = name.split(' ')[0] || 'Cliente';
  const total = parseFloat(cart.total) || 0;
  const productList = (cart.line_items || []).map(p => `• ${p.name} x${p.quantity}`).join('\n');
  const couponCode = Math.floor(10000 + Math.random() * 90000).toString(); // Padrao 5 digitos
  
  const recoveryMessage = (config.message_template || '')
    .replace(/{{(nome|name)}}/gi, firstName)
    .replace(/{{(produtos|products)}}/gi, productList)
    .replace(/{{(cupom|coupon)}}/gi, couponCode);

  console.log('✨ [DEBUG] Mensagem Final Processada:', recoveryMessage);
  console.log('🎯 [DEBUG] Objeto final que seria UPSERTADO no Supabase:', {
    id: cart.id,
    customer_first_name: firstName,
    coupon_code: couponCode,
    recovery_message: recoveryMessage.substring(0, 100) + '...'
  });
}

debugData();

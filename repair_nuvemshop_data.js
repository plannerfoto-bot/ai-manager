
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as dotenv from 'dotenv';
import path from 'path';

// Carregar .env
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const TIENDANUBE_ACCESS_TOKEN = process.env.TIENDANUBE_ACCESS_TOKEN;
const TIENDANUBE_STORE_ID = process.env.TIENDANUBE_STORE_ID;

const supabase = createClient(supabaseUrl, supabaseKey);

async function repair() {
  console.log('🚀 Iniciando reparo de dados da Nuvemshop...');

  // 1. Buscar registros incompletos
  const { data: checkouts, error } = await supabase
    .from('nuvemshop_checkouts')
    .select('id')
    .or('customer_name.eq.Cliente,customer_email.eq.""');

  if (error) {
    console.error('Erro ao buscar checkouts:', error.message);
    return;
  }

  console.log(`🔎 Encontrados ${checkouts.length} registros para verificar.`);

  for (const row of checkouts) {
    try {
      const id = row.id;
      const url = `https://api.tiendanube.com/v1/${TIENDANUBE_STORE_ID}/checkouts/${id}`;
      
      const res = await axios.get(url, {
        headers: {
          'Authentication': `bearer ${TIENDANUBE_ACCESS_TOKEN}`,
          'User-Agent': 'Vigilante Repair (lucasxntos@gmail.com)'
        }
      });

      const cart = res.data;

      // --- LOGICA DE EXTRAÇÃO REFINADA ---
      let name = 'Cliente';
      const possibleNames = [
        cart.contact_name,
        cart.billing_name,
        cart.shipping_name,
        cart.billing_address?.name,
        cart.shipping_address?.name,
        cart.customer?.name,
        cart.customer?.first_name ? `${cart.customer.first_name} ${cart.customer.last_name || ''}`.trim() : null
      ];

      for (const n of possibleNames) {
        if (n && typeof n === 'string' && n.toLowerCase() !== 'cliente' && n.trim().length > 2) {
          name = n.trim();
          break;
        }
      }

      const email = cart.contact_email || cart.email || cart.customer?.email || '';
      
      let phoneRaw = cart.contact_phone || 
                     cart.billing_phone || 
                     cart.shipping_phone || 
                     cart.billing_address?.phone || 
                     cart.shipping_address?.phone || 
                     cart.customer?.phone || 
                     '';
      
      let phone = phoneRaw.toString().replace(/\D/g, '');
      if (phone && phone.length === 11 && !phone.startsWith('55')) {
        phone = '55' + phone;
      } else if (phone && phone.length === 10 && !phone.startsWith('55')) {
        phone = '55' + phone;
      }

      // 2. Atualizar no Supabase
      const { error: updateErr } = await supabase
        .from('nuvemshop_checkouts')
        .update({
          customer_name: name,
          customer_email: email,
          customer_phone: phone,
          last_sync_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateErr) {
        console.error(`❌ Erro ao atualizar ${id}:`, updateErr.message);
      } else {
        console.log(`✅ Reparado ${id}: ${name} | ${email} | ${phone}`);
      }

      // Pequeno delay para não sobrecarregar a API
      await new Promise(r => setTimeout(r, 200));

    } catch (e) {
      if (e.response?.status === 404) {
        console.warn(`⚠️ Checkout ${row.id} não encontrado na Nuvemshop (apagado ou expirado).`);
      } else {
        console.error(`❌ Erro no processamento de ${row.id}:`, e.message);
      }
    }
  }

  console.log('🏁 Reparo concluído!');
}

repair().catch(console.error);

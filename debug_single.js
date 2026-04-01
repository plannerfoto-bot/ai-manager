
import axios from 'axios';

async function debugSingle(id) {
  const TIENDANUBE_ACCESS_TOKEN = '454761d47b7ce42c4d539deb3025366ac8dbe358';
  const TIENDANUBE_STORE_ID = '2767708';
  const url = `https://api.tiendanube.com/v1/${TIENDANUBE_STORE_ID}/checkouts/${id}`;
  
  const res = await axios.get(url, {
    headers: {
      'Authentication': `bearer ${TIENDANUBE_ACCESS_TOKEN}`,
      'User-Agent': 'Vigilante (lucasxntos@gmail.com)'
    }
  });

  const cart = res.data;
  console.log('--- API RAW DATA ---');
  console.log('ID:', cart.id);
  console.log('Email:', cart.email);
  console.log('Contact Email:', cart.contact_email);
  console.log('Billing Address Name:', cart.billing_address?.name);
  console.log('Billing Address Phone:', cart.billing_address?.phone);
  console.log('Shipping Address Name:', cart.shipping_address?.name);
  console.log('Customer Name:', cart.customer?.name);
  console.log('Customer Email:', cart.customer?.email);

  // My logic:
  let name = 'Cliente';
  const possibleNames = [
    cart.billing_address?.name,
    cart.shipping_address?.name,
    cart.customer?.name,
    cart.customer?.first_name ? `${cart.customer.first_name} ${cart.customer.last_name || ''}`.trim() : null
  ];

  console.log('Possible Names:', possibleNames);

  for (const n of possibleNames) {
    if (n && n.toString().toLowerCase() !== 'cliente' && n.toString().length > 2) {
      name = n;
      break;
    }
  }

  const email = cart.email || cart.contact_email || cart.customer?.email || '';
  
  let phoneRaw = cart.billing_address?.phone || 
                 cart.shipping_address?.phone || 
                 cart.customer?.phone || 
                 '';
  
  let phone = phoneRaw.toString().replace(/\D/g, '');
  if (phone && phone.length === 11 && !phone.startsWith('55')) {
    phone = '55' + phone;
  }

  console.log('--- PROCESSED DATA ---');
  console.log('Final Name:', name);
  console.log('Final Email:', email);
  console.log('Final Phone:', phone);
}

const checkoutId = process.argv[2] || '1924114051';
debugSingle(checkoutId).catch(console.error);

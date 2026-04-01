
import axios from 'axios';

async function verifyMultiple(ids) {
  const TIENDANUBE_ACCESS_TOKEN = '454761d47b7ce42c4d539deb3025366ac8dbe358';
  const TIENDANUBE_STORE_ID = '2767708';
  
  for (const id of ids) {
    try {
      const url = `https://api.tiendanube.com/v1/${TIENDANUBE_STORE_ID}/checkouts/${id}`;
      const res = await axios.get(url, {
        headers: {
          'Authentication': `bearer ${TIENDANUBE_ACCESS_TOKEN}`,
          'User-Agent': 'Vigilante (lucasxntos@gmail.com)'
        }
      });

      const cart = res.data;
      console.log(`\n=== CHECKOUT ${id} ===`);
      console.log(`- Billing: ${cart.billing_address?.name} | ${cart.billing_address?.phone}`);
      console.log(`- Shipping: ${cart.shipping_address?.name} | ${cart.shipping_address?.phone}`);
      console.log(`- Customer: ${cart.customer?.name} (${cart.customer?.first_name} ${cart.customer?.last_name}) | ${cart.customer?.email} | ${cart.customer?.phone}`);
      console.log(`- Email/Contact: ${cart.email} / ${cart.contact_email}`);
      
      // Verification of my extraction logic:
      let name = 'Cliente';
      const possibleNames = [
        cart.billing_address?.name,
        cart.shipping_address?.name,
        cart.customer?.name,
        cart.customer?.first_name ? `${cart.customer.first_name} ${cart.customer.last_name || ''}`.trim() : null
      ];
      for (const n of possibleNames) {
        if (n && n.toString().toLowerCase() !== 'cliente' && n.toString().length > 2) {
          name = n;
          break;
        }
      }
      const email = cart.email || cart.contact_email || cart.customer?.email || '';
      console.log(`=> FINAL: Name: ${name} | Email: ${email}`);
    } catch (e) {
      console.error(`Error ${id}:`, e.message);
    }
  }
}

verifyMultiple(['1933242063', '1922792513', '1930577050', '1923627948', '1924114051', '1919864271']);

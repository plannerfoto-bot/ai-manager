const fs = require('fs');

let b = fs.readFileSync('backend.js', 'utf8');
const routesToProtect = [
  '/api/me',
  '/api/stats',
  '/api/profit-stats',
  '/api/orders',
  '/api/orders/:id',
  '/api/products',
  '/api/products/:id',
  '/api/categories',
  '/api/commissions-report',
  '/api/store-script-settings',
  '/api/abandoned-cart/settings',
  '/api/abandoned-cart/history',
  '/api/abandoned-cart/checkouts',
  '/api/store-script',
  '/api/ai/bulk-process',
  '/api/products/bulk-create-manual',
  '/api/products/register-unitary',
  '/api/abandoned-cart/mark-sent',
  '/api/abandoned-cart/register-webhook',
  '/api/abandoned-cart/manual-send',
  '/api/abandoned-cart/coupons/bulk-delete',
  '/api/abandoned-cart/sync-manually'
];
const methods = ['get', 'post', 'put', 'delete'];

routesToProtect.forEach(route => {
  methods.forEach(method => {
    const target1 = `app.${method}('${route}', `;
    const target2 = `app.${method}('${route}', async `;
    
    if (b.includes(target1) && !b.includes(`app.${method}('${route}', requireAuth`)) {
      b = b.replace(target1, `app.${method}('${route}', requireAuth, `);
    }
    if (b.includes(target2) && !b.includes(`app.${method}('${route}', requireAuth`)) {
      b = b.replace(target2, `app.${method}('${route}', requireAuth, async `);
    }
  });
});

fs.writeFileSync('backend.js', b);
console.log('Done replacing routes');

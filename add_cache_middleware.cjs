const fs = require('fs');

let backend = fs.readFileSync('backend.js', 'utf8');

const middlewareCode = `
// ==========================================
// CACHE MIDDLEWARE (SUPABASE)
// ==========================================
function cacheMiddleware(cacheKeyFn, ttlMinutes = 5) {
  return async (req, res, next) => {
    const storeId = req.headers['x-store-id'] || DEFAULT_STORE_ID;
    const forceRefresh = req.query.force_refresh === 'true';
    const cacheKey = typeof cacheKeyFn === 'function' ? cacheKeyFn(req) : cacheKeyFn;
    const fullKey = \`\${storeId}_\${cacheKey}\`;

    if (!forceRefresh) {
      try {
        const { data, error } = await supabase
          .from('api_cache')
          .select('*')
          .eq('key', fullKey)
          .single();
        
        if (!error && data) {
          const now = new Date();
          const updatedAt = new Date(data.updated_at);
          const diffMinutes = (now - updatedAt) / 1000 / 60;
          
          if (diffMinutes <= ttlMinutes) {
            console.log(\`[CACHE HIT] \${fullKey}\`);
            return res.json(data.value);
          }
        }
      } catch (err) {
        console.warn('Cache error (ignoring):', err.message);
      }
    }

    console.log(\`[CACHE MISS] \${fullKey} - Fetching fresh data\`);
    
    // Intercept res.json
    const originalJson = res.json;
    res.json = function (body) {
      // Only cache 200 OK responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        supabase.from('api_cache').upsert({
          key: fullKey,
          value: body,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' }).then(({error}) => {
          if (error && error.code !== '42P01') console.error('Error saving cache:', error);
        });
      }
      originalJson.call(this, body);
    };

    next();
  };
}
`;

// Insert the middleware definition after `const requireAuth = require('./src/middleware/auth');` or just after `const app = express();`
if (!backend.includes('cacheMiddleware(')) {
  backend = backend.replace('const app = express();', 'const app = express();\n' + middlewareCode);
}

// Replace the endpoints
backend = backend.replace(
  "app.get('/api/stats', requireAuth, async (req, res) => {",
  "app.get('/api/stats', requireAuth, cacheMiddleware('stats', 5), async (req, res) => {"
);

backend = backend.replace(
  "app.get('/api/profit-stats', requireAuth, async (req, res) => {",
  "app.get('/api/profit-stats', requireAuth, cacheMiddleware('profit_stats', 5), async (req, res) => {"
);

backend = backend.replace(
  "app.get('/api/orders', requireAuth, async (req, res) => {",
  "app.get('/api/orders', requireAuth, cacheMiddleware(req => 'orders_p' + (req.query.page || 1) + '_s' + (req.query.status || 'all'), 5), async (req, res) => {"
);

backend = backend.replace(
  "app.get('/api/products', requireAuth, async (req, res) => {",
  "app.get('/api/products', requireAuth, cacheMiddleware(req => 'products_p' + (req.query.page || 1), 5), async (req, res) => {"
);

backend = backend.replace(
  "app.get('/api/commissions/report', requireAuth, async (req, res) => {",
  "app.get('/api/commissions/report', requireAuth, cacheMiddleware('commissions_report', 5), async (req, res) => {"
);

fs.writeFileSync('backend.js', backend);
console.log('Cache middleware injected successfully.');

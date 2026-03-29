// Wrapper ESM para o PM2 conseguir chamar o script com argumento --commit
// repair_seo.js usa ES Modules (import/export), então este wrapper também precisa ser ESM
process.argv.push('--commit');
await import('./repair_seo.js');

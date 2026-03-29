// Wrapper para o PM2 conseguir chamar o script com argumento --commit
process.argv.push('--commit');
require('./repair_seo.js');

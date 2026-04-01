import { runProfessionalAbandonedCartRecovery } from '../backend.js';

async function forceSync() {
  console.log('🚀 Iniciando Sincronização Inteligente Forçada...');
  try {
    await runProfessionalAbandonedCartRecovery();
    console.log('✅ Sincronização concluída com sucesso!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro na sincronização:', err.message);
    process.exit(1);
  }
}

forceSync();

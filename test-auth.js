import axios from 'axios';

const token = '2a3e3be7e1b928aec40b8de9b9bfedfc95c07f92';
const storeId = '2767708';
const baseUrl = `https://api.tiendanube.com/v1/${storeId}/scripts`;

async function testAuth(headerName, headerValue) {
  console.log(`Testando: ${headerName}: ${headerValue}`);
  try {
    const res = await axios.get(baseUrl, {
      headers: {
        [headerName]: headerValue,
        'User-Agent': 'CalculadoraCloth (felipe@clothsublimacao.com.br)'
      }
    });
    console.log(`✅ Sucesso! Status: ${res.status}`);
    return true;
  } catch (error) {
    console.log(`❌ Erro: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`);
    return false;
  }
}

async function runTests() {
  console.log('--- TESTES DE AUTENTICAÇÃO NUVEMSHOP ---\n');
  
  // Teste 1: bearer (minúsculo)
  await testAuth('Authentication', `bearer ${token}`);
  
  // Teste 2: Bearer (Maiúsculo)
  await testAuth('Authentication', `Bearer ${token}`);
  
  // Teste 3: Apenas o token
  await testAuth('Authentication', token);
  
  // Teste 4: access_token no header (algumas vezes usado assim)
  await testAuth('access_token', token);
}

runTests();

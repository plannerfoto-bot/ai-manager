import axios from 'axios';

const token = '2a3e3be7e1b928aec40b8de9b9bfedfc95c07f92';
const storeId = '2767708';
const userAgent = 'CalculadoraCloth (felipe@clothsublimacao.com.br)';

async function testAuth(headerName, headerValue, useQuery = false) {
  let url = `https://api.tiendanube.com/v1/${storeId}/scripts`;
  const headers = { 'User-Agent': userAgent };
  
  if (useQuery) {
    url += `?access_token=${token}`;
    console.log(`Testando Query Param: ?access_token=${token}`);
  } else {
    headers[headerName] = headerValue;
    console.log(`Testando Header: ${headerName}: ${headerValue}`);
  }

  try {
    const res = await axios.get(url, { headers });
    console.log(`✅ Sucesso! Status: ${res.status}`);
    return true;
  } catch (error) {
    console.log(`❌ Erro: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`);
    return false;
  }
}

async function runTests() {
  console.log('--- TESTES DE AUTENTICAÇÃO NUVEMSHOP v2 ---\n');
  
  // Teste 5: access_token no header (sem 'bearer')
  await testAuth('access_token', token);

  // Teste 6: X-Tiendanube-AccessToken
  await testAuth('X-Tiendanube-AccessToken', token);

  // Teste 7: Authentication: bearer (com espaço extra ou sem)
  await testAuth('Authentication', `bearer ${token}`);

  // Teste 8: Query Param
  await testAuth(null, null, true);
}

runTests();

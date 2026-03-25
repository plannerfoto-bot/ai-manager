import axios from 'axios';

async function verify(token, storeId) {
    console.log(`Testando Loja: ${storeId} com Token: ${token.substring(0, 5)}...`);
    try {
        const res = await axios.get(`https://api.tiendanube.com/v1/${storeId}/store`, {
            headers: { 'Authentication': `bearer ${token}` }
        });
        console.log("✅ CONEXÃO ESTABELECIDA!");
        console.log("Nome da Loja:", res.data.name.pt);
        console.log("E-mail:", res.data.email);
        return true;
    } catch (e) {
        console.log("❌ FALHA NA CONEXÃO:");
        console.log("Status:", e.response?.status);
        console.log("Mensagem:", e.response?.data?.message || e.message);
        return false;
    }
}

const tokens = [
    "454761d47b7ce42c4d539deb3025366ac8dbe358",
    "37608147d34551152a5c5453fca806655c659fe3",
    "2a3e3be7e1b928aec40b8de9b9bfedfc95c07f92"
];
const storeId = "2767708";

async function run() {
    for (const t of tokens) {
        await verify(t, storeId);
        console.log("-------------------");
    }
}

run();

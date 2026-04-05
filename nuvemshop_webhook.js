
const STORE_ID = "2767708";
const TOKEN = "454761d47b7ce42c4d539deb3025366ac8dbe358";

async function createNuvemshopWebhook() {
    console.log("Registrando Webhook na Nuvemshop...");
    try {
        const response = await fetch(`https://api.nuvemshop.com.br/v1/${STORE_ID}/webhooks`, {
            method: 'POST',
            headers: {
                'Authentication': `bearer ${TOKEN}`,
                'User-Agent': 'AntigravityApp (contato@adminfotoplanner.com.br)',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                event: "order/updated",
                url: "https://n8n.adminfotoplanner.com.br/webhook/nuvemshop-pedido-enviado"
            })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error("Erro interno Nuvemshop:", err);
            return;
        }

        const data = await response.json();
        console.log("SUCESSO: Webhook da Nuvemshop instalado!", data);
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

createNuvemshopWebhook();


const N8N_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNDg5M2RiYS1mOTljLTQ0NTctOGZlZS02MGJmOWE3Yzk4YTIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc1MTQzMDEyfQ.FI_ZK49y4yjoANN9h4Dej5-Kk7Tg5wKnlmxh3Z60d2M";
const N8N_URL = "https://n8n.adminfotoplanner.com.br/api/v1/workflows";
const SEVENTEEN_TRACK_KEY = "DB00917F773E33DAE17CF83F1264279A";

async function createWorkflow(name, nodes, connections) {
    console.log(`Criando Workflow: ${name}...`);
    try {
        const response = await fetch(N8N_URL, {
            method: 'POST',
            headers: {
                'X-N8N-API-KEY': N8N_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                nodes: nodes,
                connections: connections,
                settings: {}
            })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error(`Erro ao criar ${name}:`, err);
            return null;
        }

        const data = await response.json();
        console.log(`Sucesso! Workflow ${name} criado com ID: ${data.id}`);
        return data.id;
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

async function main() {
    // WORKFLOW 1
    const wf1_nodes = [
        {
          "parameters": {
            "httpMethod": "POST",
            "path": "nuvemshop-pedido-enviado",
            "options": {}
          },
          "id": "1",
          "name": "Webhook Nuvemshop",
          "type": "n8n-nodes-base.webhook",
          "typeVersion": 1,
          "position": [250, 300]
        },
        {
          "parameters": {
            "conditions": {
              "boolean": [],
              "string": [
                {
                  "value1": "={{ $json.body.event }}",
                  "value2": "order/updated"
                }
              ]
            }
          },
          "id": "2",
          "name": "Apenas order/updated?",
          "type": "n8n-nodes-base.if",
          "typeVersion": 1,
          "position": [450, 300]
        },
        {
          "parameters": {
            "requestMethod": "POST",
            "url": "https://api.17track.net/track/v2.2/register",
            "jsonParameters": true,
            "options": {},
            "bodyParametersJson": "={{JSON.stringify([{number: $json.body.shipping_tracking_number}])}}",
            "headerParametersJson": `{"17token":"${SEVENTEEN_TRACK_KEY}"}`
          },
          "id": "4",
          "name": "Registrar no 17Track",
          "type": "n8n-nodes-base.httpRequest",
          "typeVersion": 1,
          "position": [850, 260]
        }
    ];

    const wf1_connections = {
        "Webhook Nuvemshop": {
            "main": [[{"node": "Apenas order/updated?","type": "main","index": 0}]]
        },
        "Apenas order/updated?": {
            "main": [[{"node": "Registrar no 17Track","type": "main","index": 0}]]
        }
    };

    // WORKFLOW 2
    const wf2_nodes = [
        {
          "parameters": {
            "httpMethod": "POST",
            "path": "webhook-17track-entrega",
            "options": {}
          },
          "id": "1",
          "name": "17Track Webhook",
          "type": "n8n-nodes-base.webhook",
          "typeVersion": 1,
          "position": [200, 300]
        },
        {
          "parameters": {
            "amount": 48,
            "unit": "hours"
          },
          "id": "5",
          "name": "Esperar 2 Dias",
          "type": "n8n-nodes-base.wait",
          "typeVersion": 1,
          "position": [1000, 280]
        }
    ];

    const wf2_connections = {
        "17Track Webhook": {
            "main": [[{"node": "Esperar 2 Dias","type": "main","index": 0}]]
        }
    };

    await createWorkflow("Pós-Venda: NS -> 17Track (Automático)", wf1_nodes, wf1_connections);
    await createWorkflow("Pós-Venda: 17Track -> Espera -> Wuzapi (Automático)", wf2_nodes, wf2_connections);
    
    console.log("FINALIZADO!");
}

main();

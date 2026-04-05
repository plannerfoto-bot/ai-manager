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
        console.log(`Sucesso! Workflow ${name} criado!`);
        return data.id;
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

async function main() {
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
      "name": "Filtro: Apenas order/updated?",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [450, 300]
    },
    {
      "parameters": {
        "conditions": {
          "boolean": [],
          "string": [
            {
              "value1": "={{ $json.body.shipping_tracking_number }}",
              "operation": "isNotEmpty"
            }
          ]
        }
      },
      "id": "3",
      "name": "Tem Código de Rastreio?",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [650, 280]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://api.17track.net/track/v2.2/register",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "17token",
              "value": SEVENTEEN_TRACK_KEY
            }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "number",
              "value": "={{ $json.body.shipping_tracking_number }}"
            }
          ]
        },
        "options": {}
      },
      "id": "4",
      "name": "Registrar no 17Track",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [850, 260]
    },
    {
      "parameters": {
        "operation": "insert",
        "tableId": "post_sales_tracking",
        "columns": [
          {
            "name": "order_id",
            "value": "={{ $('Tem Código de Rastreio?').item.json.body.id }}"
          },
          {
            "name": "customer_name",
            "value": "={{ $('Tem Código de Rastreio?').item.json.body.customer.name }}"
          },
          {
            "name": "customer_phone",
            "value": "={{ $('Tem Código de Rastreio?').item.json.body.customer.phone }}"
          },
          {
            "name": "tracking_number",
            "value": "={{ $('Tem Código de Rastreio?').item.json.body.shipping_tracking_number }}"
          },
          {
            "name": "carrier",
            "value": "={{ $('Tem Código de Rastreio?').item.json.body.shipping_option }}"
          },
          {
            "name": "status",
            "value": "rastreando"
          }
        ]
      },
      "id": "5",
      "name": "Supabase: Inserir Monitoramento",
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [1050, 260]
    }
  ];

  const wf1_connections = {
    "Webhook Nuvemshop": {
      "main": [
        [
          {
            "node": "Filtro: Apenas order/updated?",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Filtro: Apenas order/updated?": {
      "main": [
        [
          {
            "node": "Tem Código de Rastreio?",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Tem Código de Rastreio?": {
      "main": [
        [
          {
            "node": "Registrar no 17Track",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Registrar no 17Track": {
      "main": [
        [
          {
            "node": "Supabase: Inserir Monitoramento",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  };

  const wf2_nodes = [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "webhook-entrega-recebida",
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
        "conditions": {
          "number": [
            {
              "value1": "={{ $json.body.data.track_info.latest_status.status }}",
              "value2": 40
            }
          ]
        }
      },
      "id": "2",
      "name": "Status é Entregue? (40)",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [400, 300]
    },
    {
      "parameters": {
        "operation": "update",
        "tableId": "post_sales_tracking",
        "updateKey": "tracking_number",
        "updateKeyType": "string",
        "columns": [
          {
            "name": "status",
            "value": "entregue_aguardando"
          },
          {
            "name": "tracking_number",
            "value": "={{ $json.body.data.number }}"
          }
        ]
      },
      "id": "3",
      "name": "Atualiza DB (Aguardando)",
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [600, 280]
    },
    {
      "parameters": {
        "operation": "getAll",
        "tableId": "post_sales_tracking",
        "limit": 1,
        "filters": [
          {
            "name": "tracking_number",
            "value": "={{ $('Status é Entregue? (40)').item.json.body.data.number }}"
          }
        ]
      },
      "id": "4",
      "name": "Recuperar Dados do Cliente",
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [800, 280]
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
    },
    {
      "parameters": {
        "method": "POST",
        "url": "http://SUA_VPS_IP:8080/chat/send/text",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Token",
              "value": "TOKEN_WUZAPI"
            }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "phone",
              "value": "={{ $('Recuperar Dados do Cliente').item.json.customer_phone }}"
            },
            {
              "name": "message",
              "value": "={{ 'Olá ' + $('Recuperar Dados do Cliente').item.json.customer_name + ', tudo bem? Vi que sua encomenda acabou de chegar! \\n\\nGostaríamos de saber o que achou da sua experiência! Ah, e se você postar e marcar a gente lá no nosso Instagram, você ganha 15% OFF na sua próxima compra!' }}"
            }
          ]
        },
        "options": {}
      },
      "id": "6",
      "name": "Disparar WhatsApp (Wuzapi)",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [1200, 280]
    },
    {
      "parameters": {
        "operation": "update",
        "tableId": "post_sales_tracking",
        "updateKey": "order_id",
        "updateKeyType": "string",
        "columns": [
          {
            "name": "status",
            "value": "msg_enviada"
          },
          {
            "name": "order_id",
            "value": "={{ $('Recuperar Dados do Cliente').item.json.order_id }}"
          }
        ]
      },
      "id": "7",
      "name": "Atualiza DB (Concluído)",
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [1400, 280]
    }
  ];

  const wf2_connections = {
    "17Track Webhook": {
      "main": [
        [
          {
            "node": "Status é Entregue? (40)",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Status é Entregue? (40)": {
      "main": [
        [
          {
            "node": "Atualiza DB (Aguardando)",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Atualiza DB (Aguardando)": {
      "main": [
        [
          {
            "node": "Recuperar Dados do Cliente",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Recuperar Dados do Cliente": {
      "main": [
        [
          {
            "node": "Esperar 2 Dias",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Esperar 2 Dias": {
      "main": [
        [
          {
            "node": "Disparar WhatsApp (Wuzapi)",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Disparar WhatsApp (Wuzapi)": {
      "main": [
        [
          {
            "node": "Atualiza DB (Concluído)",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  };

    await createWorkflow("FULL Pós-Venda: NS -> 17Track (BD)", wf1_nodes, wf1_connections);
    await createWorkflow("FULL Pós-Venda: 17Track -> Espera -> Wuzapi (BD)", wf2_nodes, wf2_connections);
}

main();

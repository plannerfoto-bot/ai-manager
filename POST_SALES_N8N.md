# Guia de Configuração: Pós-Venda Automático no N8N

Para facilitar sua vida, eu criei a estrutura (esqueleto) dos dois Workflows necessários para o N8N. Você pode copiar o bloco de JSON abaixo e **colar diretamente na tela (Canvas) do seu n8n** (basta clicar no fundo branco do n8n e usar o atalho `Ctrl+V`).

## Workflow 1: Cadastro do Rastreio (Nuvemshop -> 17Track -> Supabase)

**Como usar:**
1. Copie o JSON abaixo.
2. Cole em um Workflow novo vazio no n8n.
3. Obtenha a URL de Teste do *Webhook Node* e configure na Nuvemshop (em Configurações > Webhooks para o evento `order/updated`).
4. Troque o placeholder `SUA_CHAVE_17TRACK_AQUI` pela sua chave real grátis do [17Track API](https://api.17track.net/).
5. Configure o nó do Supabase com as suas credenciais.

```json
{
  "nodes": [
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
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "17token",
              "value": "SUA_CHAVE_17TRACK_AQUI"
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
  ],
  "connections": {
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
  }
}
```

---

## Workflow 2: Entrega Concluída -> Espera 48h -> Wuzapi WhatsApp

**Como usar:**
1. Copie o JSON abaixo e cole em outro workflow.
2. Pegue a URL de Produção deste *Webhook* e configure no [painel do 17Track](https://seller.17track.net/) para que ele envie um "PUSH" pra você sempre que algo for Entregue.
3. Configure o Token do seu `Wuzapi` no HTTP Request correspondente.

```json
{
  "nodes": [
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
              "value": "={{ 'Olá ' + $('Recuperar Dados do Cliente').item.json.customer_name + ', tudo bem? Vi que sua encomenda acabou de chegar! \n\nGostaríamos de saber o que achou da sua experiência! Ah, e se você postar e marcar a gente lá no nosso Instagram, você ganha 15% OFF na sua próxima compra!' }}"
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
  ],
  "connections": {
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
  }
}
```

## Próximos Passos
Após você colar os dois workflows no n8n que você tem instalado, basta:
1. Cadastrar sua conta gratuita na [17Track API](https://api.17track.net/) (é grátis para as primeiras 100 cotas ou eles têm planos extremamente baratos pra e-commerce).
2. Substituir `SUA_CHAVE_17TRACK_AQUI` pela chave real (17token).
3. Preencher o telefone oficial da loja / IP do Wuzapi no nó HTTP Request final e o seu Token de API do Supabase nos nós em azulzinho de insert/update.
4. Salvar os dois endpoints e colocá-los nos painéis (Webhook do n8n na Nuvemshop, Webhook do 17Track no site deles).

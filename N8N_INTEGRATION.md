# Integração n8n — Nuvemshop Abandoned Cart Recovery 🚀

Este documento centraliza as informações necessárias para manter a integração do AI Manager com o seu servidor n8n e o WuzAPI.

## 🔗 Links Oficiais

- **n8n Editor:** [https://n8n.adminfotoplanner.com.br/](https://n8n.adminfotoplanner.com.br/)
- **WuzAPI Dashboard:** [https://wpp.adminfotoplanner.com.br/dashboard](https://wpp.adminfotoplanner.com.br/dashboard)
- **WuzAPI API Documentation:** [https://wpp.adminfotoplanner.com.br/api](https://wpp.adminfotoplanner.com.br/api)

## 🔑 Credenciais (Configuração do Sistema)

> [!CAUTION]
> Estas credenciais são sensíveis. Não as compartilhe em locais públicos. Elas estão configuradas no AI Manager e no Workflow do n8n.

### n8n (MCP / API Access)
- **Server URL:** `https://n8n.adminfotoplanner.com.br/mcp-server/http`
- **Access Token:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNDg5M2RiYS1mOTljLTQ0NTctOGZlZS02MGJmOWE3Yzk4YTIiLCJpc3MiOiJuOG4iLCJhdWQiOiJtY3Atc2VydmVyLWFwaSIsImp0aSI6Ijc3ZTM4N2NmLWFkZTctNDczYS1iYzg3LWQ5MDZjMTIxYzg1YSIsImlhdCI6MTc3NDk4MTMyM30.O_95x4Cbhj2uKVlqt99qUiqSduhhheWp8_gtzezPsWE`

### WuzAPI (WhatsApp Gateway)
- **Admin Token:** `02f4a31af2c32e132b09360126eb31ea`
- **API Base URL:** `https://wpp.adminfotoplanner.com.br`

## 🛠️ Como Funciona o Fluxo

1. **AI Manager (Frontend):** Você configura a mensagem e o tempo de espera.
2. **AI Manager (Backend):** Serve como o hub de dados, fornecendo a lista de carrinhos abandonados da Nuvemshop e marcando os enviados no Supabase.
3. **n8n Workflow:** Roda a cada X minutos (conforme configurado no Trigger), solicita os carrinhos ao AI Manager, filtra os que já foram enviados e dispara as mensagens via WuzAPI.

## 📦 Importando o Workflow

O JSON do workflow pode ser gerado clicando no botão **"Gerar JSON para n8n"** no painel de Carrinho Abandonado do AI Manager.
Para importar:
1. Abra o seu n8n.
2. Vá em **Workflows** -> **Import from File**.
3. Selecione o arquivo ou cole o conteúdo gerado.

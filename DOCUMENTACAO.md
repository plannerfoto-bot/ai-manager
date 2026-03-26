# 📘 Documentação Mestre: AI Manager (Cloth Sublimação)

Esta documentação detalha o funcionamento, arquitetura e processos de integração do **AI Manager**, o motor de automação e cálculo inteligente desenvolvido para a loja **Cloth Sublimação** na plataforma **Nuvemshop**.

---

## 1. Visão Geral (O que é o AI Manager?)
O AI Manager é um middleware (backend em Node.js) que atua como uma ponte entre a Nuvemshop e a experiência do cliente. Ele resolve dois problemas principais:
1.  **Cálculo de Preço Dinâmico**: Permite que o cliente digite medidas de altura e largura (ex: 2,50m x 3,00m) e receba o preço instantâneo.
2.  **Compra Direta (Under-the-Hood)**: Cria automaticamente variantes "sob medida" na Nuvemshop e as adiciona ao carrinho, eliminando a necessidade de o cliente solicitar orçamento via WhatsApp manualmente.

---

## 2. Arquitetura Técnica

### 🚀 Backend (O Cérebro)
- **Tecnologia**: Node.js v18+ / Express.
- **Hospedagem**: Render (https://ai-manager-nuvemshop.onrender.com).
- **Persistência**: Arquivo `stores.json` local para gerenciar tokens OAuth de múltiplas lojas (Escalabilidade).
- **Endpoints Principais**:
    - `POST /api/simulate-price`: Recebe dimensões e retorna o preço calculado para 120g e 160g.
    - `POST /api/create-variant`: Cria a variante real no produto Nuvemshop, gera o `variant_id` e prepara o link do carrinho.
    - `GET /api/script.js`: Serve o frontend injetável dinamicamente com as variáveis de ambiente corretas.

### 🎨 Frontend (O Injetável)
- **Tecnologia**: JavaScript Puro (Vanilla JS).
- **Injeção**: Feita via API da Nuvemshop (Script Manager).
- **Funcionalidades**:
    - Interface de calculadora elegante na página de produto.
    - Preview de proporção visual (distorção controlada da imagem do produto).
    - Máscaras de entrada (2,00m) e validação de limites (lado mín <= 3m).

---

## 3. Integração com Nuvemshop (OAuth 2.0)

O sistema foi construído como um **Aplicativo Parceiro**.

### Credenciais de Integração (Configuradas no Render/`.env`)
> [!IMPORTANT]
> Estas chaves são o "segredo" da conexão. Nunca as exponha publicamente.

- **NUVEMSHOP_APP_ID**: `28353` (ID do app no portal Nuvemshop).
- **NUVEMSHOP_APP_SECRET**: `53fd680a9b442ac1fffea98076ee1868f17475fa42dd3a83` (Chave de autenticação segura).
- **Scopes Solicitados**: `write_scripts`, `read_products`, `read_shipping`.

### O Processo de Autenticação (Flow)
1.  **Instalação**: O lojista acessa `/api/auth/install`.
2.  **Autorização**: O lojista é levado à página da Nuvemshop para aceitar o app.
3.  **Callback**: A Nuvemshop retorna um `code` para `/api/auth/callback`.
4.  **Token**: O AI Manager troca esse `code` por um `access_token` permanente.
5.  **Injeção Automática**: Assim que o token é gerado, o backend automaticamente faz um POST para a API de Scripts da loja, instalando o motor da calculadora no site.

---

## 4. Integração com Instagram (Graph API)

O AI Manager também possui a capacidade de gerar publicações automáticas com fotos e legendas criadas por inteligência artificial diretamente no Instagram da loja.

### Credenciais da Meta (Geradas via Gerenciador de Negócios)
> [!NOTE]
> Este token foi gerado via "Usuários do sistema" no Meta Business para ser definitivo (nunca expirar).

- **Facebook Page ID**: `1239980869347062`
- **Meta Access Token**: `EAANSfEdZC0TYBRId2sWf27KDIqUxiDkyTZBu8d5Xl7rnVlLksSvZCbYqmSDavtmbitw7XJnWZCVW8ZAfPdhpT3puIihqu5c6aYt99tRXAoyJytlZB5VkcwQ03zDR3105vJH9y7tTk8wj1nSZCnmMar0JUvxvuMO3I4spa9zQyNcxRe3ONHwqYUnBwxM3F9leKRtqgZDZD`
- **Permissões Concedidas**: `pages_read_engagement, pages_show_list, instagram_basic, instagram_content_publish`.

---

## 5. Lógica da Calculadora (Matemática de Preço)

A lógica central está na função `calcMeasure` dentro do `backend.js`. As regras são:

### Fatores de Custo
- **Tecido 120g**: R$ 22,50 por metro.
- **Tecido 160g**: R$ 26,00 por metro.

### Regras de Cálculo
1.  **Regra Especial (Sem Emenda)**: Se uma das dimensões estiver entre **1,56m e 1,74m**, o preço é fixo por m² + taxa de manuseio, disponível apenas em 120g.
    - `Preço = (H * W * 24.90) + 65.00`
2.  **Regra A (Menor lado <= 1,56m)**:
    - `Preço = (Maior_Dimensao * Fator) + 3.00 + 45.00`
3.  **Regra B (Ambas > 1,56m)**:
    - `Preço = (((Maior_Dimensao * 2) * Fator) + 15.00) * 1.80`

### Restrições
- A **menor dimensão** nunca pode ultrapassar **3,00m** (limite físico do maquinário/transporte).

---

## 5. Fluxo Detalhado: "Comprar Agora" (Integração Direta)

Quando o cliente clica em **"Comprar Agora"** na calculadora, o seguinte processo ocorre em milissegundos:

1.  **Validação**: O frontend valida se as medidas são numéricas e respeitam os limites.
2.  **Chamada API (`/api/create-variant`)**: O script envia para o backend:
    - `productId`: ID do produto atual.
    - `measures`: String formatada (ex: "2.50x3.00").
    - `gramatura`: Opção selecionada ("120g" ou "160g").
    - `price`: Preço que foi simulado anteriormente.
3.  **Criação da Variante**: O backend consulta a Nuvemshop. Se já existir uma variante com exatamente essas Medidas + Gramatura, ele a reaproveita. Caso contrário, cria uma nova.
4.  **Redirecionamento**: O backend retorna o `variant_id`. O frontend então redireciona o cliente para: `https://LOJA.com.br/cart/add/VARIANT_ID`.
5.  **Carrinho**: O cliente cai direto na página de checkout/carrinho com o item configurado, sem passar pela página de produto padrão novamente.

---

## 6. Scripts de Suporte e Admin

Além do servidor principal (`backend.js`), existem ferramentas úteis no diretório:

- **`get_token_v4.js`**: Usado para gerar um novo token de acesso caso o atual expire. Basta rodar `node get_token_v4.js` e colar o código de autorização gerado no painel da Nuvemshop.
- **`test-auth.js`**: Um script rápido para verificar se a conexão com a API da Nuvemshop está ativa e qual loja está respondendo.
- **`cleanup` (Interno)**: Rotina automática que limpa variantes "fantasmas" (não vendidas) para manter a performance da loja.

---

## 7. Gerenciamento de Variantes Dinâmicas

Para evitar "entupir" o catálogo da Nuvemshop com milhares de tamanhos:
1.  **Criação Sob Demanda**: Quando o cliente clica em "Comprar Agora", o sistema cria a variante exata (ex: 2,52m x 2,10m) no produto.
2.  **ID de Rastreio (SKU)**: As variantes criadas recebem um SKU no formato `calc:TIMESTAMP`.
3.  **Faxina 24h (Cleanup)**: Um robô interno roda a cada 30 minutos e deleta variantes `calc:` criadas há mais de 24 horas, **desde que não tenham sido vendidas** (o sistema checa os pedidos recentes antes de deletar).

---

## 8. Como Fazer Deploy / Atualizar

O projeto está configurado para **Deploy Contínuo** via GitHub + Render.

1.  **Repositório**: `https://github.com/plannerfoto-bot/ai-manager` (Branch: `main`).
2.  **Processo**:
    ```bash
    git add .
    git commit -m "Explicação da Mudança"
    git push origin main
    ```
3.  **Auto-Deploy**: O Render detecta o `push` e reconstrói o servidor automaticamente.

### Variáveis de Ambiente Necessárias (Render Settings)
- `NUVEMSHOP_APP_ID`: 28353
- `NUVEMSHOP_APP_SECRET`: (Ver item 3)
- `PUBLIC_URL`: https://ai-manager-nuvemshop.onrender.com

---

## 7. Troubleshooting (Resolução de Problemas)

- **Calculadora não aparece?**
    - Verifique se o token de acesso no `stores.json` expirou ou se o script está injetado (`GET /api/me` para testar).
- **Preço divergente?**
    - Verifique a gramatura selecionada e se as medidas caíram na "Regra Especial".
- **Erro de CORS?**
    - O frontend deve ter o domínio da loja autorizado no `cors()` do backend.

---

## 9. Detecção Dinâmica de Variantes (Inteligência Preventiva)

Para garantir que a calculadora não crie variantes duplicadas e incentive o uso do estoque padrão da loja:
- **Varredura de DOM**: Ao abrir a página e ao clicar em "Simular", o script escaneia seletores como `.js-variant-option` e `.js-insta-variant`.
- **Bloqueio de Cálculo**: Se as medidas digitadas (largura x altura) já existirem como uma opção de "Tamanho" no produto, a calculadora exibe um aviso em vez do preço.
- **Normalização**: O sistema ignora a ordem (L x A ou A x L) e pontuação (vírgula vs ponto) ao comparar, garantindo precisão total na detecção.

---
**Cloth Sublimação - Tecnologia & Precisão**
*Documentação atualizada em Março de 2026.*

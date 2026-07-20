// Estado da extensão (se está ativada ou não)
let isExtensionEnabled = true;

// 1. Carrega o estado inicial da extensão
chrome.storage.local.get({ enabled: true }, (result) => {
  isExtensionEnabled = result.enabled;
  if (isExtensionEnabled) {
    iniciarObservador();
  }
});

// 2. Escuta mensagens enviadas pelo popup sobre mudança de estado
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggle_extension') {
    isExtensionEnabled = message.enabled;
    console.log(`[Duplicador] Extensão ${isExtensionEnabled ? 'ATIVADA' : 'DESATIVADA'}`);
    
    if (isExtensionEnabled) {
      iniciarObservador();
      detectarEInjetarBotao(); // Faz um check imediato ao ligar
    } else {
      removerBotaoInjetado();
    }
  }
  return true;
});

// 3. Monitoramento do DOM para detectar quando o modal "Duplicar produto" abre
let observadorDOM = null;

function iniciarObservador() {
  if (observadorDOM) return; // Já está rodando

  observadorDOM = new MutationObserver((mutations) => {
    if (!isExtensionEnabled) return;
    
    // Para performance, verificamos a cada lote de mudanças no DOM
    detectarEInjetarBotao();
  });

  observadorDOM.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  detectarEInjetarBotao(); // Check inicial
}

// 4. Lógica de detecção e injeção do botão de automação
function detectarEInjetarBotao() {
  // Localiza o cabeçalho/título da janela "Duplicar produto" (com seletor robusto multi-tag e limite de comprimento de texto)
  const titulo = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"], div, span, p')].find(elemento => {
    const texto = elemento.textContent.trim();
    // Verifica se o texto contém "Duplicar produto", se o elemento é visível 
    // e se o comprimento total do texto é curto (evitando pegar o modal/página inteira)
    return (texto === "Duplicar produto" || texto.includes("Duplicar produto")) && 
           elemento.offsetHeight > 0 && 
           texto.length < 50;
  });

  if (!titulo) return;

  // Evita duplicar o botão se já estiver injetado
  if (document.getElementById('btn-duplicador-inteligente')) return;

  console.log("[Duplicador] Modal detectado. Injetando botão de automação...");

  // Criamos o botão estilizado com visual premium integrado
  const btn = document.createElement('button');
  btn.id = 'btn-duplicador-inteligente';
  btn.type = 'button';
  btn.innerHTML = '⚡ Copiar para todos';
  
  // Estilo elegante do botão
  btn.style.marginLeft = '16px';
  btn.style.padding = '8px 16px';
  btn.style.backgroundColor = '#5e6ad2';
  btn.style.color = '#ffffff';
  btn.style.border = 'none';
  btn.style.borderRadius = '10px';
  btn.style.cursor = 'pointer';
  btn.style.fontSize = '13px';
  btn.style.fontWeight = 'bold';
  btn.style.boxShadow = '0 4px 10px rgba(94, 106, 210, 0.25)';
  btn.style.transition = 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)';
  btn.style.display = 'inline-flex';
  btn.style.alignItems = 'center';
  btn.style.gap = '6px';
  
  // Efeitos de Hover e Active
  btn.onmouseover = () => {
    btn.style.backgroundColor = '#4c57b5';
    btn.style.transform = 'translateY(-1px)';
    btn.style.boxShadow = '0 6px 14px rgba(94, 106, 210, 0.35)';
  };
  btn.onmouseout = () => {
    btn.style.backgroundColor = '#5e6ad2';
    btn.style.transform = 'translateY(0)';
    btn.style.boxShadow = '0 4px 10px rgba(94, 106, 210, 0.25)';
  };
  btn.onmousedown = () => {
    btn.style.transform = 'scale(0.97)';
  };
  btn.onmouseup = () => {
    btn.style.transform = 'translateY(-1px)';
  };

  // Lógica de clique do botão
  btn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    executarCopiarCampos(btn, titulo);
  };

  // Insere o botão logo ao lado do elemento de título
  titulo.style.display = 'inline-flex';
  titulo.style.alignItems = 'center';
  titulo.appendChild(btn);
}

// 5. Remove o botão se a extensão for desativada na hora
function removerBotaoInjetado() {
  const btn = document.getElementById('btn-duplicador-inteligente');
  if (btn) {
    btn.remove();
  }
}

// 6. Lógica que duplica o valor do primeiro campo para os demais
function executarCopiarCampos(btn, titulo) {
  // Acha a área/modal contendo os campos
  let area = titulo.closest('[role="dialog"]');

  // Fallback caso a loja não utilize o atributo role="dialog"
  if (!area) {
    area = titulo.parentElement;
    while (area && area !== document.body) {
      const quantidadeCampos = area.querySelectorAll(
        'input[type="text"], input:not([type])'
      ).length;

      if (quantidadeCampos >= 2) break;
      area = area.parentElement;
    }
  }

  area = area || document;

  // Filtra apenas os inputs que estão visíveis, habilitados e editáveis
  const campos = [...area.querySelectorAll(
    'input[type="text"], input:not([type])'
  )].filter(campo =>
    campo.offsetParent !== null &&
    !campo.disabled &&
    !campo.readOnly &&
    campo.id !== 'btn-duplicador-inteligente'
  );

  if (campos.length < 2) {
    alert("⚠️ Não foram encontrados campos editáveis suficientes no formulário.");
    return;
  }

  const primeiroCampo = campos[0];
  const texto = primeiroCampo.value;

  if (!texto.trim()) {
    alert("✏️ Por favor, digite o nome/código no primeiro campo primeiro.");
    primeiroCampo.focus();
    return;
  }

  // Setter do protótipo nativo para contornar qualquer reatividade do React/Vue
  const definirValor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  ).set;

  let camposPreenchidos = 0;

  // Preenche do segundo campo em diante
  campos.slice(1).forEach(campo => {
    try {
      definirValor.call(campo, texto);

      // Despacha eventos para avisar o framework reativo do site
      campo.dispatchEvent(new Event("input", { bubbles: true }));
      campo.dispatchEvent(new Event("change", { bubbles: true }));
      
      camposPreenchidos++;
    } catch (err) {
      console.error("[Duplicador] Falha ao preencher campo:", err);
    }
  });

  console.log(`[Duplicador] Concluído: ${camposPreenchidos} campos preenchidos com "${texto}".`);

  // Feedback visual de sucesso no botão
  const originalText = btn.innerHTML;
  btn.innerHTML = '✅ Copiado com sucesso!';
  btn.style.backgroundColor = '#10b981';
  btn.style.boxShadow = '0 4px 10px rgba(16, 185, 129, 0.25)';
  
  // Reseta o botão após 2 segundos
  setTimeout(() => {
    btn.innerHTML = originalText;
    btn.style.backgroundColor = '#5e6ad2';
    btn.style.boxShadow = '0 4px 10px rgba(94, 106, 210, 0.25)';
  }, 2000);
}

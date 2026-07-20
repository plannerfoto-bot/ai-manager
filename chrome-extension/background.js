// Service worker da extensão do Chrome. Atua como ponte entre abas de diferentes origens.

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "CLICK_WATERMARK") {
    console.log(`[Duplicador Background] Imagem recebida: "${request.name}". Procurando abas da Nuvemshop...`);
    
    // Procura por abas abertas no painel administrativo da Nuvemshop
    chrome.tabs.query({
      url: [
        "*://*.nuvemshop.com.br/*",
        "*://*.lojavirtualnuvem.com.br/*",
        "*://*.tiendanube.com/*",
        "*://*.mitiendanube.com/*"
      ]
    }, (tabs) => {
      if (tabs.length === 0) {
        console.warn("[Duplicador Background] Nenhuma aba ativa do painel da Nuvemshop encontrada.");
      } else {
        console.log(`[Duplicador Background] Enviando imagem para ${tabs.length} aba(s) da Nuvemshop.`);
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            type: "INJECT_WATERMARK",
            dataUrl: request.dataUrl,
            name: request.name
          });
        });
      }
    });

    sendResponse({ status: "processed" });
  }
  return true;
});

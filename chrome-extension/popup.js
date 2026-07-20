document.addEventListener('DOMContentLoaded', () => {
  const toggleSwitch = document.getElementById('toggle-switch');
  const statusBadge = document.getElementById('status-badge');

  // 1. Carrega o estado atual da extensão do storage do Chrome (padrão é ativado: true)
  chrome.storage.local.get({ enabled: true }, (result) => {
    toggleSwitch.checked = result.enabled;
    updateStatusUI(result.enabled);
  });

  // 2. Escuta mudanças no switch toggle
  toggleSwitch.addEventListener('change', () => {
    const isEnabled = toggleSwitch.checked;
    
    // Salva o novo estado no storage
    chrome.storage.local.set({ enabled: isEnabled }, () => {
      updateStatusUI(isEnabled);
      
      // Notifica as abas ativas sobre a mudança de estado
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { 
            action: 'toggle_extension', 
            enabled: isEnabled 
          }).catch(err => {
            // Silencia erros caso a aba ativa não seja um site compatível/injetado
            console.log("Aba ativa não compatível com script de injeção.");
          });
        }
      });
    });
  });

  // Função auxiliar para atualizar a interface do popup
  function updateStatusUI(isEnabled) {
    if (isEnabled) {
      statusBadge.textContent = 'Ativo';
      statusBadge.className = 'status-badge status-active';
    } else {
      statusBadge.textContent = 'Inativo';
      statusBadge.className = 'status-badge status-inactive';
    }
  }
});

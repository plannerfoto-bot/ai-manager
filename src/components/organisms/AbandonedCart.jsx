import { useState, useEffect, useCallback } from 'react';
import { User, MapPin, Package, ExternalLink, ChevronLeft, Send, Phone, Mail } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

const DEFAULT_TEMPLATE = `Olá {{nome}}! 👋

Você deixou alguns itens no carrinho da *Fundo Fotográfico Cloth*:

{{produtos}}

💰 *Total: R$ {{total}}*

Finalize sua compra aqui:
{{link}}

Qualquer dúvida estamos à disposição! 😊`;

const VARIABLES = [
  { tag: '{{nome}}',     desc: 'Nome do cliente' },
  { tag: '{{produtos}}', desc: 'Lista de produtos' },
  { tag: '{{total}}',    desc: 'Valor total' },
  { tag: '{{link}}',     desc: 'Link do carrinho' },
  { tag: '{{frete}}',    desc: 'Custo do frete' },
];

function StatusBadge({ status }) {
  const map = {
    sent:   { color: '#10b981', label: 'Enviado' },
    error:  { color: '#ef4444', label: 'Erro' },
    skipped:{ color: '#f59e0b', label: 'Ignorado' },
  };
  const s = map[status] || { color: '#6b7280', label: status };
  return (
    <span style={{
      background: s.color + '22', color: s.color,
      padding: '2px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600
    }}>{s.label}</span>
  );
}

export default function AbandonedCart({ storeId }) {
  // Se storeId não vier por prop, tenta pegar do localStorage como fallback
  const finalStoreId = storeId || localStorage.getItem('last_store_id');

  const [config, setConfig]     = useState(null);
  const [history, setHistory]   = useState([]);
  const [carts, setCarts]       = useState([]);
  const [saving, setSaving]     = useState(false);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('config');
  const [saved, setSaved]       = useState(false);
  const [msg, setMsg]           = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [selectedCart, setSelectedCart] = useState(null);
  const [manualSending, setManualSending] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const fetchOptions = {
        headers: { 'x-store-id': finalStoreId }
      };
      const [cfgRes, histRes, cartsRes] = await Promise.all([
        fetch(`${API}/api/abandoned-cart/settings`, fetchOptions).then(r => r.json()),
        fetch(`${API}/api/abandoned-cart/history`, fetchOptions).then(r => r.json()),
        fetch(`${API}/api/abandoned-cart/checkouts`, fetchOptions).then(r => r.json()),
      ]);
      if (cfgRes.success) setConfig(cfgRes.data);
      if (histRes.success) setHistory(histRes.data);
      if (cartsRes.success) setCarts(cartsRes.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const save = async () => {
    setSaving(true);
    setMsg('');
    try {
      const res = await fetch(`${API}/api/abandoned-cart/settings`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-store-id': finalStoreId 
        },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setMsg('✅ Configurações salvas com sucesso!');
        setTimeout(() => setSaved(false), 3000);
      } else {
        setMsg('❌ Erro ao salvar: ' + data.error);
      }
    } catch (e) {
      setMsg('❌ Erro de conexão');
    }
    setSaving(false);
  };

  const sendTest = async () => {
    if (!testPhone) return alert('Digite um número de telefone para teste.');
    setTestSending(true);
    setMsg('');
    try {
      // Monta mensagem de preview substituindo variáveis com dados de exemplo
      const preview = (config?.message_template || DEFAULT_TEMPLATE)
        .replace('{{nome}}', 'Cliente Teste')
        .replace('{{produtos}}', '• Fundo Fotográfico Azul x1 — R$ 94,00')
        .replace('{{total}}', '94,00')
        .replace('{{link}}', 'https://www.fundofotograficocloth.com.br/checkout/...')
        .replace('{{frete}}', '0,00');

      const res = await fetch(`${config.wuzapi_url}/chat/send/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': config.wuzapi_user_token || config.wuzapi_token,
        },
        body: JSON.stringify({ phone: testPhone.replace(/\D/g, ''), body: preview }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg('✅ Mensagem de teste enviada para ' + testPhone);
      } else {
        setMsg('❌ Erro no envio: ' + JSON.stringify(data));
      }
    } catch (e) {
      setMsg('❌ Erro de conexão com WuzAPI: ' + e.message);
    }
    setTestSending(false);
  };

  const sendManualWhatsApp = async (cart) => {
    if (!cart.customer_phone) return alert('Cliente não possui telefone cadastrado.');
    setManualSending(true);
    setMsg('');
    try {
      // Formata lista de produtos para a mensagem
      const productListStr = cart.line_items?.map(p => `• ${p.name} x${p.quantity} — R$ ${parseFloat(p.price * p.quantity).toFixed(2).replace('.', ',')}`).join('\n') || cart.products;
      
      const bodyText = (config?.message_template || DEFAULT_TEMPLATE)
        .replace(/{{(nome|name)}}/g, cart.customer_name.split(' ')[0])
        .replace(/{{produtos}}/g, productListStr)
        .replace(/{{total}}/g, parseFloat(cart.total).toFixed(2).replace('.', ','))
        .replace(/{{link}}/g, cart.checkout_url)
        .replace(/{{frete}}/g, parseFloat(cart.billing_address?.shipping_cost || 0).toFixed(2).replace('.', ','));

      const manualApi = `${API}/api/abandoned-cart/manual-send`;
      const res = await fetch(manualApi, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phone: cart.customer_phone.replace(/\D/g, ''), 
          message: bodyText,
          customer_name: cart.customer_name,
          products: productListStr,
          total: cart.total,
          checkout_url: cart.checkout_url
        }),
      });

      if (res.ok) {
        setMsg(`✅ Mensagem enviada manualmente via n8n para ${cart.customer_name}!`);
        // Registrar envio no histórico
        await fetch(`${API}/api/abandoned-cart/mark-sent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-store-id': finalStoreId },
          body: JSON.stringify({
            checkout_id: cart.id,
            customer_name: cart.customer_name,
            customer_phone: cart.customer_phone,
            total: cart.total,
            products: cart.products,
            status: 'sent'
          })
        });
        loadAll(); // Recarrega histórico para atualizar o painel
      } else {
        const errText = await res.text();
        setMsg('❌ Erro no n8n: ' + errText);
      }
    } catch (e) {
      setMsg('❌ Erro de conexão com WuzAPI: ' + e.message);
    }
    setManualSending(false);
  };

  if (loading || !config) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200, color: '#9ca3af' }}>
      <div>⏳ Carregando...</div>
    </div>
  );

  const previewMsg = (config.message_template || DEFAULT_TEMPLATE)
    .replace('{{nome}}', 'Maria Silva')
    .replace('{{produtos}}', '• Fundo Fotográfico Azul Céu x2 — R$ 188,00')
    .replace('{{total}}', '188,00')
    .replace('{{link}}', 'https://www.fundofotograficocloth.com.br/checkout/...')
    .replace('{{frete}}', '0,00');

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>
            🛒 Carrinho Abandonado
          </h2>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 14 }}>
            Recupere clientes automaticamente via WhatsApp
          </p>
        </div>
        {/* Toggle ON/OFF */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#94a3b8', fontSize: 14 }}>Automação</span>
          <div
            onClick={() => setConfig(c => ({ ...c, enabled: !c.enabled }))}
            style={{
              width: 52, height: 28, borderRadius: 99, cursor: 'pointer',
              background: config.enabled ? '#10b981' : '#374151',
              position: 'relative', transition: 'background 0.2s'
            }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: '50%', background: '#fff',
              position: 'absolute', top: 3,
              left: config.enabled ? 27 : 3,
              transition: 'left 0.2s'
            }} />
          </div>
          <span style={{
            color: config.enabled ? '#10b981' : '#6b7280',
            fontWeight: 600, fontSize: 13
          }}>
            {config.enabled ? 'ATIVO' : 'INATIVO'}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Carrinhos Abertos', value: carts.length, color: '#f59e0b', icon: '🛒' },
          { label: 'Mensagens Enviadas', value: history.filter(h => h.status === 'sent').length, color: '#10b981', icon: '✅' },
          { label: 'Delay Atual', value: config.delay_minutes >= 60 ? `${config.delay_minutes / 60}h` : `${config.delay_minutes}min`, color: '#6366f1', icon: '⏱️' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#1e293b', borderRadius: 12, padding: '16px 20px',
            border: `1px solid ${s.color}33`
          }}>
            <div style={{ fontSize: 24 }}>{s.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #334155' }}>
        {[
          { id: 'config', label: '⚙️ Configurações' },
          { id: 'history', label: '📋 Histórico' },
          { id: 'carts', label: `🛒 Carrinhos Abertos (${carts.length})` },
          tab === 'details' && { id: 'details', label: '👤 Ficha do Cliente' },
          { id: 'n8n', label: '🔗 Workflow n8n' },
        ].filter(Boolean).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 18px', border: 'none', cursor: 'pointer',
            background: tab === t.id ? '#6366f1' : 'transparent',
            color: tab === t.id ? '#fff' : '#94a3b8',
            borderRadius: '8px 8px 0 0', fontWeight: tab === t.id ? 600 : 400,
            fontSize: 14, transition: 'all 0.15s'
          }}>{t.label}</button>
        ))}
      </div>

      {/* ===== TAB: CONFIGURAÇÕES ===== */}
      {tab === 'config' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Coluna esquerda: controles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            <div style={{ background: '#1e293b', borderRadius: 12, padding: 20 }}>
              <label style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>
                ⏱️ Enviar mensagem após (minutos)
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {[30, 60, 120, 240, 1440].map(m => (
                  <button key={m} onClick={() => setConfig(c => ({ ...c, delay_minutes: m }))}
                    style={{
                      padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: config.delay_minutes === m ? '#6366f1' : '#334155',
                      color: '#fff', fontSize: 13, fontWeight: 600
                    }}>
                    {m >= 1440 ? '1 dia' : m >= 60 ? `${m / 60}h` : `${m}min`}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={config.delay_minutes}
                onChange={e => setConfig(c => ({ ...c, delay_minutes: Number(e.target.value) }))}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8,
                  background: '#0f172a', border: '1px solid #334155',
                  color: '#f1f5f9', fontSize: 15,
                }}
              />
              <div style={{ color: '#64748b', fontSize: 12, marginTop: 6 }}>
                📌 Carrinho criado há <strong style={{ color: '#6366f1' }}>{config.delay_minutes} min</strong> → mensagem disparada
              </div>
            </div>

            <div style={{ background: '#1e293b', borderRadius: 12, padding: 20 }}>
              <label style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>
                🔑 WuzAPI: Configurações de Conexão
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <span style={{ fontSize: 11, color: '#64748b' }}>URL da Instância</span>
                  <input
                    type="text"
                    placeholder="https://wpp.adminfotoplanner.com.br"
                    value={config.wuzapi_url || ''}
                    onChange={e => setConfig(c => ({ ...c, wuzapi_url: e.target.value }))}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 8,
                      background: '#0f172a', border: '1px solid #334155',
                      color: '#f1f5f9', fontSize: 14, marginTop: 4
                    }}
                  />
                </div>
                <div>
                  <span style={{ fontSize: 11, color: '#64748b' }}>WuzAPI Token (Admin/Sessão)</span>
                  <input
                    type="password"
                    placeholder="Seu token WuzAPI"
                    value={config.wuzapi_token || ''}
                    onChange={e => setConfig(c => ({ ...c, wuzapi_token: e.target.value }))}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 8,
                      background: '#0f172a', border: '1px solid #334155',
                      color: '#f1f5f9', fontSize: 14, marginTop: 4
                    }}
                  />
                </div>
                <div>
                  <span style={{ fontSize: 11, color: '#64748b' }}>WuzAPI User Token (Opcional)</span>
                  <input
                    type="password"
                    placeholder="Token do usuário específico"
                    value={config.wuzapi_user_token || ''}
                    onChange={e => setConfig(c => ({ ...c, wuzapi_user_token: e.target.value }))}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 8,
                      background: '#0f172a', border: '1px solid #334155',
                      color: '#f1f5f9', fontSize: 14, marginTop: 4
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ background: '#1e293b', borderRadius: 12, padding: 20 }}>
              <label style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>
                📱 Template da Mensagem
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {VARIABLES.map(v => (
                  <span key={v.tag}
                    onClick={() => setConfig(c => ({ ...c, message_template: (c.message_template || '') + v.tag }))}
                    title={v.desc}
                    style={{
                      background: '#6366f133', color: '#818cf8',
                      padding: '3px 10px', borderRadius: 6, fontSize: 12,
                      cursor: 'pointer', fontFamily: 'monospace'
                    }}>{v.tag}</span>
                ))}
              </div>
              <textarea
                rows={10}
                value={config.message_template || DEFAULT_TEMPLATE}
                onChange={e => setConfig(c => ({ ...c, message_template: e.target.value }))}
                style={{
                  width: '100%', padding: '12px', borderRadius: 8,
                  background: '#0f172a', border: '1px solid #334155',
                  color: '#f1f5f9', fontSize: 13, fontFamily: 'monospace',
                  resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ background: '#1e293b', borderRadius: 12, padding: 20 }}>
              <label style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 12 }}>
                🧪 Enviar Teste
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="5521999999999"
                  value={testPhone}
                  onChange={e => setTestPhone(e.target.value)}
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: 8,
                    background: '#0f172a', border: '1px solid #334155',
                    color: '#f1f5f9', fontSize: 14,
                  }}
                />
                <button onClick={sendTest} disabled={testSending} style={{
                  padding: '10px 18px', borderRadius: 8, border: 'none',
                  background: '#059669', color: '#fff', cursor: 'pointer',
                  fontWeight: 600, whiteSpace: 'nowrap'
                }}>
                  {testSending ? '⏳' : '📱 Testar'}
                </button>
              </div>
              <div style={{ color: '#64748b', fontSize: 12, marginTop: 6 }}>
                Enviar mensagem de exemplo com dados fictícios
              </div>
            </div>
          </div>

          {/* Coluna direita: preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: '#1e293b', borderRadius: 12, padding: 20 }}>
              <div style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
                👁️ Preview da Mensagem
              </div>
              <div style={{
                background: '#0f172a', borderRadius: 12, padding: 16,
                border: '1px solid #1e3a5f', maxWidth: 320, marginBottom: 16
              }}>
                <div style={{
                  background: '#25d366', borderRadius: '12px 12px 12px 0',
                  padding: '10px 14px', color: '#fff', fontSize: 13,
                  lineHeight: 1.6, whiteSpace: 'pre-wrap', maxWidth: 280
                }}>
                  {previewMsg}
                </div>
                <div style={{ color: '#64748b', fontSize: 11, textAlign: 'right', marginTop: 4 }}>
                  {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div style={{ color: '#64748b', fontSize: 12 }}>
                ✳️ Asteriscos = <strong style={{ color: '#f1f5f9' }}>negrito</strong> no WhatsApp
              </div>
            </div>

            {msg && (
              <div style={{
                background: msg.startsWith('✅') ? '#065f4622' : '#7f1d1d22',
                border: `1px solid ${msg.startsWith('✅') ? '#10b981' : '#ef4444'}`,
                borderRadius: 10, padding: '12px 16px',
                color: msg.startsWith('✅') ? '#10b981' : '#f87171',
                fontSize: 14
              }}>{msg}</div>
            )}

            <button onClick={save} disabled={saving || saved} style={{
              padding: '14px 24px', borderRadius: 10, border: 'none',
              background: saved ? '#10b981' : '#6366f1',
              color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: saving ? 'wait' : 'pointer', transition: 'background 0.2s'
            }}>
              {saving ? '⏳ Salvando...' : saved ? '✅ Salvo!' : '💾 Salvar Configurações'}
            </button>
          </div>
        </div>
      )}

      {/* ===== TAB: HISTÓRICO ===== */}
      {tab === 'history' && (
        <div style={{ background: '#1e293b', borderRadius: 12, overflow: 'hidden' }}>
          {history.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
              Nenhum carrinho processado ainda. O histórico aparecerá aqui após o primeiro disparo.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#0f172a' }}>
                  {['Cliente', 'Telefone', 'Total', 'Produtos', 'Status', 'Enviado em'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontSize: 12, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #334155' }}>
                    <td style={{ padding: '12px 16px', color: '#f1f5f9', fontSize: 13 }}>{h.customer_name}</td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 13 }}>{h.customer_phone}</td>
                    <td style={{ padding: '12px 16px', color: '#10b981', fontSize: 13 }}>R$ {h.total}</td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 12 }}>
                      {Array.isArray(h.products) ? h.products.join(', ') : h.products}
                    </td>
                    <td style={{ padding: '12px 16px' }}><StatusBadge status={h.status} /></td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 12 }}>
                      {new Date(h.sent_at).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ===== TAB: CARRINHOS ABERTOS ===== */}
      {tab === 'carts' && (
        <div style={{ background: '#1e293b', borderRadius: 12, overflow: 'hidden' }}>
          {carts.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
              Nenhum carrinho abandonado no momento.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#0f172a' }}>
                  {['Cliente', 'Telefone', 'Total', 'Produtos', 'Criado em'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontSize: 12, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {carts.map((c, i) => {
                  const minAgo = Math.round((Date.now() - new Date(c.created_at).getTime()) / 60000);
                  const willFire = minAgo >= config.delay_minutes;
                  return (
                    <tr key={i} 
                      onClick={() => { setSelectedCart(c); setTab('details'); }}
                      style={{ 
                        borderTop: '1px solid #334155', 
                        background: willFire ? '#10b98108' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#33415555'}
                      onMouseLeave={(e) => e.currentTarget.style.background = willFire ? '#10b98108' : 'transparent'}
                    >
                      <td style={{ padding: '12px 16px', color: '#f1f5f9', fontSize: 13 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <User className="w-3 h-3 text-slate-500" />
                          {c.customer_name || 'Sem nome'}
                        </div>
                        {willFire && <span style={{ marginLeft: 6, fontSize: 10, background: '#f59e0b22', color: '#f59e0b', padding: '2px 6px', borderRadius: 6 }}>Pronto p/ envio</span>}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 13 }}>{c.customer_phone || '—'}</td>
                      <td style={{ padding: '12px 16px', color: '#10b981', fontSize: 13 }}>R$ {c.total}</td>
                      <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 12 }}>
                        {c.products}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 12 }}>
                        {new Date(c.created_at).toLocaleString('pt-BR')} ({minAgo}min atrás)
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ===== TAB: DETALHES DO CARRINHO ===== */}
      {tab === 'details' && selectedCart && (
        <div className="animate-in slide-in-from-right duration-300">
           <button 
            onClick={() => { setTab('carts'); setSelectedCart(null); }}
            style={{ 
              display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', 
              border: 'none', color: '#6366f1', cursor: 'pointer', marginBottom: 20, 
              fontWeight: 600, fontSize: 14 
            }}
          >
            <ChevronLeft className="w-4 h-4" /> Voltar para a lista
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
            {/* Info do Cliente */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              <div style={{ background: '#1e293b', borderRadius: 16, padding: 24, border: '1px solid #334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: '#6366f122', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, color: '#f1f5f9', fontSize: 18 }}>{selectedCart.customer_name}</h3>
                    <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                      <span style={{ fontSize: 13, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Mail className="w-3 h-3" /> {selectedCart.customer_email || 'Email não informado'}
                      </span>
                      <span style={{ fontSize: 13, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Phone className="w-3 h-3" /> {selectedCart.customer_phone || 'Telefone não informado'}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, paddingTop: 20, borderTop: '1px solid #334155' }}>
                  <div>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Endereço de Faturamento</h4>
                    {selectedCart.billing_address ? (
                      <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>
                        <p style={{ margin: 0 }}>{selectedCart.billing_address.address}, {selectedCart.billing_address.number}</p>
                        <p style={{ margin: 0 }}>{selectedCart.billing_address.city} - {selectedCart.billing_address.province}</p>
                        <p style={{ margin: 0 }}>CEP: {selectedCart.billing_address.zipcode}</p>
                      </div>
                    ) : <p style={{ color: '#475569', fontSize: 13 }}>Endereço não disponível</p>}
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Informações Técnicas</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <a href={selectedCart.checkout_url} target="_blank" rel="noreferrer" style={{ 
                        color: '#6366f1', textDecoration: 'none', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 
                      }}>
                        <ExternalLink className="w-3 h-3" /> Link de Recuperação
                      </a>
                      <span style={{ color: '#64748b', fontSize: 12 }}>ID do Checkout: #{selectedCart.id}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ background: '#1e293b', borderRadius: 16, padding: 24, border: '1px solid #334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <Package className="w-5 h-5 text-indigo-400" />
                  <h3 style={{ margin: 0, color: '#f1f5f9', fontSize: 16 }}>Produtos no Carrinho</h3>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155' }}>
                      <th style={{ padding: '0 0 12px 0', textAlign: 'left', color: '#64748b', fontSize: 12 }}>Produto</th>
                      <th style={{ padding: '0 0 12px 0', textAlign: 'center', color: '#64748b', fontSize: 12 }}>Qtd</th>
                      <th style={{ padding: '0 0 12px 0', textAlign: 'right', color: '#64748b', fontSize: 12 }}>Preço</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedCart.line_items || []).map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: idx < selectedCart.line_items.length - 1 ? '1px solid #1e293b' : 'none' }}>
                        <td style={{ padding: '12px 0', color: '#f1f5f9', fontSize: 14 }}>{item.name}</td>
                        <td style={{ padding: '12px 0', color: '#94a3b8', fontSize: 14, textAlign: 'center' }}>{item.quantity}x</td>
                        <td style={{ padding: '12px 0', color: '#10b981', fontSize: 14, textAlign: 'right', fontWeight: 600 }}>R$ {parseFloat(item.price).toFixed(2).replace('.', ',')}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2} style={{ paddingTop: 20, textAlign: 'right', color: '#94a3b8', fontSize: 14 }}>Total:</td>
                      <td style={{ paddingTop: 20, textAlign: 'right', color: '#10b981', fontSize: 20, fontWeight: 800 }}>R$ {parseFloat(selectedCart.total).toFixed(2).replace('.', ',')}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Ações (WhatsApp) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ background: '#1e293b', borderRadius: 16, padding: 24, border: '1px solid #22c55e33', position: 'sticky', top: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <Send className="w-5 h-5 text-green-500" />
                  <h3 style={{ margin: 0, color: '#f1f5f9', fontSize: 16 }}>Recuperação Manual</h3>
                </div>
                <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, marginBottom: 20 }}>
                  Abaixo está o preview da mensagem que será enviada. O sistema substituirá as variáveis automaticamente.
                </p>
                <div style={{ 
                  background: '#0f172a', borderRadius: 12, padding: 12, 
                  fontSize: 12, color: '#64748b', marginBottom: 20, fontStyle: 'italic',
                  border: '1px dashed #334155'
                }}>
                  { (config?.message_template || DEFAULT_TEMPLATE)
                    .replace(/{{(nome|name)}}/g, selectedCart.customer_name.split(' ')[0])
                    .replace(/{{produtos}}/g, selectedCart.products)
                    .replace(/{{total}}/g, parseFloat(selectedCart.total).toFixed(2).replace('.', ','))
                    .replace(/{{link}}/g, selectedCart.checkout_url)
                    .replace(/{{frete}}/g, parseFloat(selectedCart.billing_address?.shipping_cost || 0).toFixed(2).replace('.', ','))
                  }
                </div>
                <button 
                  onClick={() => sendManualWhatsApp(selectedCart)}
                  disabled={manualSending}
                  style={{ 
                    width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                    background: '#22c55e', color: '#fff', fontSize: 14, fontWeight: 700,
                    cursor: manualSending ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    boxShadow: '0 4px 14px 0 rgba(34, 197, 94, 0.3)'
                  }}
                >
                  {manualSending ? '⏳ Enviando...' : <><Send className="w-4 h-4" /> Enviar Mensagem Agora</>}
                </button>
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <span style={{ fontSize: 11, color: '#64748b' }}>A mensagem será enviada via WuzAPI</span>
                </div>
              </div>

              {msg && (
                <div style={{ 
                  background: msg.startsWith('✅') ? '#065f4622' : '#7f1d1d22',
                  border: `1px solid ${msg.startsWith('✅') ? '#10b981' : '#ef4444'}`,
                  borderRadius: 12, padding: '12px 16px',
                  color: msg.startsWith('✅') ? '#10b981' : '#f87171',
                  fontSize: 13
                }}>{msg}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== TAB: WORKFLOW N8N ===== */}
      {tab === 'n8n' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 24 }}>
            <h3 style={{ color: '#f1f5f9', margin: '0 0 12px', fontSize: 16 }}>📥 Como importar o Workflow</h3>
            <ol style={{ color: '#94a3b8', lineHeight: 2.2, paddingLeft: 20, margin: 0, fontSize: 14 }}>
              <li>Acesse seu n8n e clique em <strong style={{ color: '#f1f5f9' }}>+ Novo Workflow</strong></li>
              <li>Clique no menu <strong style={{ color: '#f1f5f9' }}>⋮ → Import from JSON</strong></li>
              <li>Cole o JSON abaixo e clique em <strong style={{ color: '#f1f5f9' }}>Import</strong></li>
              <li>Configure a URL do AI Manager no node <strong style={{ color: '#6366f1' }}>"Config AI Manager"</strong></li>
              <li><strong style={{ color: '#10b981' }}>Ative o workflow</strong> com o toggle e pronto! 🚀</li>
            </ol>
          </div>

          <div style={{ background: '#1e293b', borderRadius: 12, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ color: '#f1f5f9', margin: 0, fontSize: 16 }}>📋 JSON do Workflow n8n</h3>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generateN8nWorkflow(config));
                  setMsg('✅ JSON copiado!');
                  setTimeout(() => setMsg(''), 2000);
                }}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none',
                  background: '#6366f1', color: '#fff', cursor: 'pointer', fontWeight: 600
                }}
              >
                📋 Copiar JSON
              </button>
            </div>
            <pre style={{
              background: '#0f172a', borderRadius: 8, padding: 16,
              color: '#10b981', fontSize: 11, overflowX: 'auto',
              maxHeight: 400, lineHeight: 1.5,
              border: '1px solid #334155'
            }}>
              {generateN8nWorkflow(config)}
            </pre>
            {msg && <div style={{ color: '#10b981', marginTop: 8, fontSize: 13 }}>{msg}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/** Gera o JSON do workflow n8n dinamicamente com as configs atuais */
function generateN8nWorkflow(config) {
  const NUVEMSHOP_TOKEN = '<!-- AUTOMATIZADO VIA AI MANAGER -->';
  const STORE_ID = '<!-- AUTOMATIZADO VIA AI MANAGER -->';
  const AI_MANAGER_URL = window.location.origin;

  const workflow = {
    name: "Carrinho Abandonado - Fundo Fotográfico Cloth",
    nodes: [
      {
        parameters: { rule: { interval: [{ field: "minutes", minutesInterval: 15 }] } },
        id: "node-cron",
        name: "⏰ A cada 15 minutos",
        type: "n8n-nodes-base.scheduleTrigger",
        typeVersion: 1.1,
        position: [240, 300]
      },
      {
        parameters: {
          url: `${AI_MANAGER_URL}/api/abandoned-cart/settings`,
          options: {}
        },
        id: "node-settings",
        name: "🔧 Buscar Configurações",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.2,
        position: [460, 300]
      },
      {
        parameters: {
          conditions: { options: { caseSensitive: true }, conditions: [{ leftValue: "={{ $json.data.enabled }}", rightValue: true, operator: { type: "boolean", operation: "equals" } }] }
        },
        id: "node-check-enabled",
        name: "❓ Automação Ativa?",
        type: "n8n-nodes-base.if",
        typeVersion: 2,
        position: [680, 300]
      },
      {
        parameters: {
          url: `https://api.nuvemshop.com.br/v1/${STORE_ID}/checkouts`,
          sendHeaders: true,
          headerParameters: {
            parameters: [
              { name: "Authentication", value: `bearer ${NUVEMSHOP_TOKEN}` },
              { name: "User-Agent", value: "n8n-AbandonedCart (admin@fundofotograficocloth.com.br)" }
            ]
          },
          sendQuery: true,
          queryParameters: { parameters: [{ name: "per_page", value: "50" }] },
          options: {}
        },
        id: "node-get-checkouts",
        name: "🛒 Buscar Carrinhos Abandonados",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.2,
        position: [900, 200]
      },
      {
        parameters: { fieldToSplitOut: "body", options: {} },
        id: "node-split",
        name: "🔄 Processar cada carrinho",
        type: "n8n-nodes-base.splitInBatches",
        typeVersion: 3,
        position: [1120, 200]
      },
      {
        parameters: {
          conditions: {
            options: { caseSensitive: true },
            conditions: [
              { leftValue: "={{ $json.completed_at }}", rightValue: "", operator: { type: "string", operation: "equals" } },
              { leftValue: "={{ $json.contact_phone }}", rightValue: "", operator: { type: "string", operation: "notEquals" } }
            ],
            combinator: "and"
          }
        },
        id: "node-filter-abandoned",
        name: "❓ Carrinho abandonado com telefone?",
        type: "n8n-nodes-base.if",
        typeVersion: 2,
        position: [1340, 200]
      },
      {
        parameters: {
          url: `=${AI_MANAGER_URL}/api/abandoned-cart/check-sent/{{ $json.id }}`,
          options: {}
        },
        id: "node-check-sent",
        name: "🔍 Já foi contatado?",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.2,
        position: [1560, 100]
      },
      {
        parameters: {
          conditions: {
            conditions: [
              { leftValue: "={{ $json.already_sent }}", rightValue: false, operator: { type: "boolean", operation: "equals" } }
            ]
          }
        },
        id: "node-not-sent-yet",
        name: "❓ Não enviado ainda?",
        type: "n8n-nodes-base.if",
        typeVersion: 2,
        position: [1780, 100]
      },
      {
        parameters: {
          jsCode: `
const checkout = $('🛒 Buscar Carrinhos Abandonados').first().json;
const settings = $('🔧 Buscar Configurações').first().json.data;
const createdAt = new Date(checkout.created_at);
const now = new Date();
const minutesElapsed = Math.round((now - createdAt) / 60000);

if (minutesElapsed < settings.delay_minutes) {
  return [{ json: { skip: true, reason: \`Aguardando delay: \${minutesElapsed}min / \${settings.delay_minutes}min\` } }];
}

// Formatar produtos
const produtos = (checkout.products || [])
  .map(p => \`• \${p.name} x\${p.quantity} — R$ \${parseFloat(p.price * p.quantity).toFixed(2).replace('.', ',')}\`)
  .join('\\n');

// Formatar telefone (remover + e deixar apenas números)
let phone = (checkout.contact_phone || '').replace(/\\D/g, '');
if (phone.startsWith('0')) phone = '55' + phone.substring(1);
if (!phone.startsWith('55')) phone = '55' + phone;

// Substituir template
let message = settings.message_template
  .replace('{{nome}}', checkout.contact_name || 'Cliente')
  .replace('{{produtos}}', produtos)
  .replace('{{total}}', parseFloat(checkout.total).toFixed(2).replace('.', ','))
  .replace('{{link}}', checkout.abandoned_checkout_url || '')
  .replace('{{frete}}', parseFloat(checkout.shipping_cost_customer || 0).toFixed(2).replace('.', ','));

return [{ json: {
  skip: false,
  checkout_id: checkout.id,
  phone,
  message,
  customer_name: checkout.contact_name,
  customer_phone: phone,
  total: checkout.total,
  products: (checkout.products || []).map(p => p.name),
  wuzapi_url: settings.wuzapi_url,
  wuzapi_token: settings.wuzapi_token,
  wuzapi_user_token: settings.wuzapi_user_token
} }];
`
        },
        id: "node-prepare",
        name: "📝 Preparar Mensagem",
        type: "n8n-nodes-base.code",
        typeVersion: 2,
        position: [2000, 100]
      },
      {
        parameters: {
          conditions: {
            conditions: [
              { leftValue: "={{ $json.skip }}", rightValue: false, operator: { type: "boolean", operation: "equals" } }
            ]
          }
        },
        id: "node-check-delay",
        name: "❓ Delay atingido?",
        type: "n8n-nodes-base.if",
        typeVersion: 2,
        position: [2220, 100]
      },
      {
        parameters: {
          url: `={{ $json.wuzapi_url }}/chat/send/text`,
          method: "POST",
          sendHeaders: true,
          headerParameters: {
            parameters: [{ name: "token", value: "={{ $json.wuzapi_user_token || $json.wuzapi_token }}" }]
          },
          sendBody: true,
          bodyParameters: {
            parameters: [
              { name: "phone", value: "={{ $json.phone }}" },
              { name: "body", value: "={{ $json.message }}" }
            ]
          },
          options: {}
        },
        id: "node-send-whatsapp",
        name: "📱 Enviar WhatsApp",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.2,
        position: [2440, 100]
      },
      {
        parameters: {
          url: `${AI_MANAGER_URL}/api/abandoned-cart/mark-sent`,
          method: "POST",
          sendHeaders: true,
          headerParameters: { parameters: [{ name: "Content-Type", value: "application/json" }] },
          sendBody: true,
          specifyBody: "json",
          jsonBody: `={{ JSON.stringify({ checkout_id: $('📝 Preparar Mensagem').item.json.checkout_id, customer_name: $('📝 Preparar Mensagem').item.json.customer_name, customer_phone: $('📝 Preparar Mensagem').item.json.customer_phone, total: $('📝 Preparar Mensagem').item.json.total, products: $('📝 Preparar Mensagem').item.json.products, status: 'sent' }) }}`,
          options: {}
        },
        id: "node-mark-sent",
        name: "✅ Registrar Envio",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.2,
        position: [2660, 100]
      }
    ],
    connections: {
      "⏰ A cada 15 minutos": { main: [[{ node: "🔧 Buscar Configurações", type: "main", index: 0 }]] },
      "🔧 Buscar Configurações": { main: [[{ node: "❓ Automação Ativa?", type: "main", index: 0 }]] },
      "❓ Automação Ativa?": { main: [[{ node: "🛒 Buscar Carrinhos Abandonados", type: "main", index: 0 }], []] },
      "🛒 Buscar Carrinhos Abandonados": { main: [[{ node: "🔄 Processar cada carrinho", type: "main", index: 0 }]] },
      "🔄 Processar cada carrinho": { main: [[{ node: "❓ Carrinho abandonado com telefone?", type: "main", index: 0 }]] },
      "❓ Carrinho abandonado com telefone?": { main: [[{ node: "🔍 Já foi contatado?", type: "main", index: 0 }], []] },
      "🔍 Já foi contatado?": { main: [[{ node: "❓ Não enviado ainda?", type: "main", index: 0 }]] },
      "❓ Não enviado ainda?": { main: [[{ node: "📝 Preparar Mensagem", type: "main", index: 0 }], []] },
      "📝 Preparar Mensagem": { main: [[{ node: "❓ Delay atingido?", type: "main", index: 0 }]] },
      "❓ Delay atingido?": { main: [[{ node: "📱 Enviar WhatsApp", type: "main", index: 0 }], []] },
      "📱 Enviar WhatsApp": { main: [[{ node: "✅ Registrar Envio", type: "main", index: 0 }]] }
    },
    settings: { executionOrder: "v1" },
    meta: { templateCredsSetupCompleted: true }
  };

  return JSON.stringify(workflow, null, 2);
}

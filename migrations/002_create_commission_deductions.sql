-- MIGRAÇÃO DE BANCO DE DADOS: DEDUÇÕES DE COMISSÕES ALINE MARTINS
-- Arquivo: migrations/002_create_commission_deductions.sql

CREATE TABLE IF NOT EXISTS commission_deductions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id VARCHAR(255) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    description TEXT NOT NULL,
    payout_id UUID REFERENCES commissions_history(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Habilitar Row Level Security (RLS) se RLS estiver ativa no restante do projeto
ALTER TABLE commission_deductions ENABLE ROW LEVEL SECURITY;

-- Política simples para permitir leitura e escrita pelo service_role (usado pelo backend)
-- Como o backend usa a chave 'service_role', ele tem acesso total por padrão e ignora RLS.
-- No entanto, se o usuário precisar acessar via client comum autenticado no frontend com JWT, 
-- podemos adicionar políticas apropriadas no futuro se necessário.

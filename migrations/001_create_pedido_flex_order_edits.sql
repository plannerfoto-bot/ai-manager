-- MIGRAÇÃO DE BANCO DE DADOS: PEDIDOFLEX BETA
-- Arquivo: migrations/001_create_pedido_flex_order_edits.sql

CREATE TABLE IF NOT EXISTS pedido_flex_order_edits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id VARCHAR(255) NOT NULL,
    order_id VARCHAR(255) NOT NULL,
    order_number VARCHAR(255) NOT NULL,
    mode VARCHAR(50) NOT NULL, -- 'SIMULATE' | 'REAL'
    status VARCHAR(50) NOT NULL, -- 'SIMULATED', 'PROCESSING', 'API_ACCEPTED', 'VERIFIED', 'FAILED', 'INCONCLUSIVE', 'REVERTED', 'REVERT_FAILED'
    old_line_item_id VARCHAR(255) NOT NULL,
    product_id VARCHAR(255) NOT NULL,
    old_variant_id VARCHAR(255) NOT NULL,
    new_variant_id VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    fulfillment_order_id VARCHAR(255) NOT NULL,
    order_updated_at_before VARCHAR(255),
    order_updated_at_after VARCHAR(255),
    before_snapshot JSONB,
    simulation_snapshot JSONB,
    request_payload_sanitized JSONB,
    response_payload_sanitized JSONB,
    verification_snapshot JSONB,
    http_status INTEGER,
    error_code VARCHAR(255),
    error_message TEXT,
    created_by_user_id UUID,
    new_line_item_id_after VARCHAR(255),
    parent_edit_id UUID REFERENCES pedido_flex_order_edits(id),
    reversal_edit_id UUID REFERENCES pedido_flex_order_edits(id),
    api_accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    reverted_at TIMESTAMP WITH TIME ZONE
);

-- 1. Habilitar RLS (Row Level Security) na tabela
ALTER TABLE pedido_flex_order_edits ENABLE ROW LEVEL SECURITY;

-- 2. Índice único parcial para garantir exclusão mútua atômica nas edições ativas (PROCESSING)
CREATE UNIQUE INDEX IF NOT EXISTS idx_pedido_flex_concurrency 
ON pedido_flex_order_edits (store_id, order_id) 
WHERE status = 'PROCESSING';

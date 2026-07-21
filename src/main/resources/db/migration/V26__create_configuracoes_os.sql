CREATE TABLE configuracoes_os (
    id UUID PRIMARY KEY,
    prazo_baixa_dias INTEGER NOT NULL CHECK (prazo_baixa_dias >= 0),
    prazo_media_dias INTEGER NOT NULL CHECK (prazo_media_dias >= 0),
    prazo_alta_dias INTEGER NOT NULL CHECK (prazo_alta_dias >= 0),
    prazo_critica_dias INTEGER NOT NULL CHECK (prazo_critica_dias >= 0),
    prioridade_padrao VARCHAR(20) NOT NULL,
    responsavel_padrao_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    permitir_sem_responsavel BOOLEAN NOT NULL,
    status_inicial VARCHAR(40) NOT NULL,
    exigir_analise_antes_cliente BOOLEAN NOT NULL,
    exigir_aprovacao_admin_antes_cliente BOOLEAN NOT NULL,
    atualizado_em TIMESTAMPTZ NOT NULL
);

INSERT INTO configuracoes_os (
    id, prazo_baixa_dias, prazo_media_dias, prazo_alta_dias, prazo_critica_dias,
    prioridade_padrao, permitir_sem_responsavel, status_inicial,
    exigir_analise_antes_cliente, exigir_aprovacao_admin_antes_cliente, atualizado_em
) VALUES (
    '00000000-0000-0000-0000-000000000002', 10, 5, 2, 1,
    'MEDIA', TRUE, 'RECEBIDA', FALSE, TRUE, CURRENT_TIMESTAMP
);

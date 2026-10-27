CREATE TABLE configuracoes_pagamento (
    id UUID PRIMARY KEY,
    mercado_pago_token_cifrado TEXT,
    mercado_pago_chave_publica VARCHAR(255),
    expiracao_link_minutos INTEGER NOT NULL CHECK (expiracao_link_minutos BETWEEN 5 AND 10080),
    cobrar_automaticamente_os_finalizada BOOLEAN NOT NULL,
    permitir_os_sem_cobranca BOOLEAN NOT NULL,
    atualizado_em TIMESTAMPTZ NOT NULL
);

INSERT INTO configuracoes_pagamento (
    id, expiracao_link_minutos, cobrar_automaticamente_os_finalizada,
    permitir_os_sem_cobranca, atualizado_em
) VALUES (
    '00000000-0000-0000-0000-000000000004', 1440, TRUE, TRUE, CURRENT_TIMESTAMP
);


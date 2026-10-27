CREATE TABLE configuracoes_whatsapp (
    id UUID PRIMARY KEY,
    habilitado BOOLEAN NOT NULL DEFAULT FALSE,
    provedor VARCHAR(20) NOT NULL DEFAULT 'CALLMEBOT',
    credencial_cifrada TEXT,
    numero_padrao VARCHAR(32),
    meta_phone_number_id VARCHAR(100),
    atualizado_em TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_configuracoes_whatsapp_provedor CHECK (provedor IN ('CALLMEBOT', 'META'))
);

INSERT INTO configuracoes_whatsapp (id, habilitado, provedor, atualizado_em)
VALUES ('00000000-0000-0000-0000-000000000003', FALSE, 'CALLMEBOT', CURRENT_TIMESTAMP);


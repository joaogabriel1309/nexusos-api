CREATE TABLE configuracoes_empresa (
    id UUID PRIMARY KEY,
    nome VARCHAR(160) NOT NULL,
    logo TEXT,
    documento VARCHAR(18),
    email VARCHAR(160),
    telefone VARCHAR(32),
    endereco VARCHAR(300),
    cor_principal VARCHAR(7) NOT NULL,
    atualizado_em TIMESTAMPTZ NOT NULL
);

INSERT INTO configuracoes_empresa (id, nome, cor_principal, atualizado_em)
VALUES ('00000000-0000-0000-0000-000000000001', 'NexusOS', '#087EA4', CURRENT_TIMESTAMP);

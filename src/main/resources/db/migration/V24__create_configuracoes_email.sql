CREATE TABLE configuracoes_email (
    id UUID PRIMARY KEY,
    habilitado BOOLEAN NOT NULL DEFAULT FALSE,
    smtp_host VARCHAR(255),
    smtp_port INTEGER,
    smtp_usuario VARCHAR(255),
    smtp_senha_cifrada TEXT,
    email_remetente VARCHAR(255),
    atualizado_em TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_configuracoes_email_porta CHECK (smtp_port IS NULL OR smtp_port BETWEEN 1 AND 65535)
);

INSERT INTO configuracoes_email (id, habilitado, atualizado_em)
VALUES ('00000000-0000-0000-0000-000000000002', FALSE, CURRENT_TIMESTAMP);

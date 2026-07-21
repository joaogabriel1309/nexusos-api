CREATE TABLE configuracoes_github (
    id UUID PRIMARY KEY,
    habilitado BOOLEAN NOT NULL DEFAULT FALSE,
    owner VARCHAR(255),
    repositorio VARCHAR(255),
    token_criptografado TEXT,
    branch_principal VARCHAR(255),
    criado_em TIMESTAMPTZ NOT NULL,
    atualizado_em TIMESTAMPTZ NOT NULL
);

INSERT INTO configuracoes_github (id, habilitado, criado_em, atualizado_em)
VALUES ('00000000-0000-0000-0000-000000000006', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

ALTER TABLE ordens_servico
    ADD COLUMN branch_github VARCHAR(255),
    ADD COLUMN pull_request_numero INTEGER,
    ADD COLUMN pull_request_url TEXT,
    ADD COLUMN pull_request_status VARCHAR(40),
    ADD COLUMN commits_github TEXT,
    ADD COLUMN arquivos_alterados_github TEXT,
    ADD COLUMN ultima_sincronizacao_github TIMESTAMPTZ;

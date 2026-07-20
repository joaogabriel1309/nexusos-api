create table password_reset_tokens (
    id uuid primary key,
    usuario_id uuid not null references usuarios(id) on delete cascade,
    token_hash varchar(128) not null unique,
    expira_em timestamptz not null,
    usado_em timestamptz,
    criado_em timestamptz not null
);

create index idx_password_reset_tokens_usuario on password_reset_tokens(usuario_id);
create index idx_password_reset_tokens_expira_em on password_reset_tokens(expira_em);

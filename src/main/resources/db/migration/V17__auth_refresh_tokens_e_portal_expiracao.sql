create table refresh_tokens (
    id uuid primary key,
    usuario_id uuid not null references usuarios(id) on delete cascade,
    token_hash varchar(128) not null unique,
    substituido_por_hash varchar(128),
    expira_em timestamptz not null,
    revogado_em timestamptz,
    criado_em timestamptz not null
);

create index idx_refresh_tokens_usuario on refresh_tokens(usuario_id);
create index idx_refresh_tokens_expira_em on refresh_tokens(expira_em);

alter table clientes
    add column token_acesso_expira_em timestamptz;

update clientes
set token_acesso_expira_em = now() + interval '90 days'
where token_acesso_expira_em is null;

alter table clientes
    alter column token_acesso_expira_em set not null;

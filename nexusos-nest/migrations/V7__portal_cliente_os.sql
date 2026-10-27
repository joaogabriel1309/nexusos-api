alter table clientes
    add column token_acesso varchar(80);

update clientes
set token_acesso = md5(id::text || random()::text || clock_timestamp()::text)
    || md5(random()::text || clock_timestamp()::text)
where token_acesso is null;

alter table clientes
    alter column token_acesso set not null;

alter table clientes
    add constraint uk_clientes_token_acesso unique (token_acesso);

create index idx_clientes_token_acesso on clientes(token_acesso);

alter table ordens_servico
    add column aprovada_pelo_cliente boolean,
    add column aprovado_pelo_cliente_em timestamp with time zone,
    add column observacao_aprovacao_cliente text;

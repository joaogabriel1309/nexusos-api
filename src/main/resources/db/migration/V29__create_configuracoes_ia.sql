create table configuracoes_ia (
    id uuid primary key,
    habilitado boolean not null default false,
    api_url varchar(300) not null,
    modelo varchar(100) not null,
    api_key_criptografada text,
    temperatura numeric(3,2) not null default 0.2,
    atualizado_em timestamptz not null default now()
);

insert into configuracoes_ia (id, habilitado, api_url, modelo, temperatura)
values ('00000000-0000-0000-0000-000000000006', false,
        'https://api.openai.com/v1/chat/completions', 'gpt-4o-mini', 0.2);

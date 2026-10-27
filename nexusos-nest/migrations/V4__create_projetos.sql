create table projetos (
    id uuid primary key,
    nome varchar(160) not null,
    descricao text,
    ativo boolean not null,
    criado_em timestamptz not null,
    atualizado_em timestamptz not null
);

alter table ordens_servico
    add column projeto_id uuid references projetos(id);

create index idx_projetos_ativo on projetos(ativo);
create index idx_ordens_servico_projeto on ordens_servico(projeto_id);

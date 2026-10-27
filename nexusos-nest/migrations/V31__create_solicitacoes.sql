create sequence solicitacoes_codigo_seq start with 1 increment by 1;

create table solicitacoes (
    id uuid primary key,
    codigo bigint not null unique,
    titulo varchar(180) not null,
    descricao text not null,
    cliente_id uuid not null references clientes(id),
    responsavel_id uuid references usuarios(id),
    prioridade varchar(20),
    status varchar(40) not null,
    motivo_rejeicao varchar(40),
    detalhe_rejeicao text,
    ordem_servico_id uuid unique references ordens_servico(id),
    versao bigint not null default 0,
    criado_em timestamptz not null,
    atualizado_em timestamptz not null
);

create table solicitacao_interacoes (
    id uuid primary key,
    solicitacao_id uuid not null references solicitacoes(id) on delete cascade,
    usuario_id uuid references usuarios(id),
    origem varchar(20) not null,
    mensagem text not null,
    criado_em timestamptz not null
);

create table solicitacao_anexos (
    id uuid primary key,
    solicitacao_id uuid not null references solicitacoes(id) on delete cascade,
    interacao_id uuid references solicitacao_interacoes(id) on delete cascade,
    nome_arquivo varchar(255) not null,
    tipo_arquivo varchar(120) not null,
    tamanho bigint not null,
    caminho varchar(500) not null,
    enviado_pelo_cliente boolean not null,
    criado_em timestamptz not null
);

create table auditoria_solicitacoes (
    id uuid primary key,
    solicitacao_id uuid not null references solicitacoes(id) on delete cascade,
    usuario_id uuid references usuarios(id),
    origem varchar(20) not null,
    tipo_evento varchar(80) not null,
    descricao text not null,
    status_anterior varchar(40),
    status_novo varchar(40),
    criado_em timestamptz not null
);

alter table notificacoes
    add column solicitacao_id uuid references solicitacoes(id) on delete cascade;

alter table notificacoes
    add constraint ck_notificacoes_referencia
    check (num_nonnulls(ordem_servico_id, solicitacao_id) <= 1);

create index idx_solicitacoes_status_atualizado on solicitacoes(status, atualizado_em desc);
create index idx_solicitacoes_cliente_atualizado on solicitacoes(cliente_id, atualizado_em desc);
create index idx_solicitacoes_responsavel on solicitacoes(responsavel_id);
create index idx_solicitacao_interacoes_solicitacao on solicitacao_interacoes(solicitacao_id, criado_em);
create index idx_solicitacao_anexos_solicitacao on solicitacao_anexos(solicitacao_id, criado_em);
create index idx_auditoria_solicitacoes_solicitacao on auditoria_solicitacoes(solicitacao_id, criado_em desc);
create index idx_notificacoes_solicitacao on notificacoes(solicitacao_id);

create table usuarios (
    id uuid primary key,
    nome varchar(120) not null,
    email varchar(160) not null unique,
    senha varchar(255) not null,
    perfil varchar(32) not null,
    ativo boolean not null,
    criado_em timestamptz not null,
    atualizado_em timestamptz not null
);

create table clientes (
    id uuid primary key,
    nome varchar(160) not null,
    documento varchar(32) not null unique,
    email varchar(160) not null,
    telefone varchar(32),
    ativo boolean not null,
    criado_em timestamptz not null,
    atualizado_em timestamptz not null
);

create table ordens_servico (
    id uuid primary key,
    titulo varchar(180) not null,
    descricao text not null,
    cliente_id uuid not null references clientes(id),
    responsavel_id uuid references usuarios(id),
    status varchar(40) not null,
    prioridade varchar(20) not null,
    prazo date,
    entendimento text,
    impacto text,
    riscos text,
    estimativa_horas numeric(10, 2),
    criado_em timestamptz not null,
    atualizado_em timestamptz not null,
    finalizado_em timestamptz
);

create table comentarios (
    id uuid primary key,
    ordem_servico_id uuid not null references ordens_servico(id) on delete cascade,
    usuario_id uuid not null references usuarios(id),
    mensagem text not null,
    criado_em timestamptz not null
);

create table checklist_itens (
    id uuid primary key,
    ordem_servico_id uuid not null references ordens_servico(id) on delete cascade,
    descricao varchar(255) not null,
    obrigatorio boolean not null,
    concluido boolean not null default false,
    criado_em timestamptz not null,
    concluido_em timestamptz
);

create table apontamentos_tempo (
    id uuid primary key,
    ordem_servico_id uuid not null references ordens_servico(id) on delete cascade,
    usuario_id uuid not null references usuarios(id),
    descricao varchar(255) not null,
    inicio timestamptz not null,
    fim timestamptz not null,
    duracao_minutos bigint not null,
    criado_em timestamptz not null
);

create table anexos (
    id uuid primary key,
    ordem_servico_id uuid not null references ordens_servico(id) on delete cascade,
    nome_arquivo varchar(255) not null,
    tipo_arquivo varchar(120) not null,
    tamanho bigint not null,
    caminho varchar(500) not null,
    descricao varchar(255),
    criado_em timestamptz not null
);

create table auditoria_os (
    id uuid primary key,
    ordem_servico_id uuid not null references ordens_servico(id) on delete cascade,
    usuario_id uuid references usuarios(id),
    tipo_evento varchar(80) not null,
    descricao text not null,
    status_anterior varchar(40),
    status_novo varchar(40),
    criado_em timestamptz not null
);

create index idx_usuarios_email on usuarios(email);
create index idx_clientes_documento on clientes(documento);
create index idx_ordens_servico_status on ordens_servico(status);
create index idx_ordens_servico_prioridade on ordens_servico(prioridade);
create index idx_ordens_servico_cliente on ordens_servico(cliente_id);
create index idx_ordens_servico_responsavel on ordens_servico(responsavel_id);
create index idx_comentarios_os on comentarios(ordem_servico_id);
create index idx_checklist_os on checklist_itens(ordem_servico_id);
create index idx_apontamentos_os on apontamentos_tempo(ordem_servico_id);
create index idx_anexos_os on anexos(ordem_servico_id);
create index idx_auditoria_os on auditoria_os(ordem_servico_id);

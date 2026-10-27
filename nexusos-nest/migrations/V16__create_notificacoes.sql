create table notificacoes (
    id uuid primary key,
    usuario_id uuid not null references usuarios(id) on delete cascade,
    ordem_servico_id uuid references ordens_servico(id) on delete cascade,
    tipo varchar(60) not null,
    titulo varchar(180) not null,
    mensagem text not null,
    lida boolean not null default false,
    referencia_data date,
    criado_em timestamptz not null,
    lida_em timestamptz
);

create index idx_notificacoes_usuario_criado_em on notificacoes(usuario_id, criado_em desc);
create index idx_notificacoes_usuario_lida on notificacoes(usuario_id, lida);
create index idx_notificacoes_ordem_servico on notificacoes(ordem_servico_id);

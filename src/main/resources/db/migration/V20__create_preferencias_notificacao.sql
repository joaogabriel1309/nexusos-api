create table preferencias_notificacao (
    id uuid primary key,
    usuario_id uuid not null references usuarios(id) on delete cascade,
    tipo varchar(50) not null,
    habilitada boolean not null default true,
    criado_em timestamp with time zone not null,
    atualizado_em timestamp with time zone not null,
    constraint uk_preferencia_notificacao_usuario_tipo unique (usuario_id, tipo),
    constraint ck_preferencia_notificacao_tipo check (tipo in (
        'OS_ATRIBUIDA',
        'PRAZO_VENCIDO',
        'APROVACAO_CLIENTE',
        'PAGAMENTO',
        'COMENTARIO',
        'ALTERACAO_STATUS'
    ))
);

create index idx_preferencias_notificacao_usuario on preferencias_notificacao(usuario_id);

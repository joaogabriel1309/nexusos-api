create table ordens_servico_vinculos (
    ordem_servico_id uuid not null references ordens_servico(id) on delete cascade,
    ordem_servico_vinculada_id uuid not null references ordens_servico(id) on delete cascade,
    primary key (ordem_servico_id, ordem_servico_vinculada_id),
    constraint chk_ordens_servico_vinculos_distintas
        check (ordem_servico_id <> ordem_servico_vinculada_id)
);

create index idx_os_vinculos_vinculada
    on ordens_servico_vinculos (ordem_servico_vinculada_id);


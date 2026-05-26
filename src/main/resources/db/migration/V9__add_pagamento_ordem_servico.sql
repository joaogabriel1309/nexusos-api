alter table ordens_servico
    add column paga boolean not null default false;

create index idx_ordens_servico_paga on ordens_servico(paga);

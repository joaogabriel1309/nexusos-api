alter table projetos
    add column cliente_id uuid;

alter table projetos
    add constraint fk_projetos_cliente
    foreign key (cliente_id) references clientes(id);

create index idx_projetos_cliente_id on projetos(cliente_id);

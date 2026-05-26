create sequence if not exists ordens_servico_codigo_seq start with 1 increment by 1;

alter table ordens_servico
    add column codigo bigint;

with ordenadas as (
    select id, row_number() over (order by criado_em, id) as codigo
    from ordens_servico
)
update ordens_servico os
set codigo = ordenadas.codigo
from ordenadas
where os.id = ordenadas.id;

select setval(
    'ordens_servico_codigo_seq',
    coalesce((select max(codigo) from ordens_servico), 0) + 1,
    false
);

alter table ordens_servico
    alter column codigo set not null;

alter table ordens_servico
    add constraint uk_ordens_servico_codigo unique (codigo);

create index idx_ordens_servico_codigo on ordens_servico(codigo);

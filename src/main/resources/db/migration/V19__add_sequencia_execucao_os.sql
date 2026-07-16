alter table ordens_servico
    add column sequencia_execucao bigint;

with fila as (
    select id,
           row_number() over (
               partition by responsavel_id
               order by atualizado_em desc, codigo desc
           ) as posicao
    from ordens_servico
    where responsavel_id is not null
      and status <> 'FINALIZADA'
)
update ordens_servico os
set sequencia_execucao = fila.posicao
from fila
where os.id = fila.id;

create index idx_ordens_servico_responsavel_sequencia
    on ordens_servico (responsavel_id, sequencia_execucao);

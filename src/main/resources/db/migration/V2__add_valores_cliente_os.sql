alter table clientes
    add column valor_hora numeric(10, 2) not null default 0;

alter table ordens_servico
    add column valor_total_estimado numeric(12, 2);

update ordens_servico os
set valor_total_estimado = os.estimativa_horas * c.valor_hora
from clientes c
where os.cliente_id = c.id
  and os.estimativa_horas is not null;

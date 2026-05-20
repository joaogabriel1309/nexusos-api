alter table ordens_servico
    add column cobrar boolean not null default true;

update ordens_servico
set cobrar = true
where cobrar is null;

update ordens_servico
set valor_total_estimado = 0
where cobrar = false;

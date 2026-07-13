alter table ordens_servico
    add column commits_finalizacao text,
    add column branch_finalizacao varchar(255),
    add column arquivos_alterados_finalizacao text;

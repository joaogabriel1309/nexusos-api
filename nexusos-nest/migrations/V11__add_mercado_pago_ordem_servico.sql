alter table ordens_servico
    add column mercado_pago_preference_id varchar(120),
    add column mercado_pago_payment_id varchar(120);

create index idx_ordens_servico_mp_preference on ordens_servico(mercado_pago_preference_id);
create index idx_ordens_servico_mp_payment on ordens_servico(mercado_pago_payment_id);

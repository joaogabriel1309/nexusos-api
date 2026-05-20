update ordens_servico
set status = 'EM_TESTE'
where status = 'EM_TESTES';

update ordens_servico
set status = 'AGUARDANDO_PAGAMENTO'
where status = 'AGUARDANDO_VALIDACAO';

update ordens_servico
set status = 'FINALIZADA',
    finalizado_em = coalesce(finalizado_em, now()),
    descricao_finalizacao = coalesce(descricao_finalizacao, 'OS encerrada durante simplificacao do fluxo de status.')
where status = 'CANCELADA';

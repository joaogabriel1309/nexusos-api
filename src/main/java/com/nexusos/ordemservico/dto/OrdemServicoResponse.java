package com.nexusos.ordemservico.dto;

import com.nexusos.ordemservico.OrdemServico;
import com.nexusos.ordemservico.PrioridadeOS;
import com.nexusos.ordemservico.StatusOS;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.Comparator;
import java.util.List;

public record OrdemServicoResponse(
        UUID id,
        Long codigo,
        String titulo,
        String descricao,
        UUID clienteId,
        String clienteNome,
        UUID responsavelId,
        String responsavelNome,
        UUID projetoId,
        String projetoNome,
        StatusOS status,
        PrioridadeOS prioridade,
        LocalDate prazo,
        Boolean prazoIndefinido,
        Long sequenciaExecucao,
        String entendimento,
        String impacto,
        String riscos,
        BigDecimal estimativaHoras,
        BigDecimal valorTotalEstimado,
        Boolean cobrar,
        Boolean paga,
        String descricaoFinalizacao,
        String commitsFinalizacao,
        String branchFinalizacao,
        String arquivosAlteradosFinalizacao,
        String branchGithub,
        Integer pullRequestNumero,
        String pullRequestUrl,
        String pullRequestStatus,
        String commitsGithub,
        String arquivosAlteradosGithub,
        OffsetDateTime ultimaSincronizacaoGithub,
        Boolean aprovadaPeloCliente,
        OffsetDateTime aprovadoPeloClienteEm,
        String observacaoAprovacaoCliente,
        OffsetDateTime criadoEm,
        OffsetDateTime atualizadoEm,
        OffsetDateTime finalizadoEm,
        List<OrdemServicoVinculadaResponse> ordensVinculadas,
        List<TransicaoStatusResponse> transicoesStatus
) {
    public static OrdemServicoResponse from(OrdemServico os) {
        return from(os, null);
    }

    public static OrdemServicoResponse from(OrdemServico os, String emailResponsavelVisivel) {
        var responsavel = os.getResponsavel();
        var projeto = os.getProjeto();
        return new OrdemServicoResponse(
                os.getId(),
                os.getCodigo(),
                os.getTitulo(),
                os.getDescricao(),
                os.getCliente().getId(),
                os.getCliente().getNome(),
                responsavel != null ? responsavel.getId() : null,
                responsavel != null ? responsavel.getNome() : null,
                projeto != null ? projeto.getId() : null,
                projeto != null ? projeto.getNome() : null,
                os.getStatus(),
                os.getPrioridade(),
                os.getPrazo(),
                Boolean.TRUE.equals(os.getPrazoIndefinido()),
                os.getSequenciaExecucao(),
                os.getEntendimento(),
                os.getImpacto(),
                os.getRiscos(),
                os.getEstimativaHoras(),
                os.getValorTotalEstimado(),
                os.getCobrar(),
                os.getPaga(),
                os.getDescricaoFinalizacao(),
                os.getCommitsFinalizacao(),
                os.getBranchFinalizacao(),
                os.getArquivosAlteradosFinalizacao(),
                os.getBranchGithub(),
                os.getPullRequestNumero(),
                os.getPullRequestUrl(),
                os.getPullRequestStatus(),
                os.getCommitsGithub(),
                os.getArquivosAlteradosGithub(),
                os.getUltimaSincronizacaoGithub(),
                os.getAprovadaPeloCliente(),
                os.getAprovadoPeloClienteEm(),
                os.getObservacaoAprovacaoCliente(),
                os.getCriadoEm(),
                os.getAtualizadoEm(),
                os.getFinalizadoEm(),
                os.getOrdensVinculadas().stream()
                        .filter(vinculada -> emailResponsavelVisivel == null
                                || vinculada.getResponsavel() != null
                                && emailResponsavelVisivel.equals(vinculada.getResponsavel().getEmail()))
                        .map(OrdemServicoVinculadaResponse::from)
                        .sorted(Comparator.comparing(OrdemServicoVinculadaResponse::codigo))
                        .toList(),
                List.of()
        );
    }

    public OrdemServicoResponse withTransicoesStatus(List<TransicaoStatusResponse> transicoes) {
        return new OrdemServicoResponse(id, codigo, titulo, descricao, clienteId, clienteNome,
                responsavelId, responsavelNome, projetoId, projetoNome, status, prioridade, prazo,
                prazoIndefinido, sequenciaExecucao, entendimento, impacto, riscos, estimativaHoras, valorTotalEstimado,
                cobrar, paga, descricaoFinalizacao, commitsFinalizacao, branchFinalizacao,
                arquivosAlteradosFinalizacao, branchGithub, pullRequestNumero, pullRequestUrl,
                pullRequestStatus, commitsGithub, arquivosAlteradosGithub, ultimaSincronizacaoGithub,
                aprovadaPeloCliente, aprovadoPeloClienteEm, observacaoAprovacaoCliente, criadoEm,
                atualizadoEm, finalizadoEm, ordensVinculadas, List.copyOf(transicoes));
    }
}

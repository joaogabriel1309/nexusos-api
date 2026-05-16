package com.nexusos.anexo.dto;

import com.nexusos.anexo.Anexo;
import java.time.OffsetDateTime;
import java.util.UUID;

public record AnexoResponse(UUID id, UUID ordemServicoId, String nomeArquivo, String tipoArquivo, long tamanho,
                            String caminho, String descricao, OffsetDateTime criadoEm) {
    public static AnexoResponse from(Anexo anexo) {
        return new AnexoResponse(anexo.getId(), anexo.getOrdemServico().getId(), anexo.getNomeArquivo(),
                anexo.getTipoArquivo(), anexo.getTamanho(), anexo.getCaminho(), anexo.getDescricao(),
                anexo.getCriadoEm());
    }
}

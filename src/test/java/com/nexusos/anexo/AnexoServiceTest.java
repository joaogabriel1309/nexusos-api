package com.nexusos.anexo;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.nexusos.exception.RegraNegocioException;
import com.nexusos.notificacao.NotificacaoService;
import com.nexusos.ordemservico.OrdemServicoService;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class AnexoServiceTest {
    private AnexoRepository repository;
    private OrdemServicoService ordemServicoService;
    private AnexoService service;

    @BeforeEach
    void setUp() {
        repository = mock(AnexoRepository.class);
        ordemServicoService = mock(OrdemServicoService.class);
        service = new AnexoService(repository, ordemServicoService, mock(NotificacaoService.class));
    }

    @Test
    void deveRejeitarArquivoVazio() {
        var arquivo = new MockMultipartFile("arquivo", "evidencia.pdf", "application/pdf", new byte[0]);

        assertThatThrownBy(() -> service.salvar(UUID.randomUUID(), arquivo, null))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessage("Arquivo nao pode estar vazio.");
        verify(repository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void deveRejeitarExtensaoNaoPermitida() {
        var arquivo = new MockMultipartFile("arquivo", "script.exe", "application/octet-stream", new byte[] {1});

        assertThatThrownBy(() -> service.salvar(UUID.randomUUID(), arquivo, null))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessage("Tipo de arquivo nao permitido.");
    }

    @Test
    void deveRejeitarPdfComAssinaturaInvalida() {
        var arquivo = new MockMultipartFile("arquivo", "comprovante.pdf", "application/pdf",
                "nao e pdf".getBytes(StandardCharsets.UTF_8));

        assertThatThrownBy(() -> service.salvar(UUID.randomUUID(), arquivo, null))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessage("Conteudo do arquivo nao corresponde ao tipo informado.");
        verify(ordemServicoService, never()).buscarEntidade(org.mockito.ArgumentMatchers.any());
    }
}

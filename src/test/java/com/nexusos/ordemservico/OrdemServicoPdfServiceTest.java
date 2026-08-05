package com.nexusos.ordemservico;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.nexusos.auditoria.AuditoriaService;
import com.nexusos.cliente.Cliente;
import com.nexusos.exception.RegraNegocioException;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class OrdemServicoPdfServiceTest {

    @Mock OrdemServicoService ordemServicoService;
    @Mock AuditoriaService auditoriaService;
    @InjectMocks OrdemServicoPdfService pdfService;

    @Test
    void geraPdfParaOsFinalizadaComDadosFormais() {
        var id = UUID.randomUUID();
        var cliente = Cliente.builder().nome("Cliente Exemplo").documento("12345678900")
                .email("cliente@example.com").valorHora(new BigDecimal("150.00")).build();
        var os = OrdemServico.builder().id(id).codigo(25L).titulo("Entrega final")
                .descricao("Demanda original").cliente(cliente).status(StatusOS.FINALIZADA)
                .prioridade(PrioridadeOS.ALTA).criadoEm(OffsetDateTime.now().minusDays(2))
                .atualizadoEm(OffsetDateTime.now()).finalizadoEm(OffsetDateTime.now())
                .descricaoFinalizacao("Servico concluido e validado").build();
        when(ordemServicoService.buscarEntidade(id)).thenReturn(os);
        when(auditoriaService.listarEntidadesPorOrdemServico(id)).thenReturn(List.of());

        var pdf = pdfService.gerarComprovanteFinalizacao(id);

        try (var documento = org.apache.pdfbox.Loader.loadPDF(pdf)) {
            java.nio.file.Files.createDirectories(java.nio.file.Path.of("tmp", "pdfs"));
            java.nio.file.Files.write(java.nio.file.Path.of("tmp", "pdfs", "comprovante-amostra.pdf"), pdf);
            var renderer = new org.apache.pdfbox.rendering.PDFRenderer(documento);
            for (var pagina = 0; pagina < documento.getNumberOfPages(); pagina++) {
                var imagem = renderer.renderImageWithDPI(pagina, 144);
                javax.imageio.ImageIO.write(imagem, "png",
                        java.nio.file.Path.of("tmp", "pdfs", "comprovante-amostra-" + (pagina + 1) + ".png").toFile());
            }
            var texto = new org.apache.pdfbox.text.PDFTextStripper().getText(documento);
            assertThat(texto).contains("COMPROVANTE DE FINALIZACAO", "Cliente Exemplo", "Demanda original",
                    "Servico concluido e validado", "Aceite do cliente", "Historico completo");
        } catch (java.io.IOException exception) {
            throw new java.io.UncheckedIOException(exception);
        }

        assertThat(pdf).startsWith((byte) '%', (byte) 'P', (byte) 'D', (byte) 'F');
        assertThat(pdf.length).isGreaterThan(1_000);
    }

    @Test
    void rejeitaPdfDeOsNaoFinalizada() {
        var id = UUID.randomUUID();
        when(ordemServicoService.buscarEntidade(id)).thenReturn(OrdemServico.builder().status(StatusOS.EM_TESTE).build());

        assertThatThrownBy(() -> pdfService.gerarComprovanteFinalizacao(id))
                .isInstanceOf(RegraNegocioException.class).hasMessageContaining("finalizado");
    }
}

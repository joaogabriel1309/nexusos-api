package com.nexusos.ordemservico;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.nexusos.auditoria.AuditoriaOS;
import com.nexusos.auditoria.AuditoriaService;
import com.nexusos.exception.RegraNegocioException;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OrdemServicoPdfService {

    private static final Color AZUL = new Color(30, 64, 175);
    private static final Color CINZA = new Color(75, 85, 99);
    private static final DateTimeFormatter DATA_HORA = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final NumberFormat MOEDA = NumberFormat.getCurrencyInstance(Locale.of("pt", "BR"));
    private final OrdemServicoService ordemServicoService;
    private final AuditoriaService auditoriaService;

    @Transactional(readOnly = true)
    public byte[] gerarComprovanteFinalizacao(java.util.UUID id) {
        var os = ordemServicoService.buscarEntidade(id);
        if (os.getStatus() != StatusOS.FINALIZADA) {
            throw new RegraNegocioException("O comprovante somente pode ser gerado para um ticket finalizado.");
        }

        var saida = new ByteArrayOutputStream();
        var documento = new Document(PageSize.A4, 42, 42, 48, 48);
        PdfWriter.getInstance(documento, saida);
        documento.addTitle("Comprovante de finalizacao - ticket " + os.getCodigo());
        documento.addSubject("Evidencia formal da execucao do ticket");
        documento.addCreator("NexusOS");
        documento.open();

        var titulo = new Paragraph("COMPROVANTE DE FINALIZACAO", fonte(18, Font.BOLD, AZUL));
        titulo.setAlignment(Element.ALIGN_CENTER);
        documento.add(titulo);
        var subtitulo = new Paragraph("Ticket " + os.getCodigo(), fonte(11, Font.NORMAL, CINZA));
        subtitulo.setAlignment(Element.ALIGN_CENTER);
        subtitulo.setSpacingAfter(18);
        documento.add(subtitulo);

        adicionarSecao(documento, "Identificacao", new String[][] {
                {"Codigo", texto(os.getCodigo())}, {"Titulo", texto(os.getTitulo())},
                {"Status", "Finalizada"}, {"Prioridade", texto(os.getPrioridade())},
                {"Cliente", texto(os.getCliente().getNome())}, {"Documento", texto(os.getCliente().getDocumento())},
                {"E-mail", texto(os.getCliente().getEmail())}, {"Telefone", texto(os.getCliente().getTelefone())},
                {"Projeto", os.getProjeto() != null ? texto(os.getProjeto().getNome()) : "Nao informado"},
                {"Responsavel", os.getResponsavel() != null ? texto(os.getResponsavel().getNome()) : "Nao informado"}
        });
        adicionarSecao(documento, "Datas e valores", new String[][] {
                {"Criada em", data(os.getCriadoEm())}, {"Atualizada em", data(os.getAtualizadoEm())},
                {"Prazo", os.getPrazo() != null ? os.getPrazo().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "Nao informado"},
                {"Finalizada em", data(os.getFinalizadoEm())},
                {"Estimativa", os.getEstimativaHoras() != null ? os.getEstimativaHoras().toPlainString() + " hora(s)" : "Nao informada"},
                {"Valor da hora", moeda(os.getCliente().getValorHora())},
                {"Valor total estimado", moeda(os.getValorTotalEstimado())},
                {"Cobranca", Boolean.TRUE.equals(os.getCobrar()) ? "Cobrada" : "Sem cobranca"},
                {"Pagamento", Boolean.TRUE.equals(os.getPaga()) ? "Pago" : "Pendente"}
        });
        adicionarTexto(documento, "Demanda original", os.getDescricao());
        adicionarTexto(documento, "Entendimento e analise", os.getEntendimento());
        adicionarTexto(documento, "Impacto", os.getImpacto());
        adicionarTexto(documento, "Riscos", os.getRiscos());
        adicionarTexto(documento, "Entrega realizada", os.getDescricaoFinalizacao());
        adicionarTexto(documento, "Arquivos alterados", os.getArquivosAlteradosFinalizacao());
        adicionarSecao(documento, "Referencias tecnicas", new String[][] {
                {"Branch", texto(os.getBranchFinalizacao())}, {"Commits", texto(os.getCommitsFinalizacao())}
        });
        adicionarSecao(documento, "Aceite do cliente", new String[][] {
                {"Decisao", aceite(os.getAprovadaPeloCliente())},
                {"Registrado em", data(os.getAprovadoPeloClienteEm())},
                {"Observacao", texto(os.getObservacaoAprovacaoCliente())}
        });
        adicionarHistorico(documento, auditoriaService.listarEntidadesPorOrdemServico(id));

        var rodape = new Paragraph("Documento emitido pelo NexusOS em " + data(OffsetDateTime.now())
                + ". A autenticidade deve ser conferida com os registros do ticket " + os.getCodigo() + ".",
                fonte(8, Font.ITALIC, CINZA));
        rodape.setSpacingBefore(18);
        documento.add(rodape);
        documento.close();
        return saida.toByteArray();
    }

    private void adicionarHistorico(Document documento, java.util.List<AuditoriaOS> eventos) {
        adicionarTituloSecao(documento, "Historico completo");
        if (eventos.isEmpty()) {
            documento.add(new Paragraph("Nenhum evento registrado.", fonte(9, Font.NORMAL, CINZA)));
            return;
        }
        eventos.stream().sorted(Comparator.comparing(AuditoriaOS::getCriadoEm)).forEach(evento -> {
            var usuario = evento.getUsuario() != null ? evento.getUsuario().getNome() : "Sistema";
            var status = evento.getStatusAnterior() != null || evento.getStatusNovo() != null
                    ? " [" + texto(evento.getStatusAnterior()) + " -> " + texto(evento.getStatusNovo()) + "]" : "";
            var linha = data(evento.getCriadoEm()) + " | " + evento.getTipoEvento().replace('_', ' ') + " | "
                    + usuario + status + "\n" + evento.getDescricao();
            var paragrafo = new Paragraph(linha, fonte(9, Font.NORMAL, Color.DARK_GRAY));
            paragrafo.setSpacingAfter(7);
            documento.add(paragrafo);
        });
    }

    private void adicionarSecao(Document documento, String titulo, String[][] campos) {
        adicionarTituloSecao(documento, titulo);
        var tabela = new PdfPTable(2);
        tabela.setWidthPercentage(100);
        tabela.setWidths(new float[] {1, 2});
        for (var campo : campos) {
            tabela.addCell(celula(campo[0], true));
            tabela.addCell(celula(campo[1], false));
        }
        tabela.setSpacingAfter(10);
        documento.add(tabela);
    }

    private void adicionarTexto(Document documento, String titulo, String valor) {
        adicionarTituloSecao(documento, titulo);
        var paragrafo = new Paragraph(texto(valor), fonte(9, Font.NORMAL, Color.DARK_GRAY));
        paragrafo.setLeading(13);
        paragrafo.setSpacingAfter(10);
        documento.add(paragrafo);
    }

    private void adicionarTituloSecao(Document documento, String titulo) {
        var paragrafo = new Paragraph(titulo, fonte(11, Font.BOLD, AZUL));
        paragrafo.setSpacingBefore(8);
        paragrafo.setSpacingAfter(6);
        documento.add(paragrafo);
    }

    private PdfPCell celula(String valor, boolean rotulo) {
        var celula = new PdfPCell(new Phrase(texto(valor), fonte(9, rotulo ? Font.BOLD : Font.NORMAL,
                rotulo ? CINZA : Color.DARK_GRAY)));
        celula.setPadding(6);
        celula.setBorderColor(new Color(209, 213, 219));
        if (rotulo) celula.setBackgroundColor(new Color(249, 250, 251));
        return celula;
    }

    private Font fonte(int tamanho, int estilo, Color cor) {
        return FontFactory.getFont(FontFactory.HELVETICA, tamanho, estilo, cor);
    }

    private String texto(Object valor) {
        return valor == null || valor.toString().isBlank() ? "Nao informado" : valor.toString();
    }

    private String data(OffsetDateTime valor) {
        return valor == null ? "Nao informada" : valor.format(DATA_HORA);
    }

    private String moeda(BigDecimal valor) {
        return valor == null ? "Nao informado" : MOEDA.format(valor);
    }

    private String aceite(Boolean aceite) {
        return aceite == null ? "Nao registrado" : aceite ? "Aprovado" : "Reprovado";
    }
}

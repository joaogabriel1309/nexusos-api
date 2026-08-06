package com.nexusos.solicitacao;

import com.nexusos.anexo.AnexoService;
import com.nexusos.exception.RecursoNaoEncontradoException;
import com.nexusos.exception.RegraNegocioException;
import com.nexusos.solicitacao.dto.SolicitacaoAnexoResponse;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class SolicitacaoAnexoService {
    private static final int MAXIMO_POR_ENVIO = 5;
    private static final long MAXIMO_POR_SOLICITACAO = 20;

    private final AnexoSolicitacaoRepository repository;
    private final AnexoService anexoService;

    @Value("${nexusos.storage.uploads-path}")
    private String uploadsPath;

    @Transactional
    public List<SolicitacaoAnexoResponse> salvarTodos(Solicitacao solicitacao,
            InteracaoSolicitacao interacao, List<MultipartFile> arquivos, boolean enviadoPeloCliente) {
        var recebidos = arquivos == null ? List.<MultipartFile>of() : arquivos.stream()
                .filter(arquivo -> arquivo != null && !arquivo.isEmpty())
                .toList();
        if (recebidos.size() > MAXIMO_POR_ENVIO) {
            throw new RegraNegocioException("Envie no maximo 5 anexos por vez.");
        }
        if (repository.countBySolicitacaoId(solicitacao.getId()) + recebidos.size() > MAXIMO_POR_SOLICITACAO) {
            throw new RegraNegocioException("A solicitacao atingiu o limite de 20 anexos.");
        }

        var nomes = recebidos.stream().map(anexoService::validarParaUpload).toList();
        try {
            var baseDir = Path.of(uploadsPath).toAbsolutePath().normalize();
            var diretorio = baseDir.resolve("solicitacoes").resolve(solicitacao.getId().toString()).normalize();
            if (!diretorio.startsWith(baseDir)) {
                throw new RegraNegocioException("Caminho de upload invalido.");
            }
            Files.createDirectories(diretorio);

            var respostas = new java.util.ArrayList<SolicitacaoAnexoResponse>();
            for (int indice = 0; indice < recebidos.size(); indice++) {
                var arquivo = recebidos.get(indice);
                var nomeOriginal = nomes.get(indice);
                var destino = diretorio.resolve(UUID.randomUUID() + "-" + nomeOriginal).normalize();
                if (!destino.startsWith(diretorio)) {
                    throw new RegraNegocioException("Nome de arquivo invalido.");
                }
                arquivo.transferTo(destino);
                var anexo = new AnexoSolicitacao();
                anexo.setSolicitacao(solicitacao);
                anexo.setInteracao(interacao);
                anexo.setNomeArquivo(nomeOriginal);
                anexo.setTipoArquivo(arquivo.getContentType() != null
                        ? arquivo.getContentType() : "application/octet-stream");
                anexo.setTamanho(arquivo.getSize());
                anexo.setCaminho(destino.toString());
                anexo.setEnviadoPeloCliente(enviadoPeloCliente);
                respostas.add(SolicitacaoAnexoResponse.from(repository.save(anexo)));
            }
            return respostas;
        } catch (IOException ex) {
            throw new RegraNegocioException("Falha ao salvar anexo da solicitacao.");
        }
    }

    @Transactional(readOnly = true)
    public List<SolicitacaoAnexoResponse> listar(UUID solicitacaoId) {
        return repository.findBySolicitacaoIdOrderByCriadoEmAsc(solicitacaoId).stream()
                .map(SolicitacaoAnexoResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public DownloadSolicitacaoAnexo baixar(UUID solicitacaoId, UUID anexoId) {
        var anexo = repository.findByIdAndSolicitacaoId(anexoId, solicitacaoId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Anexo nao encontrado."));
        try {
            var baseDir = Path.of(uploadsPath).toAbsolutePath().normalize();
            var caminho = Path.of(anexo.getCaminho()).toAbsolutePath().normalize();
            if (!caminho.startsWith(baseDir) || !Files.isRegularFile(caminho)) {
                throw new RegraNegocioException("Arquivo do anexo nao encontrado.");
            }
            return new DownloadSolicitacaoAnexo(
                    new UrlResource(caminho.toUri()), anexo.getNomeArquivo(), anexo.getTipoArquivo());
        } catch (IOException ex) {
            throw new RegraNegocioException("Falha ao acessar anexo.");
        }
    }

    @Transactional
    public void copiarParaTicket(UUID solicitacaoId, UUID ticketId) {
        repository.findBySolicitacaoIdOrderByCriadoEmAsc(solicitacaoId).forEach(anexo ->
                anexoService.copiarArquivoExistente(ticketId, Path.of(anexo.getCaminho()),
                        anexo.getNomeArquivo(), anexo.getTipoArquivo(), anexo.getTamanho(),
                        anexo.isEnviadoPeloCliente()));
    }

    public record DownloadSolicitacaoAnexo(Resource recurso, String nomeArquivo, String tipoArquivo) {
    }
}

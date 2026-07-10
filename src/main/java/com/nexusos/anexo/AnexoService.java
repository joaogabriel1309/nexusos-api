package com.nexusos.anexo;

import com.nexusos.anexo.dto.AnexoResponse;
import com.nexusos.exception.RegraNegocioException;
import com.nexusos.notificacao.NotificacaoService;
import com.nexusos.ordemservico.OrdemServicoService;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.text.Normalizer;
import java.util.Locale;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class AnexoService {
    private static final long TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024;
    private static final Set<String> EXTENSOES_PERMITIDAS = Set.of("pdf", "png", "jpg", "jpeg", "txt", "doc", "docx", "xls", "xlsx");
    private static final Map<String, Set<String>> MIMES_PERMITIDOS = Map.of(
            "pdf", Set.of("application/pdf"),
            "png", Set.of("image/png"),
            "jpg", Set.of("image/jpeg"),
            "jpeg", Set.of("image/jpeg"),
            "txt", Set.of("text/plain"),
            "doc", Set.of("application/msword", "application/octet-stream"),
            "docx", Set.of("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/octet-stream"),
            "xls", Set.of("application/vnd.ms-excel", "application/octet-stream"),
            "xlsx", Set.of("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/octet-stream")
    );

    private final AnexoRepository anexoRepository;
    private final OrdemServicoService ordemServicoService;
    private final NotificacaoService notificacaoService;
    @Value("${nexusos.storage.uploads-path}")
    private String uploadsPath;

    @Transactional(readOnly = true)
    public List<AnexoResponse> listar(UUID ordemServicoId) {
        ordemServicoService.buscarEntidade(ordemServicoId);
        return anexoRepository.findByOrdemServicoIdOrderByCriadoEmDesc(ordemServicoId).stream()
                .map(AnexoResponse::from).toList();
    }

    @Transactional
    public AnexoResponse salvar(UUID ordemServicoId, MultipartFile arquivo, String descricao) {
        if (arquivo.isEmpty()) {
            throw new RegraNegocioException("Arquivo nao pode estar vazio.");
        }
        validarArquivo(arquivo);
        try {
            var ordemServico = ordemServicoService.buscarEntidade(ordemServicoId);
            var baseDir = Path.of(uploadsPath).toAbsolutePath().normalize();
            var dir = baseDir.resolve(ordemServicoId.toString()).normalize();
            if (!dir.startsWith(baseDir)) {
                throw new RegraNegocioException("Caminho de upload invalido.");
            }
            Files.createDirectories(dir);
            var nomeOriginal = sanitizarNomeArquivo(arquivo.getOriginalFilename());
            var nomeSeguro = UUID.randomUUID() + "-" + nomeOriginal;
            var destino = dir.resolve(nomeSeguro).normalize();
            if (!destino.startsWith(dir)) {
                throw new RegraNegocioException("Nome de arquivo invalido.");
            }
            arquivo.transferTo(destino);
            var anexo = new Anexo();
            anexo.setOrdemServico(ordemServico);
            anexo.setNomeArquivo(nomeOriginal);
            anexo.setTipoArquivo(arquivo.getContentType() != null ? arquivo.getContentType() : "application/octet-stream");
            anexo.setTamanho(arquivo.getSize());
            anexo.setCaminho(destino.toString());
            anexo.setDescricao(descricao);
            var salvo = anexoRepository.save(anexo);
            notificacaoService.notificarAnexo(ordemServico, nomeOriginal);
            return AnexoResponse.from(salvo);
        } catch (IOException ex) {
            throw new RegraNegocioException("Falha ao salvar anexo.");
        }
    }

    private void validarArquivo(MultipartFile arquivo) {
        if (arquivo.getSize() > TAMANHO_MAXIMO_BYTES) {
            throw new RegraNegocioException("Arquivo excede o tamanho maximo de 10MB.");
        }

        var nome = sanitizarNomeArquivo(arquivo.getOriginalFilename());
        var extensao = extrairExtensao(nome);
        if (!EXTENSOES_PERMITIDAS.contains(extensao)) {
            throw new RegraNegocioException("Tipo de arquivo nao permitido.");
        }

        var contentType = arquivo.getContentType() != null
                ? arquivo.getContentType().toLowerCase(Locale.ROOT)
                : "application/octet-stream";
        if (!MIMES_PERMITIDOS.getOrDefault(extensao, Set.of()).contains(contentType)) {
            throw new RegraNegocioException("MIME type do arquivo nao permitido.");
        }
    }

    private String sanitizarNomeArquivo(String nomeOriginal) {
        var nome = nomeOriginal == null || nomeOriginal.isBlank() ? "arquivo" : Path.of(nomeOriginal).getFileName().toString();
        nome = Normalizer.normalize(nome, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        nome = nome.replaceAll("[^a-zA-Z0-9._-]", "_");
        return nome.isBlank() || nome.equals(".") || nome.equals("..") ? "arquivo" : nome;
    }

    private String extrairExtensao(String nome) {
        var indice = nome.lastIndexOf('.');
        return indice >= 0 && indice < nome.length() - 1 ? nome.substring(indice + 1).toLowerCase(Locale.ROOT) : "";
    }
}

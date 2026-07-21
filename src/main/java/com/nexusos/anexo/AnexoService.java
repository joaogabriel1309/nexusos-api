package com.nexusos.anexo;

import com.nexusos.anexo.dto.AnexoResponse;
import com.nexusos.exception.RegraNegocioException;
import com.nexusos.notificacao.NotificacaoService;
import com.nexusos.ordemservico.OrdemServicoService;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.charset.StandardCharsets;
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
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;

@Service
@RequiredArgsConstructor
public class AnexoService {
    private static final long TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024;
    private static final long QUANTIDADE_MAXIMA = 20;
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
        return salvar(ordemServicoId, arquivo, descricao, false);
    }

    @Transactional
    public AnexoResponse salvar(UUID ordemServicoId, MultipartFile arquivo, String descricao, boolean enviadoPeloCliente) {
        if (arquivo.isEmpty()) {
            throw new RegraNegocioException("Arquivo nao pode estar vazio.");
        }
        validarArquivo(arquivo);
        if (anexoRepository.countByOrdemServicoId(ordemServicoId) >= QUANTIDADE_MAXIMA) {
            throw new RegraNegocioException("A OS atingiu o limite de 20 anexos.");
        }
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
            anexo.setEnviadoPeloCliente(enviadoPeloCliente);
            var salvo = anexoRepository.save(anexo);
            notificacaoService.notificarAnexo(ordemServico, nomeOriginal);
            return AnexoResponse.from(salvo);
        } catch (IOException ex) {
            throw new RegraNegocioException("Falha ao salvar anexo.");
        }
    }

    @Transactional(readOnly = true)
    public DownloadAnexo baixar(UUID ordemServicoId, UUID anexoId) {
        ordemServicoService.buscarEntidade(ordemServicoId);
        var anexo = buscarDaOrdem(ordemServicoId, anexoId);
        try {
            var baseDir = Path.of(uploadsPath).toAbsolutePath().normalize();
            var caminho = Path.of(anexo.getCaminho()).toAbsolutePath().normalize();
            if (!caminho.startsWith(baseDir) || !Files.isRegularFile(caminho)) {
                throw new RegraNegocioException("Arquivo do anexo nao encontrado.");
            }
            return new DownloadAnexo(new UrlResource(caminho.toUri()), anexo.getNomeArquivo(), anexo.getTipoArquivo());
        } catch (IOException ex) {
            throw new RegraNegocioException("Falha ao acessar anexo.");
        }
    }

    @Transactional
    public void excluir(UUID ordemServicoId, UUID anexoId) {
        ordemServicoService.buscarEntidade(ordemServicoId);
        var anexo = buscarDaOrdem(ordemServicoId, anexoId);
        try {
            var baseDir = Path.of(uploadsPath).toAbsolutePath().normalize();
            var caminho = Path.of(anexo.getCaminho()).toAbsolutePath().normalize();
            if (caminho.startsWith(baseDir)) Files.deleteIfExists(caminho);
            anexoRepository.delete(anexo);
        } catch (IOException ex) {
            throw new RegraNegocioException("Falha ao excluir anexo.");
        }
    }

    private Anexo buscarDaOrdem(UUID ordemServicoId, UUID anexoId) {
        return anexoRepository.findById(anexoId)
                .filter(anexo -> anexo.getOrdemServico().getId().equals(ordemServicoId))
                .orElseThrow(() -> new com.nexusos.exception.RecursoNaoEncontradoException("Anexo nao encontrado."));
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
        validarAssinatura(arquivo, extensao);
    }

    private void validarAssinatura(MultipartFile arquivo, String extensao) {
        try {
            byte[] bytes = arquivo.getBytes();
            boolean valida = switch (extensao) {
                case "pdf" -> iniciaCom(bytes, "%PDF-".getBytes(StandardCharsets.US_ASCII));
                case "png" -> iniciaCom(bytes, new byte[] {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a});
                case "jpg", "jpeg" -> bytes.length >= 3 && bytes[0] == (byte) 0xff && bytes[1] == (byte) 0xd8 && bytes[2] == (byte) 0xff;
                case "doc", "xls" -> iniciaCom(bytes, new byte[] {(byte) 0xd0, (byte) 0xcf, 0x11, (byte) 0xe0, (byte) 0xa1, (byte) 0xb1, 0x1a, (byte) 0xe1});
                case "docx", "xlsx" -> iniciaCom(bytes, new byte[] {0x50, 0x4b, 0x03, 0x04});
                case "txt" -> !contemByteNulo(bytes);
                default -> false;
            };
            if (!valida) throw new RegraNegocioException("Conteudo do arquivo nao corresponde ao tipo informado.");
        } catch (IOException ex) {
            throw new RegraNegocioException("Falha ao validar arquivo.");
        }
    }

    private boolean iniciaCom(byte[] conteudo, byte[] assinatura) {
        if (conteudo.length < assinatura.length) return false;
        for (int i = 0; i < assinatura.length; i++) if (conteudo[i] != assinatura[i]) return false;
        return true;
    }

    private boolean contemByteNulo(byte[] conteudo) {
        for (byte valor : conteudo) if (valor == 0) return true;
        return false;
    }

    public record DownloadAnexo(Resource recurso, String nomeArquivo, String tipoArquivo) {}

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

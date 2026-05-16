package com.nexusos.anexo;

import com.nexusos.anexo.dto.AnexoResponse;
import com.nexusos.exception.RegraNegocioException;
import com.nexusos.ordemservico.OrdemServicoService;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class AnexoService {
    private final AnexoRepository anexoRepository;
    private final OrdemServicoService ordemServicoService;
    @Value("${nexusos.storage.uploads-path}")
    private String uploadsPath;

    @Transactional(readOnly = true)
    public List<AnexoResponse> listar(UUID ordemServicoId) {
        return anexoRepository.findByOrdemServicoIdOrderByCriadoEmDesc(ordemServicoId).stream()
                .map(AnexoResponse::from).toList();
    }

    @Transactional
    public AnexoResponse salvar(UUID ordemServicoId, MultipartFile arquivo, String descricao) {
        if (arquivo.isEmpty()) {
            throw new RegraNegocioException("Arquivo nao pode estar vazio.");
        }
        try {
            var ordemServico = ordemServicoService.buscarEntidade(ordemServicoId);
            var dir = Path.of(uploadsPath, ordemServicoId.toString());
            Files.createDirectories(dir);
            var nomeSeguro = UUID.randomUUID() + "-" + arquivo.getOriginalFilename();
            var destino = dir.resolve(nomeSeguro).normalize();
            arquivo.transferTo(destino);
            var anexo = new Anexo();
            anexo.setOrdemServico(ordemServico);
            anexo.setNomeArquivo(arquivo.getOriginalFilename());
            anexo.setTipoArquivo(arquivo.getContentType() != null ? arquivo.getContentType() : "application/octet-stream");
            anexo.setTamanho(arquivo.getSize());
            anexo.setCaminho(destino.toString());
            anexo.setDescricao(descricao);
            return AnexoResponse.from(anexoRepository.save(anexo));
        } catch (IOException ex) {
            throw new RegraNegocioException("Falha ao salvar anexo.");
        }
    }
}

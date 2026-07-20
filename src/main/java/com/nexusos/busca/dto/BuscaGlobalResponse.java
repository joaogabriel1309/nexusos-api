package com.nexusos.busca.dto;

import java.util.List;

public record BuscaGlobalResponse(
        List<BuscaGlobalItemResponse> ordensServico,
        List<BuscaGlobalItemResponse> clientes,
        List<BuscaGlobalItemResponse> projetos,
        List<BuscaGlobalItemResponse> usuarios
) {
}

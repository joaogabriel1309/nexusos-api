package com.nexusos.cliente.dto;

import com.nexusos.cliente.Cliente;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ClienteResponse(
        UUID id,
        String nome,
        String documento,
        String email,
        String telefone,
        BigDecimal valorHora,
        boolean enviarEmail,
        boolean enviarWhatsapp,
        String whatsappApiKey,
        String tokenAcesso,
        OffsetDateTime tokenAcessoExpiraEm,
        boolean ativo,
        OffsetDateTime criadoEm,
        OffsetDateTime atualizadoEm
) {
    public static ClienteResponse from(Cliente cliente) {
        return new ClienteResponse(
                cliente.getId(),
                cliente.getNome(),
                cliente.getDocumento(),
                cliente.getEmail(),
                cliente.getTelefone(),
                cliente.getValorHora(),
                cliente.isEnviarEmail(),
                cliente.isEnviarWhatsapp(),
                cliente.getWhatsappApiKey(),
                cliente.getTokenAcesso(),
                cliente.getTokenAcessoExpiraEm(),
                cliente.isAtivo(),
                cliente.getCriadoEm(),
                cliente.getAtualizadoEm()
        );
    }
}

package com.nexusos.configuracao.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ConfiguracaoEmpresaRequest(
        @NotBlank @Size(max = 160) String nome,
        @Size(max = 2_800_000) @Pattern(regexp = "^$|^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$") String logo,
        @Pattern(regexp = "^$|^(?:\\D*\\d){11}(?:\\D*\\d{3})?\\D*$", message = "CNPJ/CPF deve conter 11 ou 14 dígitos")
        @Size(max = 18) String documento,
        @Email @Size(max = 160) String email,
        @Size(max = 32) String telefone,
        @Size(max = 300) String endereco,
        @NotBlank @Pattern(regexp = "^#[0-9A-Fa-f]{6}$") String corPrincipal
) {
}

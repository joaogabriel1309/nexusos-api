package com.nexusos.whatsapp.dto;

import com.nexusos.whatsapp.WhatsappProvider;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ConfiguracaoWhatsappRequest(
        @NotNull Boolean habilitado,
        @NotNull WhatsappProvider provedor,
        @Size(max = 1000) String credencial,
        @Pattern(regexp = "^$|^\\+?[0-9 ()-]{10,32}$", message = "Numero de WhatsApp invalido") String numeroPadrao,
        @Size(max = 100) @Pattern(regexp = "^$|^[0-9]+$", message = "ID do numero da Meta deve conter apenas digitos")
        String metaPhoneNumberId
) {
}


package com.nexusos.configuracao.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record ConfiguracaoIARequest(
        boolean habilitado,
        @NotBlank @Size(max = 300) @Pattern(regexp = "https://api\\.openai\\.com/v1/chat/completions", message = "Use o endpoint oficial de Chat Completions da OpenAI.") String apiUrl,
        @NotBlank @Size(max = 100) String modelo,
        @Size(max = 500) String apiKey,
        @NotNull @DecimalMin("0.0") @DecimalMax("2.0") BigDecimal temperatura) {}

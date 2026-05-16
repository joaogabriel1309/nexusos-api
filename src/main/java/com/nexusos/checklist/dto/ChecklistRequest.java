package com.nexusos.checklist.dto;

import jakarta.validation.constraints.NotBlank;

public record ChecklistRequest(@NotBlank String descricao, boolean obrigatorio) {
}

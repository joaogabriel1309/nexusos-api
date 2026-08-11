package com.nexusos.checklist.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChecklistRequest(@NotBlank @Size(max = 500) String descricao, boolean obrigatorio) {
}

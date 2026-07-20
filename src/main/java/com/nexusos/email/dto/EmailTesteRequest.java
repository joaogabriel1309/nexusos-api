package com.nexusos.email.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record EmailTesteRequest(@NotBlank @Email @Size(max = 255) String destinatario) {
}

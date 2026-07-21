package com.nexusos.ordemservico.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
public record GithubBranchRequest(@NotBlank @Size(max=255) String branch) {}

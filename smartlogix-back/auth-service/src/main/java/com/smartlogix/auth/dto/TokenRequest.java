package com.smartlogix.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record TokenRequest(
        @NotBlank(message = "El token es obligatorio")
        String token
) {
}

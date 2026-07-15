package com.smartlogix.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProductAnswerRequest(
        @NotBlank(message = "La respuesta es obligatoria")
        @Size(max = 1000, message = "La respuesta permite hasta 1000 caracteres")
        String answer
) {
}

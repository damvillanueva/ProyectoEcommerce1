package com.smartlogix.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProductQuestionRequest(
        @NotBlank(message = "La pregunta es obligatoria")
        @Size(max = 500, message = "La pregunta permite hasta 500 caracteres")
        String question
) {
}

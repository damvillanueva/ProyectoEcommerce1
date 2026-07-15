package com.smartlogix.inventory.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProductReviewRequest(
        @Min(value = 1, message = "La calificacion minima es 1")
        @Max(value = 5, message = "La calificacion maxima es 5")
        int rating,

        @NotBlank(message = "El titulo es obligatorio")
        @Size(max = 100, message = "El titulo permite hasta 100 caracteres")
        String title,

        @NotBlank(message = "El comentario es obligatorio")
        @Size(max = 1200, message = "El comentario permite hasta 1200 caracteres")
        String comment
) {
}

package com.smartlogix.order.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CancelOrderRequest(
        @NotBlank @Size(max = 250) String reason
) {
}

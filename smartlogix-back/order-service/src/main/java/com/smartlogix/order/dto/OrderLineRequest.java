package com.smartlogix.order.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record OrderLineRequest(
        @NotBlank String sku,
        @Min(1) int quantity
) {
}

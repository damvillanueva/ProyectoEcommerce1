package com.smartlogix.inventory.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record RestockInventoryLineRequest(
        @NotBlank String sku,
        @Min(1) int quantity
) {
}

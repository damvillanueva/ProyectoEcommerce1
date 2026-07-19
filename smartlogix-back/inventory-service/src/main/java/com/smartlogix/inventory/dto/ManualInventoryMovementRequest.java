package com.smartlogix.inventory.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ManualInventoryMovementRequest(
        @NotBlank String sku,
        @NotBlank String movementType,
        @Min(0) int quantity,
        @Size(max = 255) String reason,
        String warehouseCode
) {
    public ManualInventoryMovementRequest(
            String sku,
            String movementType,
            int quantity,
            String reason
    ) {
        this(sku, movementType, quantity, reason, null);
    }
}

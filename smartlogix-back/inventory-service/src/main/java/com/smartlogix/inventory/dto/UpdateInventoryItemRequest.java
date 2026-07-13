package com.smartlogix.inventory.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record UpdateInventoryItemRequest(
        @NotBlank String productName,
        String imageUrl,
        String category,
        @NotBlank String warehouseCode,
        @Min(0) int availableQuantity,
        @Min(0) int reservedQuantity,
        @Min(0) int reorderLevel
) {
}

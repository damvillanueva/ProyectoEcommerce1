package com.smartlogix.inventory.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record CreateInventoryItemRequest(
        @NotBlank String sku,
        @NotBlank String productName,
        String imageUrl,
        String category,
        @NotBlank String warehouseCode,
        String locationZone,
        String locationAisle,
        @Min(1) Integer locationRack,
        @Min(1) Integer locationLevel,
        @Min(1) Integer locationPosition,
        @Min(0) int initialQuantity,
        @Min(0) int reorderLevel
) {
}

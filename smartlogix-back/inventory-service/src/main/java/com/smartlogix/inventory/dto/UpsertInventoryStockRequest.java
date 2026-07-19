package com.smartlogix.inventory.dto;

import jakarta.validation.constraints.Min;

public record UpsertInventoryStockRequest(
        String locationZone,
        String locationAisle,
        @Min(1) Integer locationRack,
        @Min(1) Integer locationLevel,
        @Min(1) Integer locationPosition,
        @Min(0) int availableQuantity,
        @Min(0) int reorderLevel
) {
}

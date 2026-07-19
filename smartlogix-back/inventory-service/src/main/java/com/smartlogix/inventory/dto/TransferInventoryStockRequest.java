package com.smartlogix.inventory.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TransferInventoryStockRequest(
        @NotBlank String sourceWarehouseCode,
        @NotBlank String destinationWarehouseCode,
        @Min(1) int quantity,
        @Size(max = 120) String reason,
        String destinationLocationZone,
        String destinationLocationAisle,
        @Min(1) Integer destinationLocationRack,
        @Min(1) Integer destinationLocationLevel,
        @Min(1) Integer destinationLocationPosition,
        @Min(0) Integer destinationReorderLevel
) {
}

package com.smartlogix.inventory.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import jakarta.validation.constraints.Size;

public record UpdateInventoryItemRequest(
        @NotBlank String productName,
        String imageUrl,
        String category,
        @Size(max = 80) String brand,
        @Size(max = 280) String shortDescription,
        @NotNull @DecimalMin("0.01") BigDecimal salePrice,
        @DecimalMin("0.01") BigDecimal originalPrice,
        Boolean featured,
        Boolean fastShipping,
        Boolean freeShipping,
        Boolean storePickup,
        @NotBlank String warehouseCode,
        String locationZone,
        String locationAisle,
        @Min(1) Integer locationRack,
        @Min(1) Integer locationLevel,
        @Min(1) Integer locationPosition,
        @Min(0) int availableQuantity,
        @Min(0) int reservedQuantity,
        @Min(0) int reorderLevel
) {
}

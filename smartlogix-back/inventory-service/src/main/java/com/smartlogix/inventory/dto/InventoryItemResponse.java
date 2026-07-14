package com.smartlogix.inventory.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record InventoryItemResponse(
        String sku,
        String productName,
        String imageUrl,
        String category,
        String brand,
        String shortDescription,
        BigDecimal salePrice,
        BigDecimal originalPrice,
        boolean featured,
        boolean fastShipping,
        boolean freeShipping,
        boolean storePickup,
        String warehouseCode,
        String locationZone,
        String locationAisle,
        int locationRack,
        int locationLevel,
        int locationPosition,
        int availableQuantity,
        int reservedQuantity,
        int reorderLevel,
        OffsetDateTime updatedAt
) {
}

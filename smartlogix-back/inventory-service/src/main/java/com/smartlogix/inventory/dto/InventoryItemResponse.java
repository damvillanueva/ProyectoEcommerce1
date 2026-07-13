package com.smartlogix.inventory.dto;

import java.time.OffsetDateTime;

public record InventoryItemResponse(
        String sku,
        String productName,
        String imageUrl,
        String category,
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

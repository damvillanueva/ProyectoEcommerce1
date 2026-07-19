package com.smartlogix.inventory.dto;

import java.time.OffsetDateTime;

public record InventoryStockResponse(
        String warehouseCode,
        String warehouseName,
        String city,
        boolean warehouseActive,
        int dispatchPriority,
        String locationZone,
        String locationAisle,
        int locationRack,
        int locationLevel,
        int locationPosition,
        int availableQuantity,
        int reservedQuantity,
        int totalQuantity,
        int reorderLevel,
        boolean critical,
        OffsetDateTime updatedAt
) {
}

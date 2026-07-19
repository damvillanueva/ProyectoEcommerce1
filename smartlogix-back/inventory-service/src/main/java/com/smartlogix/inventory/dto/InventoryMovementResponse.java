package com.smartlogix.inventory.dto;

import java.time.LocalDateTime;

public record InventoryMovementResponse(
        Long id,
        Long inventoryItemId,
        String productName,
        String sku,
        String movementType,
        String actionType,
        Integer quantity,
        Integer previousStock,
        Integer newStock,
        String username,
        String reason,
        String warehouseCode,
        LocalDateTime createdAt
) {
}

package com.smartlogix.inventory.dto;

public record InventoryTransferResponse(
        String reference,
        String sku,
        String productName,
        String sourceWarehouseCode,
        String destinationWarehouseCode,
        int quantity,
        String reason,
        InventoryMovementResponse sourceMovement,
        InventoryMovementResponse destinationMovement
) {
}

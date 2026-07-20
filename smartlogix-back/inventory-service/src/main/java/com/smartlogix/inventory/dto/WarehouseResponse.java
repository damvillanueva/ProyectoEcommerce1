package com.smartlogix.inventory.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record WarehouseResponse(
        String code,
        String name,
        String city,
        String region,
        String address,
        boolean active,
        int dispatchPriority,
        int aisleCount,
        int rackCount,
        int levelCount,
        int positionsPerLevel,
        List<String> zoneCodes,
        long productCount,
        int totalQuantity,
        int availableQuantity,
        int reservedQuantity,
        long criticalProducts,
        long occupiedLocations,
        long locationCapacity,
        OffsetDateTime updatedAt
) {
}

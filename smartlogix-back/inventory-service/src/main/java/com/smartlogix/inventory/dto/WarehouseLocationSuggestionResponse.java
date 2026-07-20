package com.smartlogix.inventory.dto;

public record WarehouseLocationSuggestionResponse(
        String warehouseCode,
        String zone,
        String aisle,
        int rack,
        int level,
        int position,
        String code,
        long occupiedLocations,
        long availableLocations,
        long locationCapacity
) {
}

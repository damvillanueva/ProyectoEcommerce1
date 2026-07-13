package com.smartlogix.inventory.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record InventoryHistoryReportResponse(
        Long id,
        String username,
        String productFilter,
        String movementTypeFilter,
        String actionFilter,
        String userFilter,
        LocalDate startDate,
        LocalDate endDate,
        Integer minQuantity,
        Integer maxQuantity,
        Long totalMovements,
        LocalDateTime createdAt
) {
}

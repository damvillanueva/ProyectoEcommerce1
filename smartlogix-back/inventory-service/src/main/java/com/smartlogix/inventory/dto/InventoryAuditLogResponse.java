package com.smartlogix.inventory.dto;

import java.time.LocalDateTime;

public record InventoryAuditLogResponse(
        Long id,
        String action,
        String sku,
        String productName,
        String username,
        String role,
        String ipAddress,
        String detail,
        LocalDateTime createdAt
) {
}

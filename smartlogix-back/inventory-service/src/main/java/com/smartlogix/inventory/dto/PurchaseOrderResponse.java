package com.smartlogix.inventory.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public record PurchaseOrderResponse(
        Long id,
        String orderNumber,
        Long supplierId,
        String supplierCode,
        String supplierName,
        String warehouseCode,
        String warehouseName,
        String status,
        LocalDate expectedAt,
        String notes,
        String createdBy,
        String approvedBy,
        BigDecimal total,
        int orderedUnits,
        int receivedUnits,
        List<PurchaseOrderLineResponse> lines,
        OffsetDateTime createdAt,
        OffsetDateTime approvedAt,
        OffsetDateTime receivedAt,
        OffsetDateTime updatedAt
) {
}

package com.smartlogix.inventory.dto;

import java.math.BigDecimal;

public record ReplenishmentProposalResponse(
        String sku,
        String productName,
        String warehouseCode,
        int availableQuantity,
        int reorderLevel,
        int suggestedQuantity,
        Long supplierId,
        String supplierName,
        String supplierSku,
        BigDecimal unitCost,
        BigDecimal estimatedTotal
) {
}

package com.smartlogix.inventory.dto;

import java.math.BigDecimal;

public record PurchaseOrderLineResponse(
        Long id,
        String sku,
        String productName,
        String supplierSku,
        int orderedQuantity,
        int receivedQuantity,
        int pendingQuantity,
        BigDecimal unitCost,
        BigDecimal subtotal
) {
}

package com.smartlogix.inventory.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record SupplierProductResponse(
        Long id,
        String sku,
        String productName,
        String supplierSku,
        BigDecimal unitCost,
        int minimumOrderQuantity,
        boolean preferred,
        BigDecimal salePrice,
        BigDecimal marginAmount,
        BigDecimal marginPercentage,
        BigDecimal suggestedSalePrice,
        OffsetDateTime updatedAt
) {
}

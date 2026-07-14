package com.smartlogix.order.client;

import java.math.BigDecimal;

public record CatalogProductResponse(
        String sku,
        String productName,
        String imageUrl,
        String category,
        BigDecimal salePrice,
        int availableQuantity,
        boolean inStock,
        boolean lowStock
) {
}

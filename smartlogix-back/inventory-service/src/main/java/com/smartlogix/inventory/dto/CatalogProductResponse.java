package com.smartlogix.inventory.dto;

import java.math.BigDecimal;

public record CatalogProductResponse(
        String sku,
        String productName,
        String imageUrl,
        String category,
        String brand,
        String shortDescription,
        BigDecimal salePrice,
        BigDecimal originalPrice,
        boolean featured,
        boolean fastShipping,
        boolean freeShipping,
        boolean storePickup,
        int availableQuantity,
        boolean inStock,
        boolean lowStock
) {
}

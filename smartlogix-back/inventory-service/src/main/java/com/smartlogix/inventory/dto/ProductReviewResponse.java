package com.smartlogix.inventory.dto;

import java.time.OffsetDateTime;

public record ProductReviewResponse(
        Long id,
        String sku,
        String username,
        int rating,
        String title,
        String comment,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}

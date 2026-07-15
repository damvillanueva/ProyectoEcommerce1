package com.smartlogix.inventory.dto;

import java.time.OffsetDateTime;

public record ProductQuestionResponse(
        Long id,
        String sku,
        String username,
        String question,
        String answer,
        String answeredBy,
        OffsetDateTime createdAt,
        OffsetDateTime answeredAt
) {
}

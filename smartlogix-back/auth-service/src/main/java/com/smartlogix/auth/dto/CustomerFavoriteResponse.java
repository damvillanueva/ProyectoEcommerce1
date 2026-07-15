package com.smartlogix.auth.dto;

import java.time.LocalDateTime;

public record CustomerFavoriteResponse(
        String sku,
        LocalDateTime createdAt
) {
}

package com.smartlogix.order.postsale;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record CreatePostSaleLineRequest(
        @NotBlank String sku,
        @Min(1) int quantity
) {
}

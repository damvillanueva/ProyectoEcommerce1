package com.smartlogix.order.postsale;

import com.smartlogix.order.domain.ProductCondition;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ReceivePostSaleLineRequest(
        @NotBlank String sku,
        @Min(1) int receivedQuantity,
        @Min(0) int restockQuantity,
        @NotNull ProductCondition condition
) {
}

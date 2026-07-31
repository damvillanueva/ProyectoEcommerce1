package com.smartlogix.inventory.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ReceivePurchaseOrderLineRequest(
        @NotNull Long lineId,
        @Min(1) int quantity
) {
}

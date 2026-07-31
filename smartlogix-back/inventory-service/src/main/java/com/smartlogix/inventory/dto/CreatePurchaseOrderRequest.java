package com.smartlogix.inventory.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;

public record CreatePurchaseOrderRequest(
        @NotNull Long supplierId,
        @NotNull @Size(max = 40) String warehouseCode,
        @NotNull @FutureOrPresent LocalDate expectedAt,
        @Size(max = 500) String notes,
        @NotEmpty List<@Valid CreatePurchaseOrderLineRequest> lines
) {
}

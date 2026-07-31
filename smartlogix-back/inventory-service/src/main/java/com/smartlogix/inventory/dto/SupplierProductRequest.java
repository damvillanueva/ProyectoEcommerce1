package com.smartlogix.inventory.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record SupplierProductRequest(
        @NotBlank @Size(max = 60) String sku,
        @NotBlank @Size(max = 60) String supplierSku,
        @NotNull @DecimalMin("0.01") BigDecimal unitCost,
        @Min(1) int minimumOrderQuantity,
        boolean preferred
) {
}

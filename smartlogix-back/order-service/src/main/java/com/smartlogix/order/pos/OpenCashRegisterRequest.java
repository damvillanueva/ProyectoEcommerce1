package com.smartlogix.order.pos;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;

public record OpenCashRegisterRequest(
        @NotBlank String registerCode,
        @DecimalMin(value = "0.00") BigDecimal openingAmount
) {
}

package com.smartlogix.order.pos;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record CloseCashRegisterRequest(
        @NotNull @DecimalMin(value = "0.00") BigDecimal declaredCash
) {
}

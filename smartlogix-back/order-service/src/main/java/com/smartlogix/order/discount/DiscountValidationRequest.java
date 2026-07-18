package com.smartlogix.order.discount;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record DiscountValidationRequest(
        @NotBlank(message = "El codigo de descuento es obligatorio.")
        String code,
        @NotNull(message = "El subtotal es obligatorio.")
        @DecimalMin(value = "0.01", message = "El subtotal debe ser mayor a cero.")
        BigDecimal subtotal
) {
}

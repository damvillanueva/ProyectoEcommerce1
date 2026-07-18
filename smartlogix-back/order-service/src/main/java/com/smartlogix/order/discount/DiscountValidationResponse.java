package com.smartlogix.order.discount;

import java.math.BigDecimal;

public record DiscountValidationResponse(
        String code,
        Integer percentage,
        BigDecimal subtotalAmount,
        BigDecimal discountAmount,
        BigDecimal totalAfterDiscount
) {
}

package com.smartlogix.order.dto;

import com.smartlogix.order.domain.ShippingMethod;
import java.math.BigDecimal;

public record ShippingOptionResponse(
        ShippingMethod method,
        BigDecimal amount,
        int estimatedDaysMin,
        int estimatedDaysMax,
        boolean available,
        String note
) {
}

package com.smartlogix.order.dto;

import java.math.BigDecimal;
import java.util.List;

public record ShippingQuoteResponse(
        String region,
        String commune,
        String zoneCode,
        String zoneName,
        BigDecimal subtotal,
        BigDecimal freeShippingThreshold,
        BigDecimal remainingForFreeShipping,
        List<ShippingOptionResponse> options
) {
}

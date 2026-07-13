package com.smartlogix.order.dto;

import com.smartlogix.order.domain.OrderStatus;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record OrderResponse(
        String orderNumber,
        OrderStatus status,
        BigDecimal subtotalAmount,
        BigDecimal discountAmount,
        BigDecimal totalAmount,
        String discountCode,
        String trackingCode,
        String rejectionReason,
        OffsetDateTime createdAt,
        List<OrderLineResponse> lines
) {
}
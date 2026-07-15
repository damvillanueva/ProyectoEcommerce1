package com.smartlogix.order.dto;

import com.smartlogix.order.domain.OrderStatus;
import com.smartlogix.order.domain.OrderChannel;
import com.smartlogix.order.domain.FulfillmentMethod;
import com.smartlogix.order.domain.PaymentMethod;
import com.smartlogix.order.domain.PaymentStatus;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record OrderResponse(
        String orderNumber,
        String customerName,
        String customerEmail,
        OrderChannel salesChannel,
        String shippingAddress,
        FulfillmentMethod fulfillmentMethod,
        String pickupLocation,
        PaymentMethod paymentMethod,
        PaymentStatus paymentStatus,
        String transactionReference,
        OrderStatus status,
        BigDecimal subtotalAmount,
        BigDecimal discountAmount,
        BigDecimal shippingAmount,
        BigDecimal totalAmount,
        String discountCode,
        String trackingCode,
        String rejectionReason,
        OffsetDateTime createdAt,
        List<OrderLineResponse> lines
) {
}

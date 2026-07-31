package com.smartlogix.order.pos;

import com.smartlogix.order.domain.OrderStatus;
import com.smartlogix.order.domain.PaymentMethod;
import com.smartlogix.order.domain.PaymentStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record PosSaleResponse(
        String receiptNumber,
        String orderNumber,
        String sessionNumber,
        String registerCode,
        String cashierUsername,
        String customerName,
        String customerEmail,
        PaymentMethod paymentMethod,
        PaymentStatus paymentStatus,
        OrderStatus status,
        BigDecimal subtotalAmount,
        BigDecimal discountAmount,
        BigDecimal totalAmount,
        BigDecimal amountTendered,
        BigDecimal changeAmount,
        String discountCode,
        String transactionReference,
        OffsetDateTime createdAt,
        List<PosSaleLineResponse> lines
) {
}

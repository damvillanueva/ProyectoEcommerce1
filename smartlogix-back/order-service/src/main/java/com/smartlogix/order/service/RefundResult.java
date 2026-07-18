package com.smartlogix.order.service;

import com.smartlogix.order.domain.PaymentStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

record RefundResult(
        PaymentStatus status,
        String reference,
        OffsetDateTime processedAt,
        BigDecimal amount
) {
}

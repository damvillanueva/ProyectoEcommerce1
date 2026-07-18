package com.smartlogix.order.service;

import com.smartlogix.order.domain.PaymentStatus;
import java.time.OffsetDateTime;

record PaymentResult(
        PaymentStatus status,
        String transactionReference,
        String authorizationCode,
        OffsetDateTime processedAt,
        String failureReason
) {
}

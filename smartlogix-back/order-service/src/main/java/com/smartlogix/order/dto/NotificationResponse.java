package com.smartlogix.order.dto;

import com.smartlogix.order.domain.NotificationDeliveryStatus;
import com.smartlogix.order.domain.NotificationType;
import java.time.OffsetDateTime;

public record NotificationResponse(
        Long id,
        String customerUsername,
        String recipientEmail,
        String orderNumber,
        NotificationType type,
        String title,
        String message,
        NotificationDeliveryStatus deliveryStatus,
        String failureReason,
        OffsetDateTime createdAt,
        OffsetDateTime sentAt,
        OffsetDateTime readAt
) {
}

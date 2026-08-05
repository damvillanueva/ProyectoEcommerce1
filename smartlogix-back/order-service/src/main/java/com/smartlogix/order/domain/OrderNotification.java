package com.smartlogix.order.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "order_notifications")
public class OrderNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 50)
    private String customerUsername;

    @Column(nullable = false, length = 120)
    private String recipientEmail;

    @Column(nullable = false, length = 50)
    private String orderNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private NotificationType type;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(nullable = false, length = 1200)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private NotificationDeliveryStatus deliveryStatus = NotificationDeliveryStatus.PENDING;

    @Column(length = 300)
    private String failureReason;

    @Column(nullable = false)
    private OffsetDateTime createdAt;

    private OffsetDateTime sentAt;

    private OffsetDateTime readAt;

    protected OrderNotification() {
    }

    public OrderNotification(
            String customerUsername,
            String recipientEmail,
            String orderNumber,
            NotificationType type,
            String title,
            String message
    ) {
        this.customerUsername = customerUsername;
        this.recipientEmail = recipientEmail;
        this.orderNumber = orderNumber;
        this.type = type;
        this.title = title;
        this.message = message;
    }

    @PrePersist
    void beforeInsert() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }

    public void markRead() {
        if (readAt == null) {
            readAt = OffsetDateTime.now();
        }
    }

    public void markSent() {
        deliveryStatus = NotificationDeliveryStatus.SENT;
        sentAt = OffsetDateTime.now();
        failureReason = null;
    }

    public void markFailed(String reason) {
        deliveryStatus = NotificationDeliveryStatus.FAILED;
        failureReason = reason;
    }

    public void prepareRetry() {
        deliveryStatus = NotificationDeliveryStatus.PENDING;
        failureReason = null;
        sentAt = null;
    }

    public Long getId() {
        return id;
    }

    public String getCustomerUsername() {
        return customerUsername;
    }

    public String getRecipientEmail() {
        return recipientEmail;
    }

    public String getOrderNumber() {
        return orderNumber;
    }

    public NotificationType getType() {
        return type;
    }

    public String getTitle() {
        return title;
    }

    public String getMessage() {
        return message;
    }

    public NotificationDeliveryStatus getDeliveryStatus() {
        return deliveryStatus;
    }

    public String getFailureReason() {
        return failureReason;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getSentAt() {
        return sentAt;
    }

    public OffsetDateTime getReadAt() {
        return readAt;
    }
}

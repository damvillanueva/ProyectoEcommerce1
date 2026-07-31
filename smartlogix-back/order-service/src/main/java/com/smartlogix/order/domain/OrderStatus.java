package com.smartlogix.order.domain;

public enum OrderStatus {
    PENDING,
    APPROVED,
    REJECTED,
    SHIPMENT_REQUESTED,
    SHIPPED,
    DELIVERED,
    COMPLETED,
    CANCELLED,
    FAILED
}

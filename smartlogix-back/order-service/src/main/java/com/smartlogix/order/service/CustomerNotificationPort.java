package com.smartlogix.order.service;

import com.smartlogix.order.domain.NotificationType;
import com.smartlogix.order.domain.PurchaseOrder;

@FunctionalInterface
public interface CustomerNotificationPort {

    void queue(PurchaseOrder order, NotificationType type);

    static CustomerNotificationPort noop() {
        return (order, type) -> { };
    }
}

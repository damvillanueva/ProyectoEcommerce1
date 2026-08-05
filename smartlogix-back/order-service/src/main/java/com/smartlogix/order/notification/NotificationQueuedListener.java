package com.smartlogix.order.notification;

import com.smartlogix.order.service.NotificationDeliveryService;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class NotificationQueuedListener {

    private final NotificationDeliveryService deliveryService;

    public NotificationQueuedListener(NotificationDeliveryService deliveryService) {
        this.deliveryService = deliveryService;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onQueued(NotificationQueuedEvent event) {
        deliveryService.deliver(event.notificationId());
    }
}

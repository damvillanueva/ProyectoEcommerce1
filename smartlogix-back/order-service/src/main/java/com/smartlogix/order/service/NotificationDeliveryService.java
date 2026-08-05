package com.smartlogix.order.service;

import com.smartlogix.order.domain.NotificationDeliveryStatus;
import com.smartlogix.order.domain.OrderNotification;
import com.smartlogix.order.repository.OrderNotificationRepository;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationDeliveryService {

    private static final Logger log = LoggerFactory.getLogger(NotificationDeliveryService.class);

    private final OrderNotificationRepository repository;
    private final JavaMailSender mailSender;
    private final MeterRegistry meterRegistry;
    private final String frontendUrl;
    private final String fromAddress;

    public NotificationDeliveryService(
            OrderNotificationRepository repository,
            JavaMailSender mailSender,
            MeterRegistry meterRegistry,
            @Value("${smartlogix.frontend-url:http://127.0.0.1:5174}") String frontendUrl,
            @Value("${smartlogix.mail.from:no-reply@smartlogix.local}") String fromAddress
    ) {
        this.repository = repository;
        this.mailSender = mailSender;
        this.meterRegistry = meterRegistry;
        this.frontendUrl = frontendUrl.replaceAll("/+$", "");
        this.fromAddress = fromAddress;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void deliver(Long notificationId) {
        OrderNotification notification = repository.findById(notificationId).orElse(null);
        if (notification == null
                || notification.getDeliveryStatus() != NotificationDeliveryStatus.PENDING) {
            return;
        }

        try {
            SimpleMailMessage email = new SimpleMailMessage();
            email.setFrom(fromAddress);
            email.setTo(notification.getRecipientEmail());
            email.setSubject("[SmartLogix] " + notification.getTitle());
            email.setText(buildBody(notification));
            mailSender.send(email);
            notification.markSent();
            repository.save(notification);
            meterRegistry.counter("smartlogix.notifications.delivery", "result", "sent").increment();
            log.info("notification_sent id={} orderNumber={} type={}",
                    notification.getId(), notification.getOrderNumber(), notification.getType());
        } catch (RuntimeException exception) {
            notification.markFailed(safeReason(exception));
            repository.save(notification);
            meterRegistry.counter("smartlogix.notifications.delivery", "result", "failed").increment();
            log.error("notification_failed id={} orderNumber={} type={} reason={}",
                    notification.getId(),
                    notification.getOrderNumber(),
                    notification.getType(),
                    notification.getFailureReason());
        }
    }

    private String buildBody(OrderNotification notification) {
        return notification.getTitle() + "\n\n"
                + notification.getMessage() + "\n\n"
                + "Pedido: " + notification.getOrderNumber() + "\n"
                + "Revisar mi cuenta: " + frontendUrl + "/shop/account\n\n"
                + "Este es un mensaje transaccional automatico de SmartLogix.";
    }

    private String safeReason(RuntimeException exception) {
        String message = exception.getMessage();
        if (message == null || message.isBlank()) {
            return exception.getClass().getSimpleName();
        }
        String compact = message.replaceAll("[\\r\\n]+", " ").trim();
        return compact.substring(0, Math.min(compact.length(), 300));
    }
}

package com.smartlogix.order.service;

import com.smartlogix.order.domain.NotificationDeliveryStatus;
import com.smartlogix.order.domain.NotificationType;
import com.smartlogix.order.domain.OrderNotification;
import com.smartlogix.order.domain.OrderStatus;
import com.smartlogix.order.domain.PurchaseOrder;
import com.smartlogix.order.dto.NotificationResponse;
import com.smartlogix.order.exception.OrderNotFoundException;
import com.smartlogix.order.notification.NotificationQueuedEvent;
import com.smartlogix.order.repository.OrderNotificationRepository;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class OrderNotificationService implements CustomerNotificationPort {

    private static final Logger log = LoggerFactory.getLogger(OrderNotificationService.class);

    private final OrderNotificationRepository repository;
    private final ApplicationEventPublisher eventPublisher;

    public OrderNotificationService(
            OrderNotificationRepository repository,
            ApplicationEventPublisher eventPublisher
    ) {
        this.repository = repository;
        this.eventPublisher = eventPublisher;
    }

    @Override
    public void queue(PurchaseOrder order, NotificationType type) {
        if (order.getCustomerEmail() == null || order.getCustomerEmail().isBlank()) {
            log.warn("notification_skipped orderNumber={} type={} reason=missing_email",
                    order.getOrderNumber(), type);
            return;
        }

        NotificationContent content = contentFor(order, type);
        OrderNotification notification = repository.save(new OrderNotification(
                clean(order.getCustomerUsername()),
                order.getCustomerEmail().trim(),
                order.getOrderNumber(),
                type,
                content.title(),
                content.message()
        ));
        eventPublisher.publishEvent(new NotificationQueuedEvent(notification.getId()));
        log.info("notification_queued id={} orderNumber={} type={}",
                notification.getId(), order.getOrderNumber(), type);
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> listMine(String username) {
        return repository.findAllByCustomerUsernameOrderByCreatedAtDesc(username).stream()
                .map(this::toCustomerResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> listAll() {
        return repository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    public NotificationResponse markMineRead(String username, Long notificationId) {
        OrderNotification notification = repository.findByIdAndCustomerUsername(notificationId, username)
                .orElseThrow(() -> new OrderNotFoundException("No existe la notificacion solicitada."));
        notification.markRead();
        return toCustomerResponse(repository.save(notification));
    }

    public void markAllMineRead(String username) {
        List<OrderNotification> notifications =
                repository.findAllByCustomerUsernameOrderByCreatedAtDesc(username);
        notifications.forEach(OrderNotification::markRead);
        repository.saveAll(notifications);
    }

    public NotificationResponse retry(Long notificationId) {
        OrderNotification notification = repository.findById(notificationId)
                .orElseThrow(() -> new OrderNotFoundException("No existe la notificacion solicitada."));
        if (notification.getDeliveryStatus() == NotificationDeliveryStatus.SENT) {
            throw new IllegalArgumentException("La notificacion ya fue enviada correctamente.");
        }
        notification.prepareRetry();
        OrderNotification saved = repository.save(notification);
        eventPublisher.publishEvent(new NotificationQueuedEvent(saved.getId()));
        log.info("notification_retry_queued id={} orderNumber={}", saved.getId(), saved.getOrderNumber());
        return toResponse(saved);
    }

    private NotificationContent contentFor(PurchaseOrder order, NotificationType type) {
        String number = order.getOrderNumber();
        return switch (type) {
            case ORDER_CONFIRMED -> new NotificationContent(
                    "Pedido " + number + " recibido",
                    "Recibimos tu pedido y ya puedes revisar su detalle y seguimiento en tu cuenta."
            );
            case PAYMENT_CONFIRMED -> new NotificationContent(
                    "Pago confirmado para " + number,
                    "El pago de tu pedido fue aprobado correctamente."
            );
            case PAYMENT_REJECTED -> new NotificationContent(
                    "Pago rechazado para " + number,
                    "No pudimos aprobar el pago. No se descontara stock y puedes intentar una nueva compra."
            );
            case SHIPMENT_UPDATED -> new NotificationContent(
                    order.getStatus() == OrderStatus.DELIVERED
                            ? "Pedido " + number + " entregado"
                            : "Pedido " + number + " en camino",
                    order.getStatus() == OrderStatus.DELIVERED
                            ? "Tu pedido fue marcado como entregado."
                            : "Tu pedido salio a despacho. Revisa el seguimiento desde tu cuenta."
            );
            case ORDER_CANCELLED -> new NotificationContent(
                    "Pedido " + number + " cancelado",
                    "Tu pedido fue cancelado. El estado del reembolso esta disponible en el detalle de la compra."
            );
        };
    }

    private NotificationResponse toResponse(OrderNotification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getCustomerUsername(),
                notification.getRecipientEmail(),
                notification.getOrderNumber(),
                notification.getType(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getDeliveryStatus(),
                notification.getFailureReason(),
                notification.getCreatedAt(),
                notification.getSentAt(),
                notification.getReadAt()
        );
    }

    private NotificationResponse toCustomerResponse(OrderNotification notification) {
        NotificationResponse response = toResponse(notification);
        return new NotificationResponse(
                response.id(),
                response.customerUsername(),
                response.recipientEmail(),
                response.orderNumber(),
                response.type(),
                response.title(),
                response.message(),
                response.deliveryStatus(),
                null,
                response.createdAt(),
                response.sentAt(),
                response.readAt()
        );
    }

    private String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private record NotificationContent(String title, String message) {
    }
}

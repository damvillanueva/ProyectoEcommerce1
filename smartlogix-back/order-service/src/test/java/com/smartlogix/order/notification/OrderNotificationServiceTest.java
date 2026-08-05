package com.smartlogix.order.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.smartlogix.order.domain.NotificationType;
import com.smartlogix.order.domain.OrderNotification;
import com.smartlogix.order.domain.PurchaseOrder;
import com.smartlogix.order.dto.NotificationResponse;
import com.smartlogix.order.repository.OrderNotificationRepository;
import com.smartlogix.order.service.OrderNotificationService;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;

class OrderNotificationServiceTest {

    private OrderNotificationRepository repository;
    private ApplicationEventPublisher eventPublisher;
    private OrderNotificationService service;

    @BeforeEach
    void setUp() {
        repository = mock(OrderNotificationRepository.class);
        eventPublisher = mock(ApplicationEventPublisher.class);
        service = new OrderNotificationService(repository, eventPublisher);
    }

    @Test
    void queuesPersistentNotificationAndPublishesDeliveryEvent() {
        PurchaseOrder order = new PurchaseOrder();
        order.setCustomerName("Cliente Demo");
        order.setCustomerEmail("cliente@example.com");
        order.setCustomerUsername("cliente");
        order.beforeInsert();
        when(repository.save(any(OrderNotification.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        service.queue(order, NotificationType.ORDER_CONFIRMED);

        ArgumentCaptor<OrderNotification> captor = ArgumentCaptor.forClass(OrderNotification.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getOrderNumber()).isEqualTo(order.getOrderNumber());
        assertThat(captor.getValue().getRecipientEmail()).isEqualTo("cliente@example.com");
        verify(eventPublisher).publishEvent(any(NotificationQueuedEvent.class));
    }

    @Test
    void hidesTechnicalFailureReasonFromCustomerButKeepsItForOperations() {
        OrderNotification notification = new OrderNotification(
                "cliente",
                "cliente@example.com",
                "ORD-TEST",
                NotificationType.ORDER_CONFIRMED,
                "Pedido recibido",
                "Recibimos tu pedido."
        );
        notification.markFailed("Connection refused smtp.internal:1025");
        when(repository.findAllByCustomerUsernameOrderByCreatedAtDesc("cliente"))
                .thenReturn(List.of(notification));
        when(repository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(notification));

        NotificationResponse customerView = service.listMine("cliente").get(0);
        NotificationResponse operationalView = service.listAll().get(0);

        assertThat(customerView.failureReason()).isNull();
        assertThat(operationalView.failureReason()).contains("smtp.internal");
    }
}

package com.smartlogix.order.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.smartlogix.order.domain.NotificationDeliveryStatus;
import com.smartlogix.order.domain.NotificationType;
import com.smartlogix.order.domain.OrderNotification;
import com.smartlogix.order.repository.OrderNotificationRepository;
import com.smartlogix.order.service.NotificationDeliveryService;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

class NotificationDeliveryServiceTest {

    private OrderNotificationRepository repository;
    private JavaMailSender mailSender;
    private NotificationDeliveryService service;

    @BeforeEach
    void setUp() {
        repository = mock(OrderNotificationRepository.class);
        mailSender = mock(JavaMailSender.class);
        service = new NotificationDeliveryService(
                repository,
                mailSender,
                new SimpleMeterRegistry(),
                "http://127.0.0.1:5174/",
                "no-reply@smartlogix.local"
        );
    }

    @Test
    void marksNotificationAsSentWhenSmtpAcceptsIt() {
        OrderNotification notification = pendingNotification();
        when(repository.findById(1L)).thenReturn(Optional.of(notification));

        service.deliver(1L);

        assertThat(notification.getDeliveryStatus()).isEqualTo(NotificationDeliveryStatus.SENT);
        assertThat(notification.getSentAt()).isNotNull();
        verify(mailSender).send(any(SimpleMailMessage.class));
        verify(repository).save(notification);
    }

    @Test
    void keepsPurchaseFlowSafeAndMarksFailureWhenSmtpIsUnavailable() {
        OrderNotification notification = pendingNotification();
        when(repository.findById(1L)).thenReturn(Optional.of(notification));
        doThrow(new MailSendException("SMTP offline"))
                .when(mailSender).send(any(SimpleMailMessage.class));

        service.deliver(1L);

        assertThat(notification.getDeliveryStatus()).isEqualTo(NotificationDeliveryStatus.FAILED);
        assertThat(notification.getFailureReason()).contains("SMTP offline");
        verify(repository).save(notification);
    }

    private OrderNotification pendingNotification() {
        return new OrderNotification(
                "cliente",
                "cliente@example.com",
                "ORD-TEST",
                NotificationType.ORDER_CONFIRMED,
                "Pedido recibido",
                "Recibimos tu pedido."
        );
    }
}

package com.smartlogix.order.repository;

import com.smartlogix.order.domain.OrderNotification;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderNotificationRepository extends JpaRepository<OrderNotification, Long> {

    List<OrderNotification> findAllByOrderByCreatedAtDesc();

    List<OrderNotification> findAllByCustomerUsernameOrderByCreatedAtDesc(String customerUsername);

    Optional<OrderNotification> findByIdAndCustomerUsername(Long id, String customerUsername);
}

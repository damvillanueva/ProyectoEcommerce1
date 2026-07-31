package com.smartlogix.order.repository;

import com.smartlogix.order.domain.PurchaseOrder;
import java.util.Optional;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {

    Optional<PurchaseOrder> findByOrderNumber(String orderNumber);

    List<PurchaseOrder> findAllByCustomerUsernameOrderByCreatedAtDesc(String customerUsername);

    Optional<PurchaseOrder> findByOrderNumberAndCustomerUsername(
            String orderNumber,
            String customerUsername
    );

    List<PurchaseOrder> findAllByCashRegisterSession_IdOrderByCreatedAtDesc(Long sessionId);
}

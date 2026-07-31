package com.smartlogix.order.repository;

import com.smartlogix.order.domain.CashRegisterSession;
import com.smartlogix.order.domain.CashRegisterStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CashRegisterSessionRepository extends JpaRepository<CashRegisterSession, Long> {

    Optional<CashRegisterSession> findBySessionNumber(String sessionNumber);

    Optional<CashRegisterSession> findFirstByOpenedByAndStatusOrderByOpenedAtDesc(
            String openedBy,
            CashRegisterStatus status
    );

    Optional<CashRegisterSession> findFirstByRegisterCodeAndStatus(
            String registerCode,
            CashRegisterStatus status
    );

    List<CashRegisterSession> findTop20ByOpenedByOrderByOpenedAtDesc(String openedBy);
}

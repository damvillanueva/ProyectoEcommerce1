package com.smartlogix.order.repository;

import com.smartlogix.order.domain.PostSaleRequest;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostSaleRequestRepository extends JpaRepository<PostSaleRequest, Long> {

    Optional<PostSaleRequest> findByRequestNumber(String requestNumber);

    Optional<PostSaleRequest> findByRequestNumberAndCustomerUsername(
            String requestNumber,
            String customerUsername
    );

    List<PostSaleRequest> findAllByOrderByRequestedAtDesc();

    List<PostSaleRequest> findAllByCustomerUsernameOrderByRequestedAtDesc(String customerUsername);

    List<PostSaleRequest> findAllByOrder_OrderNumber(String orderNumber);
}

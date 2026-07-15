package com.smartlogix.inventory.repository;

import com.smartlogix.inventory.domain.ProductReview;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductReviewRepository extends JpaRepository<ProductReview, Long> {

    List<ProductReview> findAllBySkuOrderByUpdatedAtDesc(String sku);

    Optional<ProductReview> findBySkuAndUsername(String sku, String username);

    Optional<ProductReview> findByIdAndSkuAndUsername(Long id, String sku, String username);
}

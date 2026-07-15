package com.smartlogix.inventory.repository;

import com.smartlogix.inventory.domain.ProductQuestion;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductQuestionRepository extends JpaRepository<ProductQuestion, Long> {

    List<ProductQuestion> findAllBySkuOrderByCreatedAtDesc(String sku);

    Optional<ProductQuestion> findByIdAndSku(Long id, String sku);

    Optional<ProductQuestion> findByIdAndSkuAndUsername(Long id, String sku, String username);
}

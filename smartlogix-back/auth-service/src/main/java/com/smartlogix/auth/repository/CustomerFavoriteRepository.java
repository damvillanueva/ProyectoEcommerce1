package com.smartlogix.auth.repository;

import com.smartlogix.auth.domain.CustomerFavorite;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerFavoriteRepository extends JpaRepository<CustomerFavorite, Long> {

    List<CustomerFavorite> findAllByUserUsernameOrderByCreatedAtDesc(String username);

    Optional<CustomerFavorite> findByUserUsernameAndSku(String username, String sku);
}

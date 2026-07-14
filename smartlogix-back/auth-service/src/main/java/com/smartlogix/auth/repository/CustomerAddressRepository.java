package com.smartlogix.auth.repository;

import com.smartlogix.auth.domain.CustomerAddress;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerAddressRepository extends JpaRepository<CustomerAddress, Long> {

    List<CustomerAddress> findAllByUserUsernameOrderByIdAsc(String username);

    Optional<CustomerAddress> findByIdAndUserUsername(Long id, String username);
}

package com.smartlogix.inventory.repository;

import com.smartlogix.inventory.domain.Supplier;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SupplierRepository extends JpaRepository<Supplier, Long> {
    List<Supplier> findAllByOrderByBusinessNameAsc();
    Optional<Supplier> findByCode(String code);
    boolean existsByCode(String code);
    boolean existsByTaxId(String taxId);
    boolean existsByCodeAndIdNot(String code, Long id);
    boolean existsByTaxIdAndIdNot(String taxId, Long id);
}

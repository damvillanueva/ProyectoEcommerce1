package com.smartlogix.inventory.repository;

import com.smartlogix.inventory.domain.SupplierProduct;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SupplierProductRepository extends JpaRepository<SupplierProduct, Long> {
    List<SupplierProduct> findBySupplier_IdOrderByItem_ProductNameAsc(Long supplierId);
    Optional<SupplierProduct> findBySupplier_IdAndItem_Sku(Long supplierId, String sku);
    List<SupplierProduct> findByItem_SkuAndPreferredTrue(String sku);
    List<SupplierProduct> findByItem_Sku(String sku);
}

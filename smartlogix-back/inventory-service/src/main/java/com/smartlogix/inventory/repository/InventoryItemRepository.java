package com.smartlogix.inventory.repository;

import com.smartlogix.inventory.domain.InventoryItem;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InventoryItemRepository extends JpaRepository<InventoryItem, Long> {

    Optional<InventoryItem> findBySku(String sku);

    boolean existsBySku(String sku);

    List<InventoryItem> findByWarehouseCodeOrderByProductNameAsc(String warehouseCode);

    long countByWarehouseCode(String warehouseCode);
}

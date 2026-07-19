package com.smartlogix.inventory.repository;

import com.smartlogix.inventory.domain.Warehouse;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WarehouseRepository extends JpaRepository<Warehouse, String> {
    List<Warehouse> findAllByOrderByDispatchPriorityAscCodeAsc();
}

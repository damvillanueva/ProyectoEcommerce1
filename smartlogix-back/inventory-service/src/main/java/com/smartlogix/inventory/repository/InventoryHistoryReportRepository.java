package com.smartlogix.inventory.repository;

import com.smartlogix.inventory.domain.InventoryHistoryReport;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InventoryHistoryReportRepository extends JpaRepository<InventoryHistoryReport, Long> {

    Optional<InventoryHistoryReport> findTopByOrderByCreatedAtDesc();
}

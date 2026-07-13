package com.smartlogix.inventory.repository;

import com.smartlogix.inventory.domain.InventoryAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InventoryAuditLogRepository extends JpaRepository<InventoryAuditLog, Long> {
}

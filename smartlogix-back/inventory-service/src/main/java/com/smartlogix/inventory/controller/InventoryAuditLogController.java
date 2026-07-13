package com.smartlogix.inventory.controller;

import com.smartlogix.inventory.dto.InventoryAuditLogResponse;
import com.smartlogix.inventory.service.InventoryAuditLogService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/inventory/audit")
public class InventoryAuditLogController {

    private final InventoryAuditLogService auditLogService;

    public InventoryAuditLogController(InventoryAuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public List<InventoryAuditLogResponse> recent(@RequestParam(defaultValue = "10") int limit) {
        return auditLogService.findRecent(limit);
    }
}

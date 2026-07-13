package com.smartlogix.inventory.service;

import com.smartlogix.inventory.domain.InventoryAuditLog;
import com.smartlogix.inventory.dto.InventoryAuditLogResponse;
import com.smartlogix.inventory.repository.InventoryAuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Service
@Transactional
public class InventoryAuditLogService {

    private final InventoryAuditLogRepository repository;

    public InventoryAuditLogService(InventoryAuditLogRepository repository) {
        this.repository = repository;
    }

    public void record(String action, String sku, String productName, String detail) {
        InventoryAuditLog auditLog = new InventoryAuditLog();
        auditLog.setAction(action);
        auditLog.setSku(sku);
        auditLog.setProductName(productName);
        auditLog.setUsername(resolveUsername());
        auditLog.setRole(resolveRole());
        auditLog.setIpAddress(resolveIpAddress());
        auditLog.setDetail(detail);

        repository.save(auditLog);
    }

    @Transactional(readOnly = true)
    public List<InventoryAuditLogResponse> findRecent(int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 50));
        return repository.findAll(
                        PageRequest.of(0, safeLimit, Sort.by(Sort.Direction.DESC, "createdAt"))
                )
                .map(this::toResponse)
                .toList();
    }

    private String resolveUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return "system";
        }

        String username = authentication.getName();
        if (username == null || username.isBlank() || "anonymousUser".equals(username)) {
            return "system";
        }

        return username;
    }

    private String resolveRole() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getAuthorities() == null) {
            return "SYSTEM";
        }

        return authentication.getAuthorities().stream()
                .findFirst()
                .map(Object::toString)
                .orElse("SYSTEM");
    }

    private String resolveIpAddress() {
        if (!(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes)) {
            return "unknown";
        }

        HttpServletRequest request = attributes.getRequest();
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }

        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }

        return request.getRemoteAddr();
    }

    private InventoryAuditLogResponse toResponse(InventoryAuditLog auditLog) {
        return new InventoryAuditLogResponse(
                auditLog.getId(),
                auditLog.getAction(),
                auditLog.getSku(),
                auditLog.getProductName(),
                auditLog.getUsername(),
                auditLog.getRole(),
                auditLog.getIpAddress(),
                auditLog.getDetail(),
                auditLog.getCreatedAt()
        );
    }
}

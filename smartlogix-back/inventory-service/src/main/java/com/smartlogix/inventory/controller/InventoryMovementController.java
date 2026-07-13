package com.smartlogix.inventory.controller;

import com.smartlogix.inventory.domain.ActionType;
import com.smartlogix.inventory.domain.MovementType;
import com.smartlogix.inventory.dto.InventoryMovementResponse;
import com.smartlogix.inventory.dto.ManualInventoryMovementRequest;
import com.smartlogix.inventory.service.InventoryMovementService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.data.domain.Sort;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/inventory/movements")
public class InventoryMovementController {

    private final InventoryMovementService movementService;

    public InventoryMovementController(InventoryMovementService movementService) {
        this.movementService = movementService;
    }

    @GetMapping
    public Page<InventoryMovementResponse> list(
            @RequestParam(required = false) String product,
            @RequestParam(required = false) MovementType type,
            @RequestParam(required = false) ActionType action,
            @RequestParam(name = "user", required = false) String username,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Integer minQuantity,
            @RequestParam(required = false) Integer maxQuantity,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return movementService.findMovements(
                product,
                type,
                action,
                username,
                startDate,
                endDate,
                minQuantity,
                maxQuantity,
                pageable
        );
    }

    @PostMapping("/manual")
    public InventoryMovementResponse registerManual(@Valid @RequestBody ManualInventoryMovementRequest request) {
        return movementService.registerManualMovement(request);
    }

    @GetMapping(value = "/export", produces = "text/csv")
    public ResponseEntity<ByteArrayResource> export(
            @RequestParam(required = false) String product,
            @RequestParam(required = false) MovementType type,
            @RequestParam(required = false) ActionType action,
            @RequestParam(name = "user", required = false) String username,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Integer minQuantity,
            @RequestParam(required = false) Integer maxQuantity
    ) {
        ByteArrayResource resource = movementService.exportCsv(
                product,
                type,
                action,
                username,
                startDate,
                endDate,
                minQuantity,
                maxQuantity
        );

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=inventory-movements.csv")
                .body(resource);
    }
}

package com.smartlogix.inventory.controller;

import com.smartlogix.inventory.dto.ReplenishmentProposalResponse;
import com.smartlogix.inventory.service.ReplenishmentService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/inventory/replenishment")
public class ReplenishmentController {

    private final ReplenishmentService replenishmentService;

    public ReplenishmentController(ReplenishmentService replenishmentService) {
        this.replenishmentService = replenishmentService;
    }

    @GetMapping("/proposals")
    public List<ReplenishmentProposalResponse> findProposals() {
        return replenishmentService.findProposals();
    }
}

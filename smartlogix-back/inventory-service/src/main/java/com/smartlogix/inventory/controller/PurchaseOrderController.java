package com.smartlogix.inventory.controller;

import com.smartlogix.inventory.dto.CreatePurchaseOrderRequest;
import com.smartlogix.inventory.dto.PurchaseOrderResponse;
import com.smartlogix.inventory.dto.ReceivePurchaseOrderRequest;
import com.smartlogix.inventory.service.PurchaseOrderService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/inventory/purchase-orders")
public class PurchaseOrderController {

    private final PurchaseOrderService purchaseOrderService;

    public PurchaseOrderController(PurchaseOrderService purchaseOrderService) {
        this.purchaseOrderService = purchaseOrderService;
    }

    @GetMapping
    public List<PurchaseOrderResponse> findAll() {
        return purchaseOrderService.findAll();
    }

    @GetMapping("/{id}")
    public PurchaseOrderResponse findById(@PathVariable Long id) {
        return purchaseOrderService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PurchaseOrderResponse create(@Valid @RequestBody CreatePurchaseOrderRequest request) {
        return purchaseOrderService.create(request);
    }

    @PostMapping("/{id}/approve")
    public PurchaseOrderResponse approve(@PathVariable Long id) {
        return purchaseOrderService.approve(id);
    }

    @PostMapping("/{id}/receive")
    public PurchaseOrderResponse receive(
            @PathVariable Long id,
            @Valid @RequestBody ReceivePurchaseOrderRequest request
    ) {
        return purchaseOrderService.receive(id, request);
    }

    @PostMapping("/{id}/cancel")
    public PurchaseOrderResponse cancel(@PathVariable Long id) {
        return purchaseOrderService.cancel(id);
    }
}

package com.smartlogix.inventory.controller;

import com.smartlogix.inventory.dto.CreateInventoryItemRequest;
import com.smartlogix.inventory.dto.DispatchInventoryBatchRequest;
import com.smartlogix.inventory.dto.UpdateInventoryItemRequest;
import com.smartlogix.inventory.dto.InventoryAvailabilityResponse;
import com.smartlogix.inventory.dto.InventoryItemResponse;
import com.smartlogix.inventory.dto.InventoryTransferResponse;
import com.smartlogix.inventory.dto.TransferInventoryStockRequest;
import com.smartlogix.inventory.dto.UpsertInventoryStockRequest;
import com.smartlogix.inventory.service.InventoryService;
import com.smartlogix.inventory.service.InventoryTransferService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import java.util.List;
import org.springframework.validation.annotation.Validated;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/inventory")
@Validated
public class InventoryController {

    private final InventoryService inventoryService;
    private final InventoryTransferService transferService;

    public InventoryController(
            InventoryService inventoryService,
            InventoryTransferService transferService
    ) {
        this.inventoryService = inventoryService;
        this.transferService = transferService;
    }

    @PostMapping("/items")
    public InventoryItemResponse create(@Valid @RequestBody CreateInventoryItemRequest request) {
        return inventoryService.createItem(request);
    }

    @GetMapping("/items")
    public List<InventoryItemResponse> list() {
        return inventoryService.findAll();
    }

    @GetMapping("/items/{sku}")
    public InventoryItemResponse findBySku(@PathVariable String sku) {
        return inventoryService.findBySku(sku);
    }

    @GetMapping("/items/{sku}/availability")
    public InventoryAvailabilityResponse checkAvailability(
            @PathVariable String sku,
            @RequestParam @Min(1) int quantity) {
        return inventoryService.checkAvailability(sku, quantity);
    }

    @PatchMapping("/items/{sku}/reserve")
    public InventoryItemResponse reserve(
            @PathVariable String sku,
            @RequestParam @Min(1) int quantity) {
        return inventoryService.reserve(sku, quantity);
    }

    @PostMapping("/items/{sku}/reserve")
    public InventoryItemResponse reservePost(
            @PathVariable String sku,
            @RequestParam @Min(1) int quantity) {
        return inventoryService.reserve(sku, quantity);
    }

    @PatchMapping("/items/{sku}/release")
    public InventoryItemResponse release(
            @PathVariable String sku,
            @RequestParam @Min(1) int quantity) {
        return inventoryService.release(sku, quantity);
    }

    @PostMapping("/items/{sku}/release")
    public InventoryItemResponse releasePost(
            @PathVariable String sku,
            @RequestParam @Min(1) int quantity) {
        return inventoryService.release(sku, quantity);
    }

    @PatchMapping("/items/{sku}/dispatch")
    public InventoryItemResponse dispatch(
            @PathVariable String sku,
            @RequestParam @Min(1) int quantity) {
        return inventoryService.dispatch(sku, quantity);
    }

    @PostMapping("/items/{sku}/dispatch")
    public InventoryItemResponse dispatchPost(
            @PathVariable String sku,
            @RequestParam @Min(1) int quantity) {
        return inventoryService.dispatch(sku, quantity);
    }

    @PostMapping("/items/dispatch-batch")
    public List<InventoryItemResponse> dispatchBatch(
            @Valid @RequestBody DispatchInventoryBatchRequest request
    ) {
        return inventoryService.dispatchBatch(request.lines());
    }

    @PutMapping("/items/{sku}")
    public InventoryItemResponse updateItem(
            @PathVariable String sku,
            @Valid @RequestBody UpdateInventoryItemRequest request) {
        return inventoryService.updateItem(sku, request);
    }

    @PutMapping("/items/{sku}/stocks/{warehouseCode}")
    public InventoryItemResponse upsertStock(
            @PathVariable String sku,
            @PathVariable String warehouseCode,
            @Valid @RequestBody UpsertInventoryStockRequest request) {
        return inventoryService.upsertStock(sku, warehouseCode, request);
    }

    @PostMapping("/items/{sku}/transfer")
    public InventoryTransferResponse transferStock(
            @PathVariable String sku,
            @Valid @RequestBody TransferInventoryStockRequest request) {
        return transferService.transfer(sku, request);
    }

    @DeleteMapping("/items/{sku}/stocks/{warehouseCode}")
    public ResponseEntity<Void> deleteStock(
            @PathVariable String sku,
            @PathVariable String warehouseCode) {
        inventoryService.deleteStock(sku, warehouseCode);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/items/{sku}")
    public void deleteItem(@PathVariable String sku) {
        inventoryService.deleteItem(sku);
    }
}

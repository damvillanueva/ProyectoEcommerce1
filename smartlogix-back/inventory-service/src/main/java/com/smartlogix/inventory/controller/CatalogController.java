package com.smartlogix.inventory.controller;

import com.smartlogix.inventory.dto.CatalogProductResponse;
import com.smartlogix.inventory.service.InventoryService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/catalog/products")
public class CatalogController {

    private final InventoryService inventoryService;

    public CatalogController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @GetMapping
    public List<CatalogProductResponse> listProducts() {
        return inventoryService.findCatalogProducts();
    }

    @GetMapping("/{sku}")
    public CatalogProductResponse findProduct(@PathVariable String sku) {
        return inventoryService.findCatalogProduct(sku);
    }
}

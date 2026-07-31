package com.smartlogix.inventory.controller;

import com.smartlogix.inventory.dto.SupplierProductRequest;
import com.smartlogix.inventory.dto.SupplierRequest;
import com.smartlogix.inventory.dto.SupplierResponse;
import com.smartlogix.inventory.service.SupplierService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/inventory/suppliers")
public class SupplierController {

    private final SupplierService supplierService;

    public SupplierController(SupplierService supplierService) {
        this.supplierService = supplierService;
    }

    @GetMapping
    public List<SupplierResponse> findAll() {
        return supplierService.findAll();
    }

    @GetMapping("/{id}")
    public SupplierResponse findById(@PathVariable Long id) {
        return supplierService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SupplierResponse create(@Valid @RequestBody SupplierRequest request) {
        return supplierService.create(request);
    }

    @PutMapping("/{id}")
    public SupplierResponse update(@PathVariable Long id, @Valid @RequestBody SupplierRequest request) {
        return supplierService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public SupplierResponse deactivate(@PathVariable Long id) {
        return supplierService.deactivate(id);
    }

    @PostMapping("/{id}/products")
    public SupplierResponse upsertProduct(
            @PathVariable Long id,
            @Valid @RequestBody SupplierProductRequest request
    ) {
        return supplierService.upsertProduct(id, request);
    }

    @DeleteMapping("/{id}/products/{sku}")
    public SupplierResponse removeProduct(@PathVariable Long id, @PathVariable String sku) {
        return supplierService.removeProduct(id, sku);
    }
}

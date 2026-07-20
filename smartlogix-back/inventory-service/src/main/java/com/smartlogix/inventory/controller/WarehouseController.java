package com.smartlogix.inventory.controller;

import com.smartlogix.inventory.dto.CreateWarehouseRequest;
import com.smartlogix.inventory.dto.UpdateWarehouseRequest;
import com.smartlogix.inventory.dto.WarehouseLocationSuggestionResponse;
import com.smartlogix.inventory.dto.WarehouseResponse;
import com.smartlogix.inventory.service.WarehouseLocationService;
import com.smartlogix.inventory.service.WarehouseService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/inventory/warehouses")
public class WarehouseController {

    private final WarehouseService warehouseService;
    private final WarehouseLocationService locationService;

    public WarehouseController(
            WarehouseService warehouseService,
            WarehouseLocationService locationService
    ) {
        this.warehouseService = warehouseService;
        this.locationService = locationService;
    }

    @GetMapping
    public List<WarehouseResponse> findAll() {
        return warehouseService.findAll();
    }

    @GetMapping("/{code}")
    public WarehouseResponse findByCode(@PathVariable String code) {
        return warehouseService.findByCode(code);
    }

    @GetMapping("/{code}/locations/suggestion")
    public WarehouseLocationSuggestionResponse suggestLocation(
            @PathVariable String code,
            @RequestParam(required = false) String zone
    ) {
        return locationService.suggest(code, zone);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WarehouseResponse create(@Valid @RequestBody CreateWarehouseRequest request) {
        return warehouseService.create(request);
    }

    @PutMapping("/{code}")
    public WarehouseResponse update(
            @PathVariable String code,
            @Valid @RequestBody UpdateWarehouseRequest request
    ) {
        return warehouseService.update(code, request);
    }

    @DeleteMapping("/{code}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String code) {
        warehouseService.delete(code);
    }
}

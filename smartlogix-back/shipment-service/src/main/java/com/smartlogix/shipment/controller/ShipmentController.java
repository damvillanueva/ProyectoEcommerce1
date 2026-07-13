package com.smartlogix.shipment.controller;

import com.smartlogix.shipment.domain.ShipmentStatus;
import com.smartlogix.shipment.dto.CreateShipmentRequest;
import com.smartlogix.shipment.dto.UpdateShipmentRequest;
import com.smartlogix.shipment.dto.ShipmentResponse;
import com.smartlogix.shipment.service.ShipmentService;
import jakarta.validation.Valid;
import java.util.List;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/shipments")
public class ShipmentController {

    private final ShipmentService shipmentService;

    public ShipmentController(ShipmentService shipmentService) {
        this.shipmentService = shipmentService;
    }

    @PostMapping
    public ShipmentResponse createShipment(@Valid @RequestBody CreateShipmentRequest request) {
        return shipmentService.createShipment(request);
    }

    @GetMapping
    public List<ShipmentResponse> listShipments() {
        return shipmentService.getShipments();
    }

    @GetMapping("/{trackingCode}")
    public ShipmentResponse findByTrackingCode(@PathVariable String trackingCode) {
        return shipmentService.getByTrackingCode(trackingCode);
    }

    @PatchMapping("/{trackingCode}/status")
    public ShipmentResponse updateStatus(
            @PathVariable String trackingCode,
            @RequestParam ShipmentStatus value) {
        return shipmentService.updateStatus(trackingCode, value);
    }

    @PutMapping("/{trackingCode}")
    public ShipmentResponse updateShipment(
            @PathVariable String trackingCode,
            @Valid @RequestBody UpdateShipmentRequest request) {
        return shipmentService.updateShipment(trackingCode, request);
    }

    @DeleteMapping("/{trackingNumber}")
    public void deleteShipment(@PathVariable String trackingNumber) {
        shipmentService.deleteShipment(trackingNumber);
    }
}

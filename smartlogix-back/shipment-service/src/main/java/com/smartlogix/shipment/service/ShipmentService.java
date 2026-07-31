package com.smartlogix.shipment.service;

import com.smartlogix.shipment.client.OrderFulfillmentClient;
import com.smartlogix.shipment.domain.Shipment;
import com.smartlogix.shipment.domain.ShipmentStatus;
import com.smartlogix.shipment.dto.CreateShipmentRequest;
import com.smartlogix.shipment.dto.UpdateShipmentRequest;
import com.smartlogix.shipment.dto.ShipmentResponse;
import com.smartlogix.shipment.exception.ShipmentNotFoundException;
import com.smartlogix.shipment.factory.ShipmentPlan;
import com.smartlogix.shipment.factory.ShipmentPlanFactory;
import com.smartlogix.shipment.factory.ShipmentPlanFactoryResolver;
import com.smartlogix.shipment.repository.ShipmentRepository;
import io.micrometer.core.instrument.MeterRegistry;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ShipmentService {

    private static final Logger log = LoggerFactory.getLogger(ShipmentService.class);

    private final ShipmentRepository repository;
    private final ShipmentPlanFactoryResolver planFactoryResolver;
    private final OrderFulfillmentClient orderFulfillmentClient;
    private MeterRegistry meterRegistry;

    public ShipmentService(
            ShipmentRepository repository,
            ShipmentPlanFactoryResolver planFactoryResolver,
            OrderFulfillmentClient orderFulfillmentClient
    ) {
        this.repository = repository;
        this.planFactoryResolver = planFactoryResolver;
        this.orderFulfillmentClient = orderFulfillmentClient;
    }

    @Autowired
    void setMeterRegistry(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    public ShipmentResponse createShipment(CreateShipmentRequest request) {
        String destinationAddress = request.destinationAddress().trim();
        String normalizedAddress = destinationAddress.toLowerCase(Locale.ROOT);
        ShipmentPlanFactory planFactory = planFactoryResolver.resolve(normalizedAddress);
        ShipmentPlan shipmentPlan = planFactory.createPlan(normalizedAddress);

        Shipment shipment = new Shipment();
        shipment.setOrderNumber(request.orderNumber().trim().toUpperCase());
        shipment.setDestinationAddress(destinationAddress);
        shipment.setTotalUnits(request.totalUnits());
        shipment.setCarrier(shipmentPlan.carrier());
        shipment.setRouteCode(shipmentPlan.routeCode());
        shipment.setEstimatedDeliveryDate(LocalDate.now().plusDays(shipmentPlan.estimatedDeliveryDays()));
        shipment.setStatus(ShipmentStatus.PLANNED);
        shipment.setTrackingCode("SLX-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());

        Shipment savedShipment = repository.save(shipment);
        increment("smartlogix.shipments.planned", "carrier", savedShipment.getCarrier());
        log.info(
                "shipment_created trackingCode={} orderNumber={} carrier={} route={} units={}",
                savedShipment.getTrackingCode(),
                savedShipment.getOrderNumber(),
                savedShipment.getCarrier(),
                savedShipment.getRouteCode(),
                savedShipment.getTotalUnits()
        );
        return toResponse(savedShipment);
    }

    @Transactional(readOnly = true)
    public List<ShipmentResponse> getShipments() {
        return repository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ShipmentResponse getByTrackingCode(String trackingCode) {
        Shipment shipment = repository.findByTrackingCode(trackingCode.trim().toUpperCase())
                .orElseThrow(() -> new ShipmentNotFoundException("No existe el envio " + trackingCode));
        return toResponse(shipment);
    }

    public ShipmentResponse updateStatus(String trackingCode, ShipmentStatus status) {
        Shipment shipment = repository.findByTrackingCode(trackingCode.trim().toUpperCase())
                .orElseThrow(() -> new ShipmentNotFoundException("No existe el envio " + trackingCode));
        ShipmentStatus previousStatus = shipment.getStatus();
        syncOrderFulfillment(shipment, previousStatus, status);
        shipment.setStatus(status);
        Shipment savedShipment = repository.save(shipment);
        increment("smartlogix.shipments.status_updates", "status", status.name());
        log.info(
                "shipment_status_updated trackingCode={} previousStatus={} status={}",
                savedShipment.getTrackingCode(),
                previousStatus,
                status
        );
        return toResponse(savedShipment);
    }

    private void syncOrderFulfillment(
            Shipment shipment,
            ShipmentStatus previousStatus,
            ShipmentStatus nextStatus
    ) {
        if (previousStatus == nextStatus) {
            return;
        }
        if (nextStatus == ShipmentStatus.DELIVERED) {
            orderFulfillmentClient.updateStatus(shipment.getOrderNumber(), "DELIVERED");
        } else if (nextStatus == ShipmentStatus.PICKED_UP
                || nextStatus == ShipmentStatus.IN_TRANSIT) {
            orderFulfillmentClient.updateStatus(shipment.getOrderNumber(), "SHIPPED");
        }
    }

    public ShipmentResponse updateShipment(String trackingCode, UpdateShipmentRequest request) {
        Shipment shipment = repository.findByTrackingCode(trackingCode.trim().toUpperCase())
                .orElseThrow(() -> new ShipmentNotFoundException("No existe el envio " + trackingCode));

        String destinationAddress = request.destinationAddress().trim();
        String normalizedAddress = destinationAddress.toLowerCase(Locale.ROOT);

        ShipmentPlanFactory planFactory = planFactoryResolver.resolve(normalizedAddress);
        ShipmentPlan shipmentPlan = planFactory.createPlan(normalizedAddress);

        shipment.setOrderNumber(request.orderNumber().trim().toUpperCase());
        shipment.setDestinationAddress(destinationAddress);
        shipment.setTotalUnits(request.totalUnits());
        shipment.setCarrier(shipmentPlan.carrier());
        shipment.setRouteCode(shipmentPlan.routeCode());
        shipment.setEstimatedDeliveryDate(LocalDate.now().plusDays(shipmentPlan.estimatedDeliveryDays()));
        shipment.setStatus(ShipmentStatus.valueOf(request.status()));

        Shipment savedShipment = repository.save(shipment);
        log.info(
                "shipment_updated trackingCode={} orderNumber={} carrier={} route={}",
                savedShipment.getTrackingCode(),
                savedShipment.getOrderNumber(),
                savedShipment.getCarrier(),
                savedShipment.getRouteCode()
        );
        return toResponse(savedShipment);
    }

    @Transactional
    public void deleteShipment(String trackingCode) {
        Shipment shipment = repository.findByTrackingCode(trackingCode)
                .orElseThrow(() -> new ShipmentNotFoundException("No existe el envío " + trackingCode));

        repository.delete(shipment);
        increment("smartlogix.shipments.deleted", "status", shipment.getStatus().name());
        log.info(
                "shipment_deleted trackingCode={} orderNumber={} previousStatus={}",
                shipment.getTrackingCode(),
                shipment.getOrderNumber(),
                shipment.getStatus()
        );
    }

    private ShipmentResponse toResponse(Shipment shipment) {
        return new ShipmentResponse(
                shipment.getTrackingCode(),
                shipment.getOrderNumber(),
                shipment.getDestinationAddress(),
                shipment.getCarrier(),
                shipment.getRouteCode(),
                shipment.getEstimatedDeliveryDate(),
                shipment.getStatus(),
                shipment.getCreatedAt()
        );
    }

    private void increment(String name, String tagName, String tagValue) {
        if (meterRegistry != null) {
            meterRegistry.counter(name, tagName, tagValue).increment();
        }
    }
}

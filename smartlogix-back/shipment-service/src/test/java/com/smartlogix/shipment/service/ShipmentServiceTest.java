package com.smartlogix.shipment.service;

import com.smartlogix.shipment.client.OrderFulfillmentClient;
import com.smartlogix.shipment.domain.Shipment;
import com.smartlogix.shipment.domain.ShipmentStatus;
import com.smartlogix.shipment.factory.ShipmentPlanFactoryResolver;
import com.smartlogix.shipment.repository.ShipmentRepository;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ShipmentServiceTest {

    @Mock
    private ShipmentRepository repository;

    @Mock
    private ShipmentPlanFactoryResolver planFactoryResolver;

    @Mock
    private OrderFulfillmentClient orderFulfillmentClient;

    private ShipmentService service;

    @BeforeEach
    void setUp() {
        service = new ShipmentService(repository, planFactoryResolver, orderFulfillmentClient);
    }

    @Test
    void inTransitShipmentDispatchesItsOrder() {
        Shipment shipment = shipment(ShipmentStatus.PLANNED);
        when(repository.findByTrackingCode("SLX-TEST-1")).thenReturn(Optional.of(shipment));
        when(repository.save(any(Shipment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.updateStatus("slx-test-1", ShipmentStatus.IN_TRANSIT);

        assertThat(response.status()).isEqualTo(ShipmentStatus.IN_TRANSIT);
        verify(orderFulfillmentClient).updateStatus("ORD-TEST-1", "SHIPPED");
    }

    @Test
    void deliveredShipmentMarksItsOrderAsDelivered() {
        Shipment shipment = shipment(ShipmentStatus.IN_TRANSIT);
        when(repository.findByTrackingCode("SLX-TEST-1")).thenReturn(Optional.of(shipment));
        when(repository.save(any(Shipment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.updateStatus("SLX-TEST-1", ShipmentStatus.DELIVERED);

        verify(orderFulfillmentClient).updateStatus("ORD-TEST-1", "DELIVERED");
    }

    private Shipment shipment(ShipmentStatus status) {
        Shipment shipment = new Shipment();
        shipment.setTrackingCode("SLX-TEST-1");
        shipment.setOrderNumber("ORD-TEST-1");
        shipment.setDestinationAddress("Av. Siempre Viva 123");
        shipment.setTotalUnits(1);
        shipment.setCarrier("SmartCarrier");
        shipment.setRouteCode("RUTA-1");
        shipment.setEstimatedDeliveryDate(LocalDate.now().plusDays(2));
        shipment.setStatus(status);
        return shipment;
    }
}

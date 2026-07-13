package com.smartlogix.order.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.smartlogix.order.client.InventoryAvailabilityResponse;
import com.smartlogix.order.client.InventoryClient;
import com.smartlogix.order.client.ShipmentClient;
import com.smartlogix.order.client.ShipmentRequest;
import com.smartlogix.order.client.ShipmentResponse;
import com.smartlogix.order.domain.OrderLine;
import com.smartlogix.order.domain.OrderStatus;
import com.smartlogix.order.domain.PurchaseOrder;
import com.smartlogix.order.dto.CreateOrderRequest;
import com.smartlogix.order.dto.OrderLineRequest;
import com.smartlogix.order.dto.OrderResponse;
import com.smartlogix.order.repository.DiscountRepository;
import com.smartlogix.order.repository.PurchaseOrderRepository;
import java.lang.reflect.Proxy;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestTemplate;

class OrderServiceTest {

    private FakePurchaseOrderStore store;
    private FakeInventoryClient inventoryClient;
    private FakeShipmentClient shipmentClient;
    private OrderService orderService;

    @BeforeEach
    void setUp() {
        store = new FakePurchaseOrderStore();
        inventoryClient = new FakeInventoryClient();
        shipmentClient = new FakeShipmentClient();
        orderService = new OrderService(
                store.repository(),
                inventoryClient,
                shipmentClient,
                emptyDiscountRepository()
        );
    }

    @Test
    void createOrderReservesStockAndRequestsShipment() {
        inventoryClient.setAvailable("SKU-3001", 45);

        OrderResponse response = orderService.createOrder(new CreateOrderRequest(
                "Cliente Demo",
                "cliente.demo@smartlogix.cl",
                "Providencia | Av. Demo 123",
                null,
                List.of(new OrderLineRequest("sku-3001", 1, BigDecimal.valueOf(45990)))
        ));

        assertThat(response.status()).isEqualTo(OrderStatus.SHIPMENT_REQUESTED);
        assertThat(response.trackingCode()).isEqualTo("SLX-TEST-1");
        assertThat(response.orderNumber()).startsWith("ORD-");
        assertThat(inventoryClient.available("SKU-3001")).isEqualTo(44);
        assertThat(inventoryClient.reserved("SKU-3001")).isEqualTo(1);
        assertThat(shipmentClient.createdTrackingCodes()).containsExactly("SLX-TEST-1");
    }

    @Test
    void deleteOrderReleasesReservedStockAndDeletesShipment() {
        inventoryClient.setAvailable("SKU-3001", 45);
        OrderResponse response = orderService.createOrder(new CreateOrderRequest(
                "Cliente Demo",
                "cliente.demo@smartlogix.cl",
                "Providencia | Av. Demo 123",
                null,
                List.of(new OrderLineRequest("SKU-3001", 1, BigDecimal.valueOf(45990)))
        ));

        orderService.deleteOrder(response.orderNumber());

        assertThat(inventoryClient.available("SKU-3001")).isEqualTo(45);
        assertThat(inventoryClient.reserved("SKU-3001")).isZero();
        assertThat(shipmentClient.deletedTrackingCodes()).containsExactly("SLX-TEST-1");
        assertThat(store.find(response.orderNumber())).isEmpty();
    }

    private DiscountRepository emptyDiscountRepository() {
        return (DiscountRepository) Proxy.newProxyInstance(
                DiscountRepository.class.getClassLoader(),
                new Class<?>[] { DiscountRepository.class },
                (proxy, method, args) -> {
                    if ("findByCodeIgnoreCase".equals(method.getName())) {
                        return Optional.empty();
                    }
                    throw new UnsupportedOperationException("Metodo no usado en este test: " + method.getName());
                }
        );
    }

    private static class FakePurchaseOrderStore {
        private final Map<String, PurchaseOrder> orders = new HashMap<>();

        PurchaseOrderRepository repository() {
            return (PurchaseOrderRepository) Proxy.newProxyInstance(
                    PurchaseOrderRepository.class.getClassLoader(),
                    new Class<?>[] { PurchaseOrderRepository.class },
                    (proxy, method, args) -> switch (method.getName()) {
                        case "save" -> save((PurchaseOrder) args[0]);
                        case "findByOrderNumber" -> find((String) args[0]);
                        case "findAll" -> List.copyOf(orders.values());
                        case "delete" -> {
                            delete((PurchaseOrder) args[0]);
                            yield null;
                        }
                        default -> throw new UnsupportedOperationException(
                                "Metodo no usado en este test: " + method.getName());
                    }
            );
        }

        Optional<PurchaseOrder> find(String orderNumber) {
            return Optional.ofNullable(orders.get(orderNumber));
        }

        private PurchaseOrder save(PurchaseOrder order) {
            order.beforeInsert();
            orders.put(order.getOrderNumber(), order);
            return order;
        }

        private void delete(PurchaseOrder order) {
            orders.remove(order.getOrderNumber());
        }
    }

    private static class FakeInventoryClient extends InventoryClient {
        private final Map<String, Integer> availableBySku = new HashMap<>();
        private final Map<String, Integer> reservedBySku = new HashMap<>();

        FakeInventoryClient() {
            super(new RestTemplate());
        }

        void setAvailable(String sku, int available) {
            availableBySku.put(sku, available);
            reservedBySku.putIfAbsent(sku, 0);
        }

        int available(String sku) {
            return availableBySku.getOrDefault(sku, 0);
        }

        int reserved(String sku) {
            return reservedBySku.getOrDefault(sku, 0);
        }

        @Override
        public InventoryAvailabilityResponse checkAvailability(String sku, int quantity) {
            return new InventoryAvailabilityResponse(sku, quantity, available(sku), available(sku) >= quantity);
        }

        @Override
        public void reserve(String sku, int quantity) {
            availableBySku.put(sku, available(sku) - quantity);
            reservedBySku.put(sku, reserved(sku) + quantity);
        }

        @Override
        public void release(String sku, int quantity) {
            reservedBySku.put(sku, reserved(sku) - quantity);
            availableBySku.put(sku, available(sku) + quantity);
        }
    }

    private static class FakeShipmentClient extends ShipmentClient {
        private final List<String> createdTrackingCodes = new java.util.ArrayList<>();
        private final List<String> deletedTrackingCodes = new java.util.ArrayList<>();

        FakeShipmentClient() {
            super(new RestTemplate(), null, "01234567890123456789012345678901");
        }

        List<String> createdTrackingCodes() {
            return createdTrackingCodes;
        }

        List<String> deletedTrackingCodes() {
            return deletedTrackingCodes;
        }

        @Override
        public ShipmentResponse requestShipment(ShipmentRequest request) {
            String trackingCode = "SLX-TEST-" + (createdTrackingCodes.size() + 1);
            createdTrackingCodes.add(trackingCode);
            return new ShipmentResponse(
                    trackingCode,
                    request.orderNumber(),
                    "Chilexpress",
                    "RUTA-1",
                    LocalDate.now().plusDays(2),
                    "PLANNED"
            );
        }

        @Override
        public boolean deleteShipment(String trackingCode) {
            deletedTrackingCodes.add(trackingCode);
            return true;
        }
    }
}

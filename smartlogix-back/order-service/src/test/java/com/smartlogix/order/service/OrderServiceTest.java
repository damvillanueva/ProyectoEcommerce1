package com.smartlogix.order.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.smartlogix.order.client.InventoryAvailabilityResponse;
import com.smartlogix.order.client.InventoryClient;
import com.smartlogix.order.client.CatalogProductResponse;
import com.smartlogix.order.client.ShipmentClient;
import com.smartlogix.order.client.ShipmentRequest;
import com.smartlogix.order.client.ShipmentResponse;
import com.smartlogix.order.domain.OrderLine;
import com.smartlogix.order.domain.OrderChannel;
import com.smartlogix.order.domain.OrderStatus;
import com.smartlogix.order.domain.PurchaseOrder;
import com.smartlogix.order.domain.FulfillmentMethod;
import com.smartlogix.order.domain.PaymentMethod;
import com.smartlogix.order.domain.PaymentStatus;
import com.smartlogix.order.domain.ShippingMethod;
import com.smartlogix.order.discount.Discount;
import com.smartlogix.order.dto.CreateOrderRequest;
import com.smartlogix.order.dto.OrderLineRequest;
import com.smartlogix.order.dto.OrderResponse;
import com.smartlogix.order.dto.OrderTrackingResponse;
import com.smartlogix.order.repository.DiscountRepository;
import com.smartlogix.order.repository.PurchaseOrderRepository;
import com.smartlogix.order.security.InternalServiceTokenProvider;
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
        inventoryClient.setProduct("SKU-3001", 45, BigDecimal.valueOf(45990));

        OrderResponse response = orderService.createOrder(new CreateOrderRequest(
                "Cliente Demo",
                "cliente.demo@smartlogix.cl",
                "Providencia | Av. Demo 123",
                null,
                List.of(new OrderLineRequest("sku-3001", 1))
        ));

        assertThat(response.status()).isEqualTo(OrderStatus.SHIPMENT_REQUESTED);
        assertThat(response.trackingCode()).isEqualTo("SLX-TEST-1");
        assertThat(response.shippingAmount()).isEqualByComparingTo("4990");
        assertThat(response.paymentStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(response.orderNumber()).startsWith("ORD-");
        assertThat(inventoryClient.available("SKU-3001")).isEqualTo(44);
        assertThat(inventoryClient.reserved("SKU-3001")).isEqualTo(1);
        assertThat(shipmentClient.createdTrackingCodes()).containsExactly("SLX-TEST-1");
    }

    @Test
    void deleteOrderReleasesReservedStockAndDeletesShipment() {
        inventoryClient.setProduct("SKU-3001", 45, BigDecimal.valueOf(45990));
        OrderResponse response = orderService.createOrder(new CreateOrderRequest(
                "Cliente Demo",
                "cliente.demo@smartlogix.cl",
                "Providencia | Av. Demo 123",
                null,
                List.of(new OrderLineRequest("SKU-3001", 1))
        ));

        orderService.deleteOrder(response.orderNumber());

        assertThat(inventoryClient.available("SKU-3001")).isEqualTo(45);
        assertThat(inventoryClient.reserved("SKU-3001")).isZero();
        assertThat(shipmentClient.deletedTrackingCodes()).containsExactly("SLX-TEST-1");
        assertThat(store.find(response.orderNumber())).isEmpty();
    }

    @Test
    void createOrderAppliesDiscountCodeToTotals() {
        inventoryClient.setProduct("SKU-1001", 20, BigDecimal.valueOf(10000));
        orderService = new OrderService(
                store.repository(),
                inventoryClient,
                shipmentClient,
                discountRepository(activeDiscount("TEST10", 10))
        );

        OrderResponse response = orderService.createOrder(new CreateOrderRequest(
                "Cliente Descuento",
                "descuento@smartlogix.cl",
                "Providencia | Av. Demo 123",
                "test10",
                List.of(new OrderLineRequest("SKU-1001", 1))
        ));

        assertThat(response.status()).isEqualTo(OrderStatus.SHIPMENT_REQUESTED);
        assertThat(response.discountCode()).isEqualTo("TEST10");
        assertThat(response.subtotalAmount()).isEqualByComparingTo("10000");
        assertThat(response.discountAmount()).isEqualByComparingTo("1000");
        assertThat(response.shippingAmount()).isEqualByComparingTo("4990");
        assertThat(response.totalAmount()).isEqualByComparingTo("13990");
    }

    @Test
    void createOrderRejectsExpiredDiscount() {
        inventoryClient.setProduct("SKU-1001", 20, BigDecimal.valueOf(10000));
        Discount expiredDiscount = activeDiscount("VENCIDO", 10);
        expiredDiscount.setValidUntil(LocalDate.now().minusDays(1));
        orderService = new OrderService(
                store.repository(),
                inventoryClient,
                shipmentClient,
                discountRepository(expiredDiscount)
        );

        assertThatThrownBy(() -> orderService.createOrder(new CreateOrderRequest(
                "Cliente Descuento",
                "descuento@smartlogix.cl",
                "Providencia | Av. Demo 123",
                "VENCIDO",
                List.of(new OrderLineRequest("SKU-1001", 1))
        )))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("vencido");
    }

    @Test
    void pickupOrderDoesNotRequestShipmentAndCanRemainPendingPayment() {
        inventoryClient.setProduct("SKU-2001", 12, BigDecimal.valueOf(25000));

        OrderResponse response = orderService.createOrder(new CreateOrderRequest(
                "Cliente Retiro",
                "retiro@smartlogix.cl",
                null,
                null,
                FulfillmentMethod.PICKUP,
                "Sucursal Santiago Centro",
                PaymentMethod.PAY_ON_PICKUP,
                List.of(new OrderLineRequest("SKU-2001", 2))
        ));

        assertThat(response.status()).isEqualTo(OrderStatus.APPROVED);
        assertThat(response.fulfillmentMethod()).isEqualTo(FulfillmentMethod.PICKUP);
        assertThat(response.pickupLocation()).isEqualTo("Sucursal Santiago Centro");
        assertThat(response.shippingAmount()).isZero();
        assertThat(response.paymentStatus()).isEqualTo(PaymentStatus.PENDING);
        assertThat(response.trackingCode()).isNull();
        assertThat(shipmentClient.createdTrackingCodes()).isEmpty();
    }

    @Test
    void expressDeliveryUsesBackendRateAndPersistsCheckoutDetails() {
        inventoryClient.setProduct("SKU-4001", 8, BigDecimal.valueOf(30000));

        OrderResponse response = orderService.createOrder(new CreateOrderRequest(
                "Damian Villanueva",
                "damian@smartlogix.cl",
                "+56 9 1234 5678",
                "18.406.158-9",
                true,
                "Argentina 8577, La Florida, Region Metropolitana",
                "Argentina 8577, La Florida, Region Metropolitana",
                "Departamento 609",
                null,
                FulfillmentMethod.DELIVERY,
                null,
                ShippingMethod.EXPRESS,
                PaymentMethod.WEBPAY_SIMULATED,
                List.of(new OrderLineRequest("SKU-4001", 1))
        ));

        assertThat(response.shippingMethod()).isEqualTo(ShippingMethod.EXPRESS);
        assertThat(response.shippingAmount()).isEqualByComparingTo("8990");
        assertThat(response.customerPhone()).isEqualTo("+56 9 1234 5678");
        assertThat(response.customerDocument()).isEqualTo("18.406.158-9");
        assertThat(response.marketingOptIn()).isTrue();
        assertThat(response.billingAddress()).contains("La Florida");
        assertThat(response.deliveryInstructions()).isEqualTo("Departamento 609");
    }

    @Test
    void customerOnlyReceivesOrdersOwnedByAuthenticatedUsername() {
        inventoryClient.setProduct("SKU-1001", 20, BigDecimal.valueOf(10000));

        OrderResponse damianOrder = orderService.createOrder(
                new CreateOrderRequest(
                        "Damian",
                        "correo-manipulado@ejemplo.cl",
                        "Santiago | Direccion 1",
                        null,
                        List.of(new OrderLineRequest("SKU-1001", 1))
                ),
                "damian",
                "damian@smartlogix.cl",
                OrderChannel.ONLINE
        );
        orderService.createOrder(
                new CreateOrderRequest(
                        "Otro cliente",
                        "otro@smartlogix.cl",
                        "Santiago | Direccion 2",
                        null,
                        List.of(new OrderLineRequest("SKU-1001", 1))
                ),
                "otro",
                "otro@smartlogix.cl",
                OrderChannel.ONLINE
        );

        List<OrderResponse> customerOrders = orderService.getCustomerOrders("damian");

        assertThat(customerOrders).extracting(OrderResponse::orderNumber)
                .containsExactly(damianOrder.orderNumber());
        assertThat(customerOrders.get(0).customerEmail()).isEqualTo("damian@smartlogix.cl");
        assertThat(customerOrders.get(0).salesChannel()).isEqualTo(OrderChannel.ONLINE);
    }

    @Test
    void customerTrackingUsesOwnedOrderAndRealShipmentStatus() {
        inventoryClient.setProduct("SKU-1001", 20, BigDecimal.valueOf(10000));
        OrderResponse order = orderService.createOrder(
                new CreateOrderRequest(
                        "Damian",
                        "damian@smartlogix.cl",
                        "Santiago | Direccion 1",
                        null,
                        List.of(new OrderLineRequest("SKU-1001", 1))
                ),
                "damian",
                "damian@smartlogix.cl",
                OrderChannel.ONLINE
        );

        OrderTrackingResponse tracking = orderService.getCustomerOrderTracking(
                "damian",
                order.orderNumber()
        );

        assertThat(tracking.trackingCode()).isEqualTo("SLX-TEST-1");
        assertThat(tracking.shipmentStatus()).isEqualTo("PLANNED");
        assertThat(tracking.carrier()).isEqualTo("Chilexpress");
        assertThatThrownBy(() -> orderService.getCustomerOrderTracking("otro", order.orderNumber()))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("No existe");
    }

    private DiscountRepository emptyDiscountRepository() {
        return discountRepository();
    }

    private DiscountRepository discountRepository(Discount... discounts) {
        Map<String, Discount> discountsByCode = new HashMap<>();
        for (Discount discount : discounts) {
            discountsByCode.put(discount.getCode().toUpperCase(), discount);
        }

        return (DiscountRepository) Proxy.newProxyInstance(
                DiscountRepository.class.getClassLoader(),
                new Class<?>[] { DiscountRepository.class },
                (proxy, method, args) -> {
                    if ("findByCodeIgnoreCase".equals(method.getName())) {
                        return Optional.ofNullable(discountsByCode.get(String.valueOf(args[0]).toUpperCase()));
                    }
                    throw new UnsupportedOperationException("Metodo no usado en este test: " + method.getName());
                }
        );
    }

    private Discount activeDiscount(String code, int percentage) {
        Discount discount = new Discount();
        discount.setCode(code);
        discount.setName("Descuento " + code);
        discount.setPercentage(percentage);
        discount.setActive(true);
        discount.setOnlyNewUsers(false);
        return discount;
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
                        case "findAllByCustomerUsernameOrderByCreatedAtDesc" -> orders.values().stream()
                                .filter(order -> args[0].equals(order.getCustomerUsername()))
                                .toList();
                        case "findByOrderNumberAndCustomerUsername" -> find((String) args[0])
                                .filter(order -> args[1].equals(order.getCustomerUsername()));
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
        private final Map<String, BigDecimal> priceBySku = new HashMap<>();

        FakeInventoryClient() {
            super(
                    new RestTemplate(),
                    new InternalServiceTokenProvider(
                            "SmartLogixSuperSecretKeyForJWT2024PlatformMicroservicesArchitecture!!"
                    )
            );
        }

        void setProduct(String sku, int available, BigDecimal price) {
            availableBySku.put(sku, available);
            reservedBySku.putIfAbsent(sku, 0);
            priceBySku.put(sku, price);
        }

        int available(String sku) {
            return availableBySku.getOrDefault(sku, 0);
        }

        int reserved(String sku) {
            return reservedBySku.getOrDefault(sku, 0);
        }

        @Override
        public CatalogProductResponse findProduct(String sku) {
            return new CatalogProductResponse(
                    sku,
                    "Producto " + sku,
                    null,
                    "General",
                    priceBySku.get(sku),
                    available(sku),
                    available(sku) > 0,
                    false
            );
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
        public ShipmentResponse getShipment(String trackingCode) {
            if (!createdTrackingCodes.contains(trackingCode)) {
                return null;
            }
            return new ShipmentResponse(
                    trackingCode,
                    "ORD-TEST",
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

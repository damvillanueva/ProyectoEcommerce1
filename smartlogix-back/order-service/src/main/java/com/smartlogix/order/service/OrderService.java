package com.smartlogix.order.service;

import com.smartlogix.order.client.CatalogProductResponse;
import com.smartlogix.order.client.InventoryClient;
import com.smartlogix.order.client.InventoryClientException;
import com.smartlogix.order.client.InventoryBatchLineRequest;
import com.smartlogix.order.client.ShipmentClient;
import com.smartlogix.order.client.ShipmentRequest;
import com.smartlogix.order.client.ShipmentResponse;
import com.smartlogix.order.domain.OrderLine;
import com.smartlogix.order.domain.OrderChannel;
import com.smartlogix.order.domain.OrderStatus;
import com.smartlogix.order.domain.NotificationType;
import com.smartlogix.order.domain.FulfillmentMethod;
import com.smartlogix.order.domain.PaymentMethod;
import com.smartlogix.order.domain.PaymentStatus;
import com.smartlogix.order.domain.ShippingMethod;
import com.smartlogix.order.domain.PurchaseOrder;
import com.smartlogix.order.dto.CreateOrderRequest;
import com.smartlogix.order.dto.UpdateOrderRequest;
import com.smartlogix.order.dto.OrderLineRequest;
import com.smartlogix.order.dto.OrderLineResponse;
import com.smartlogix.order.dto.OrderResponse;
import com.smartlogix.order.dto.OrderTrackingResponse;
import com.smartlogix.order.dto.ShippingQuoteRequest;
import com.smartlogix.order.dto.ShippingQuoteResponse;
import com.smartlogix.order.exception.OrderNotFoundException;
import com.smartlogix.order.exception.OrderProcessingException;
import com.smartlogix.order.repository.PurchaseOrderRepository;
import com.smartlogix.order.discount.Discount;
import com.smartlogix.order.repository.DiscountRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    private final PurchaseOrderRepository repository;
    private final InventoryClient inventoryClient;
    private final ShipmentClient shipmentClient;
    private final DiscountRepository discountRepository;
    private final ShippingRateService shippingRateService;
    private final PaymentSimulationService paymentSimulationService;
    private final MeterRegistry meterRegistry;
    private final CustomerNotificationPort notificationPort;

    public OrderService(
            PurchaseOrderRepository repository,
            InventoryClient inventoryClient,
            ShipmentClient shipmentClient,
            DiscountRepository discountRepository,
            ShippingRateService shippingRateService,
            PaymentSimulationService paymentSimulationService
    ) {
        this(
                repository,
                inventoryClient,
                shipmentClient,
                discountRepository,
                shippingRateService,
                paymentSimulationService,
                new SimpleMeterRegistry(),
                CustomerNotificationPort.noop()
        );
    }

    public OrderService(
            PurchaseOrderRepository repository,
            InventoryClient inventoryClient,
            ShipmentClient shipmentClient,
            DiscountRepository discountRepository,
            ShippingRateService shippingRateService,
            PaymentSimulationService paymentSimulationService,
            MeterRegistry meterRegistry
    ) {
        this(
                repository,
                inventoryClient,
                shipmentClient,
                discountRepository,
                shippingRateService,
                paymentSimulationService,
                meterRegistry,
                CustomerNotificationPort.noop()
        );
    }

    @Autowired
    public OrderService(
            PurchaseOrderRepository repository,
            InventoryClient inventoryClient,
            ShipmentClient shipmentClient,
            DiscountRepository discountRepository,
            ShippingRateService shippingRateService,
            PaymentSimulationService paymentSimulationService,
            MeterRegistry meterRegistry,
            CustomerNotificationPort notificationPort
    ) {
        this.repository = repository;
        this.inventoryClient = inventoryClient;
        this.shipmentClient = shipmentClient;
        this.discountRepository = discountRepository;
        this.shippingRateService = shippingRateService;
        this.paymentSimulationService = paymentSimulationService;
        this.meterRegistry = meterRegistry;
        this.notificationPort = notificationPort;
    }

    public OrderResponse createOrder(CreateOrderRequest request) {
        return createOrder(request, null, null, OrderChannel.ONLINE);
    }

    public OrderResponse createOrder(
            CreateOrderRequest request,
            String customerUsername,
            String authenticatedEmail,
            OrderChannel salesChannel
    ) {
        List<PricedLine> pricedLines = priceLines(request.lines());
        PurchaseOrder order = buildOrder(
                request,
                pricedLines,
                customerUsername,
                authenticatedEmail,
                salesChannel
        );
        repository.save(order);
        increment("smartlogix.orders.submitted", "channel", order.getSalesChannel().name());
        log.info(
                "order_created orderNumber={} channel={} fulfillment={} lines={} total={}",
                order.getOrderNumber(),
                order.getSalesChannel(),
                order.getFulfillmentMethod(),
                order.getLines().size(),
                order.getTotalAmount()
        );

        for (PricedLine line : pricedLines) {
            if (line.availableQuantity() < line.quantity()) {
                order.setStatus(OrderStatus.REJECTED);
                order.setRejectionReason("Stock insuficiente para SKU " + line.sku());
                repository.save(order);
                recordRejection(order, "insufficient_stock");
                return toResponse(order);
            }
        }

        List<OrderLine> reservedLines = new ArrayList<>();
        for (OrderLine line : order.getLines()) {
            try {
                inventoryClient.reserve(line.getSku(), line.getQuantity());
                reservedLines.add(line);
            } catch (InventoryClientException ex) {
                releaseReservedLines(reservedLines);
                order.setStatus(OrderStatus.REJECTED);
                order.setRejectionReason("No fue posible reservar inventario. " + ex.getMessage());
                repository.save(order);
                recordRejection(order, "inventory_reservation");
                return toResponse(order);
            }
        }

        PaymentResult paymentResult = paymentSimulationService.process(
                order.getPaymentMethod(),
                request.paymentSimulationScenario(),
                order.getTotalAmount()
        );
        applyPaymentResult(order, paymentResult);
        increment("smartlogix.payments.processed", "status", paymentResult.status().name());
        log.info(
                "payment_processed orderNumber={} method={} status={} total={}",
                order.getOrderNumber(),
                order.getPaymentMethod(),
                paymentResult.status(),
                order.getTotalAmount()
        );

        if (paymentResult.status() == PaymentStatus.REJECTED) {
            releaseReservedLines(reservedLines);
            order.setStatus(OrderStatus.REJECTED);
            order.setRejectionReason(paymentResult.failureReason());
            repository.save(order);
            recordRejection(order, "payment");
            notificationPort.queue(order, NotificationType.PAYMENT_REJECTED);
            return toResponse(order);
        }

        order.setStatus(OrderStatus.APPROVED);

        if (order.getFulfillmentMethod() == FulfillmentMethod.PICKUP) {
            repository.save(order);
            queuePurchaseNotifications(order);
            increment("smartlogix.orders.approved", "fulfillment", "pickup");
            log.info("order_approved orderNumber={} fulfillment=pickup", order.getOrderNumber());
            return toResponse(order);
        }

        ShipmentResponse shipmentResponse = shipmentClient.requestShipment(
                new ShipmentRequest(order.getOrderNumber(), order.getShippingAddress(), totalUnits(order))
        );

        if (shipmentResponse == null || shipmentResponse.trackingCode() == null) {
            order.setStatus(OrderStatus.FAILED);
            order.setRejectionReason("Servicio de envios no disponible. Asignacion manual requerida.");
            repository.save(order);
            queuePurchaseNotifications(order);
            increment("smartlogix.orders.failed", "reason", "shipment_unavailable");
            log.error("order_shipment_failed orderNumber={} reason=shipment_unavailable", order.getOrderNumber());
            return toResponse(order);
        }

        order.setStatus(OrderStatus.SHIPMENT_REQUESTED);
        order.setTrackingCode(shipmentResponse.trackingCode());
        repository.save(order);
        queuePurchaseNotifications(order);
        increment("smartlogix.orders.approved", "fulfillment", "delivery");
        increment("smartlogix.shipments.requested", "result", "success");
        log.info(
                "order_approved orderNumber={} fulfillment=delivery trackingCode={}",
                order.getOrderNumber(),
                order.getTrackingCode()
        );

        return toResponse(order);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getOrders() {
        return repository.findAll().stream()
                .filter(order -> order.getCashRegisterSession() == null)
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrderByNumber(String orderNumber) {
        PurchaseOrder order = repository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new OrderNotFoundException("No existe la orden " + orderNumber));
        return toResponse(order);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getCustomerOrders(String customerUsername) {
        return repository.findAllByCustomerUsernameOrderByCreatedAtDesc(customerUsername).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public OrderResponse getCustomerOrder(String customerUsername, String orderNumber) {
        PurchaseOrder order = repository
                .findByOrderNumberAndCustomerUsername(orderNumber, customerUsername)
                .orElseThrow(() -> new OrderNotFoundException("No existe la orden solicitada."));
        return toResponse(order);
    }

    public OrderResponse cancelCustomerOrder(
            String customerUsername,
            String orderNumber,
            String reason
    ) {
        PurchaseOrder order = repository
                .findByOrderNumberAndCustomerUsername(orderNumber, customerUsername)
                .orElseThrow(() -> new OrderNotFoundException("No existe la orden solicitada."));
        return cancelOrder(order, customerUsername, reason);
    }

    public OrderResponse cancelOrder(String orderNumber, String cancelledBy, String reason) {
        PurchaseOrder order = repository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new OrderNotFoundException("No existe la orden " + orderNumber));
        return cancelOrder(order, cancelledBy, reason);
    }

    @Transactional(readOnly = true)
    public OrderTrackingResponse getCustomerOrderTracking(String customerUsername, String orderNumber) {
        PurchaseOrder order = repository
                .findByOrderNumberAndCustomerUsername(orderNumber, customerUsername)
                .orElseThrow(() -> new OrderNotFoundException("No existe la orden solicitada."));
        ShipmentResponse shipment = order.getTrackingCode() == null
                ? null
                : shipmentClient.getShipment(order.getTrackingCode());

        return new OrderTrackingResponse(
                order.getOrderNumber(),
                order.getFulfillmentMethod(),
                order.getStatus(),
                order.getPaymentStatus(),
                order.getTrackingCode(),
                shipment == null ? null : shipment.status(),
                shipment == null ? null : shipment.carrier(),
                shipment == null ? null : shipment.routeCode(),
                shipment == null ? null : shipment.estimatedDeliveryDate(),
                order.getPickupLocation()
        );
    }

    public OrderResponse updateFulfillmentStatus(String orderNumber, OrderStatus fulfillmentStatus) {
        if (fulfillmentStatus != OrderStatus.SHIPPED && fulfillmentStatus != OrderStatus.DELIVERED) {
            throw new IllegalArgumentException("El estado de cumplimiento no es valido.");
        }

        PurchaseOrder order = repository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new OrderNotFoundException("No existe la orden " + orderNumber));
        if (order.getFulfillmentMethod() != FulfillmentMethod.DELIVERY) {
            throw new IllegalArgumentException("Solo los pedidos con despacho usan este flujo.");
        }
        if (order.getStatus() == OrderStatus.DELIVERED
                || order.getStatus() == fulfillmentStatus) {
            return toResponse(order);
        }
        if (order.getStatus() != OrderStatus.SHIPMENT_REQUESTED
                && order.getStatus() != OrderStatus.SHIPPED) {
            throw new IllegalArgumentException("El pedido no esta listo para actualizar su cumplimiento.");
        }

        if (order.getStatus() == OrderStatus.SHIPMENT_REQUESTED) {
            inventoryClient.dispatchBatch(order.getLines().stream()
                    .map(line -> new InventoryBatchLineRequest(line.getSku(), line.getQuantity()))
                    .toList());
        }
        order.setStatus(fulfillmentStatus);
        PurchaseOrder savedOrder = repository.save(order);
        notificationPort.queue(savedOrder, NotificationType.SHIPMENT_UPDATED);
        return toResponse(savedOrder);
    }

    @Transactional(readOnly = true)
    public ShippingQuoteResponse quoteShipping(ShippingQuoteRequest request) {
        BigDecimal subtotal = calculateTotal(priceLines(request.lines()));
        return shippingRateService.quote(request.region(), request.commune(), subtotal);
    }

    private PurchaseOrder buildOrder(
            CreateOrderRequest request,
            List<PricedLine> pricedLines,
            String customerUsername,
            String authenticatedEmail,
            OrderChannel salesChannel
    ) {
        PurchaseOrder order = new PurchaseOrder();
        order.setCustomerName(request.customerName().trim());
        String customerEmail = authenticatedEmail == null || authenticatedEmail.isBlank()
                ? request.customerEmail()
                : authenticatedEmail;
        order.setCustomerEmail(customerEmail.trim().toLowerCase());
        order.setCustomerPhone(cleanOptional(request.customerPhone()));
        order.setCustomerDocument(cleanOptional(request.customerDocument()));
        order.setMarketingOptIn(request.marketingOptIn());
        order.setCustomerUsername(customerUsername);
        order.setSalesChannel(salesChannel == null ? OrderChannel.ONLINE : salesChannel);
        FulfillmentMethod fulfillmentMethod = request.fulfillmentMethod() == null
                ? FulfillmentMethod.DELIVERY
                : request.fulfillmentMethod();
        PaymentMethod paymentMethod = request.paymentMethod() == null
                ? PaymentMethod.WEBPAY_SIMULATED
                : request.paymentMethod();
        ShippingMethod shippingMethod = fulfillmentMethod == FulfillmentMethod.DELIVERY
                ? (request.shippingMethod() == null ? ShippingMethod.STANDARD : request.shippingMethod())
                : null;
        String shippingRegion = fulfillmentMethod == FulfillmentMethod.DELIVERY
                ? cleanOptional(request.shippingRegion())
                : null;
        String shippingCommune = fulfillmentMethod == FulfillmentMethod.DELIVERY
                ? cleanOptional(request.shippingCommune())
                : null;
        validateCheckoutDetails(
                fulfillmentMethod,
                request.shippingAddress(),
                shippingRegion,
                shippingCommune,
                request.pickupLocation(),
                paymentMethod
        );
        order.setFulfillmentMethod(fulfillmentMethod);
        order.setShippingAddress(fulfillmentMethod == FulfillmentMethod.DELIVERY
                ? request.shippingAddress().trim()
                : null);
        order.setShippingRegion(shippingRegion);
        order.setShippingCommune(shippingCommune);
        order.setBillingAddress(cleanOptional(request.billingAddress()));
        order.setDeliveryInstructions(cleanOptional(request.deliveryInstructions()));
        order.setPickupLocation(fulfillmentMethod == FulfillmentMethod.PICKUP
                ? request.pickupLocation().trim()
                : null);
        order.setShippingMethod(shippingMethod);
        order.setPaymentMethod(paymentMethod);
        order.setPaymentStatus(PaymentStatus.PENDING);
        order.setStatus(OrderStatus.PENDING);
        BigDecimal subtotal = calculateTotal(pricedLines);
        BigDecimal discountAmount = calculateDiscount(request.discountCode(), subtotal);
        BigDecimal shippingAmount = calculateShipping(
                fulfillmentMethod,
                shippingMethod,
                shippingRegion,
                shippingCommune,
                subtotal
        );
        BigDecimal total = subtotal.subtract(discountAmount).add(shippingAmount);

        order.setSubtotalAmount(subtotal);
        order.setDiscountAmount(discountAmount);
        order.setShippingAmount(shippingAmount);
        order.setTotalAmount(total);
        order.setDiscountCode(
                request.discountCode() == null || request.discountCode().isBlank()
                        ? null
                        : request.discountCode().trim().toUpperCase()
        );

        for (PricedLine pricedLine : pricedLines) {
            OrderLine line = new OrderLine();
            line.setSku(pricedLine.sku());
            line.setQuantity(pricedLine.quantity());
            line.setUnitPrice(pricedLine.unitPrice());
            order.addLine(line);
        }

        return order;
    }

    private void validateCheckoutDetails(
            FulfillmentMethod fulfillmentMethod,
            String shippingAddress,
            String shippingRegion,
            String shippingCommune,
            String pickupLocation,
            PaymentMethod paymentMethod
    ) {
        if (fulfillmentMethod == FulfillmentMethod.DELIVERY
                && (shippingAddress == null || shippingAddress.isBlank())) {
            throw new IllegalArgumentException("La direccion de despacho es obligatoria.");
        }
        if (fulfillmentMethod == FulfillmentMethod.DELIVERY
                && (shippingRegion == null || shippingRegion.isBlank())) {
            throw new IllegalArgumentException("La region de despacho es obligatoria.");
        }
        if (fulfillmentMethod == FulfillmentMethod.DELIVERY
                && (shippingCommune == null || shippingCommune.isBlank())) {
            throw new IllegalArgumentException("La comuna de despacho es obligatoria.");
        }
        if (fulfillmentMethod == FulfillmentMethod.PICKUP
                && (pickupLocation == null || pickupLocation.isBlank())) {
            throw new IllegalArgumentException("Debes seleccionar una sucursal de retiro.");
        }
        if (paymentMethod == PaymentMethod.PAY_ON_PICKUP
                && fulfillmentMethod != FulfillmentMethod.PICKUP) {
            throw new IllegalArgumentException("El pago al retirar solo esta disponible para retiro en tienda.");
        }
    }

    private BigDecimal calculateShipping(
            FulfillmentMethod fulfillmentMethod,
            ShippingMethod shippingMethod,
            String shippingRegion,
            String shippingCommune,
            BigDecimal subtotal
    ) {
        if (fulfillmentMethod == FulfillmentMethod.PICKUP) {
            return BigDecimal.ZERO;
        }
        return shippingRateService.amountFor(
                shippingMethod,
                shippingRegion,
                shippingCommune,
                subtotal
        );
    }

    private String cleanOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private void applyPaymentResult(PurchaseOrder order, PaymentResult result) {
        order.setPaymentStatus(result.status());
        order.setTransactionReference(result.transactionReference());
        order.setPaymentAuthorizationCode(result.authorizationCode());
        order.setPaymentProcessedAt(result.processedAt());
        order.setPaymentFailureReason(result.failureReason());
    }

    private void queuePurchaseNotifications(PurchaseOrder order) {
        notificationPort.queue(order, NotificationType.ORDER_CONFIRMED);
        if (order.getPaymentStatus() == PaymentStatus.PAID) {
            notificationPort.queue(order, NotificationType.PAYMENT_CONFIRMED);
        }
    }

    private BigDecimal calculateTotal(List<PricedLine> lines) {
        return lines.stream()
                .map(line -> line.unitPrice().multiply(BigDecimal.valueOf(line.quantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private List<PricedLine> priceLines(List<OrderLineRequest> requestedLines) {
        return requestedLines.stream()
                .map(requestedLine -> {
                    String sku = requestedLine.sku().trim().toUpperCase();
                    CatalogProductResponse product = inventoryClient.findProduct(sku);

                    if (product == null || product.salePrice() == null
                            || product.salePrice().compareTo(BigDecimal.ZERO) <= 0) {
                        throw new OrderProcessingException("El producto " + sku + " no tiene precio de venta valido.");
                    }

                    return new PricedLine(
                            sku,
                            requestedLine.quantity(),
                            product.salePrice(),
                            product.availableQuantity()
                    );
                })
                .toList();
    }

    private BigDecimal calculateDiscount(String discountCode, BigDecimal subtotal) {
        if (discountCode == null || discountCode.isBlank()) {
            return BigDecimal.ZERO;
        }

        Discount discount = discountRepository.findByCodeIgnoreCase(discountCode.trim())
                .orElseThrow(() -> new IllegalArgumentException("El código de descuento no existe."));

        if (!Boolean.TRUE.equals(discount.getActive())) {
            throw new IllegalArgumentException("El código de descuento no está activo.");
        }

        LocalDate today = LocalDate.now();
        if (discount.getValidFrom() != null && today.isBefore(discount.getValidFrom())) {
            throw new IllegalArgumentException("El codigo de descuento aun no esta vigente.");
        }
        if (discount.getValidUntil() != null && today.isAfter(discount.getValidUntil())) {
            throw new IllegalArgumentException("El codigo de descuento esta vencido.");
        }

        BigDecimal percentage = BigDecimal.valueOf(discount.getPercentage());

        return subtotal
                .multiply(percentage)
                .divide(BigDecimal.valueOf(100));
    }

    private int totalUnits(PurchaseOrder order) {
        return order.getLines().stream().mapToInt(OrderLine::getQuantity).sum();
    }

    private void releaseReservedLines(List<OrderLine> reservedLines) {
        for (OrderLine line : reservedLines) {
            try {
                inventoryClient.release(line.getSku(), line.getQuantity());
            } catch (Exception ex) {
                increment("smartlogix.inventory.releases", "result", "failed");
                log.error(
                        "inventory_release_failed sku={} quantity={}",
                        line.getSku(),
                        line.getQuantity(),
                        ex
                );
            }
        }
    }

    private OrderResponse toResponse(PurchaseOrder order) {
        List<OrderLineResponse> lines = order.getLines().stream()
                .map(line -> new OrderLineResponse(
                        line.getSku(),
                        line.getQuantity(),
                        line.getUnitPrice(),
                        line.getUnitPrice().multiply(BigDecimal.valueOf(line.getQuantity()))
                ))
                .toList();

        return new OrderResponse(
                order.getOrderNumber(),
                order.getCustomerName(),
                order.getCustomerEmail(),
                order.getCustomerPhone(),
                order.getCustomerDocument(),
                order.isMarketingOptIn(),
                order.getSalesChannel(),
                order.getShippingAddress(),
                order.getShippingRegion(),
                order.getShippingCommune(),
                order.getBillingAddress(),
                order.getDeliveryInstructions(),
                order.getFulfillmentMethod(),
                order.getPickupLocation(),
                order.getShippingMethod(),
                order.getPaymentMethod(),
                order.getPaymentStatus(),
                order.getTransactionReference(),
                order.getPaymentAuthorizationCode(),
                order.getPaymentProcessedAt(),
                order.getPaymentFailureReason(),
                order.getRefundReference(),
                order.getRefundedAt(),
                order.getRefundAmount(),
                order.getCancelledAt(),
                order.getCancelledBy(),
                order.getCancellationReason(),
                order.getStatus(),
                order.getSubtotalAmount(),
                order.getDiscountAmount(),
                order.getShippingAmount(),
                order.getTotalAmount(),
                order.getDiscountCode(),
                order.getTrackingCode(),
                order.getRejectionReason(),
                order.getCreatedAt(),
                lines
        );
    }

    public OrderResponse updateOrder(String orderNumber, UpdateOrderRequest request) {
        PurchaseOrder order = repository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new OrderNotFoundException("No existe la orden " + orderNumber));

        rejectCompletedPosMutation(order);

        order.setCustomerName(request.customerName().trim());
        order.setCustomerEmail(request.customerEmail().trim().toLowerCase());
        validateCheckoutDetails(
                order.getFulfillmentMethod(),
                request.shippingAddress(),
                request.shippingRegion(),
                request.shippingCommune(),
                order.getPickupLocation(),
                order.getPaymentMethod()
        );
        if (order.getFulfillmentMethod() == FulfillmentMethod.DELIVERY) {
            order.setShippingAddress(request.shippingAddress().trim());
            order.setShippingRegion(request.shippingRegion().trim());
            order.setShippingCommune(request.shippingCommune().trim());
        }
        List<PricedLine> pricedLines = priceLines(request.lines());
        BigDecimal subtotal = calculateTotal(pricedLines);
        BigDecimal discountAmount = calculateDiscount(request.discountCode(), subtotal);
        BigDecimal shippingAmount = calculateShipping(
                order.getFulfillmentMethod(),
                order.getShippingMethod(),
                order.getShippingRegion(),
                order.getShippingCommune(),
                subtotal
        );
        BigDecimal total = subtotal.subtract(discountAmount).add(shippingAmount);

        order.setSubtotalAmount(subtotal);
        order.setDiscountAmount(discountAmount);
        order.setShippingAmount(shippingAmount);
        order.setTotalAmount(total);
        order.setDiscountCode(
                request.discountCode() == null || request.discountCode().isBlank()
                        ? null
                        : request.discountCode().trim().toUpperCase()
        );

        order.getLines().clear();

        for (PricedLine pricedLine : pricedLines) {
            OrderLine line = new OrderLine();
            line.setSku(pricedLine.sku());
            line.setQuantity(pricedLine.quantity());
            line.setUnitPrice(pricedLine.unitPrice());
            order.addLine(line);
        }

        PurchaseOrder savedOrder = repository.save(order);
        syncShipmentDestination(savedOrder);
        log.info("order_updated orderNumber={} total={}", savedOrder.getOrderNumber(), savedOrder.getTotalAmount());

        return toResponse(savedOrder);
    }

    @Transactional
    public void deleteOrder(String orderNumber) {
        PurchaseOrder order = repository.findByOrderNumber(orderNumber)
                .orElseThrow(() ->
                        new OrderNotFoundException("No existe la orden " + orderNumber));

        rejectCompletedPosMutation(order);

        if (hasReservedInventory(order)) {
            releaseReservedLinesOrThrow(order.getLines());
        }

        if (order.getTrackingCode() != null && !order.getTrackingCode().isBlank()) {
            shipmentClient.deleteShipment(order.getTrackingCode());
        }

        repository.delete(order);
        increment("smartlogix.orders.deleted", "status", order.getStatus().name());
        log.info("order_deleted orderNumber={} previousStatus={}", order.getOrderNumber(), order.getStatus());
    }

    private boolean hasReservedInventory(PurchaseOrder order) {
        return order.getStatus() == OrderStatus.APPROVED
                || order.getStatus() == OrderStatus.SHIPMENT_REQUESTED
                || order.getStatus() == OrderStatus.FAILED;
    }

    private void rejectCompletedPosMutation(PurchaseOrder order) {
        if (order.getCashRegisterSession() != null || order.getStatus() == OrderStatus.COMPLETED) {
            throw new IllegalArgumentException(
                    "Las ventas POS completadas solo pueden consultarse desde el punto de venta."
            );
        }
    }

    private OrderResponse cancelOrder(PurchaseOrder order, String cancelledBy, String reason) {
        if (order.getStatus() != OrderStatus.APPROVED
                && order.getStatus() != OrderStatus.SHIPMENT_REQUESTED
                && order.getStatus() != OrderStatus.FAILED) {
            throw new IllegalArgumentException("El pedido ya no se puede cancelar.");
        }

        String cleanReason = cleanOptional(reason);
        if (cleanReason == null) {
            throw new IllegalArgumentException("Debes indicar el motivo de la cancelacion.");
        }

        if (order.getTrackingCode() != null && !order.getTrackingCode().isBlank()) {
            ShipmentResponse shipment = shipmentClient.getShipment(order.getTrackingCode());
            if (shipment == null) {
                throw new OrderProcessingException(
                        "No fue posible validar el estado del envio. Intenta nuevamente."
                );
            }
            if (!"PLANNED".equals(shipment.status())) {
                throw new IllegalArgumentException(
                        "El pedido ya fue entregado al transportista y no se puede cancelar."
                );
            }
            if (!shipmentClient.deleteShipment(order.getTrackingCode())) {
                throw new OrderProcessingException("No fue posible cancelar el envio asociado.");
            }
        }

        if (hasReservedInventory(order)) {
            releaseReservedLinesOrThrow(order.getLines());
        }

        RefundResult refund = paymentSimulationService.refund(
                order.getPaymentStatus(),
                order.getTotalAmount()
        );
        order.setPaymentStatus(refund.status());
        order.setRefundReference(refund.reference());
        order.setRefundedAt(refund.processedAt());
        order.setRefundAmount(refund.amount());
        order.setCancelledAt(OffsetDateTime.now());
        order.setCancelledBy(cleanOptional(cancelledBy));
        order.setCancellationReason(cleanReason);
        order.setTrackingCode(null);
        order.setStatus(OrderStatus.CANCELLED);
        PurchaseOrder cancelledOrder = repository.save(order);
        notificationPort.queue(cancelledOrder, NotificationType.ORDER_CANCELLED);
        increment("smartlogix.orders.cancelled", "channel", cancelledOrder.getSalesChannel().name());
        log.info(
                "order_cancelled orderNumber={} channel={} refundStatus={}",
                cancelledOrder.getOrderNumber(),
                cancelledOrder.getSalesChannel(),
                cancelledOrder.getPaymentStatus()
        );

        return toResponse(cancelledOrder);
    }

    private void releaseReservedLinesOrThrow(List<OrderLine> reservedLines) {
        for (OrderLine line : reservedLines) {
            inventoryClient.release(line.getSku(), line.getQuantity());
        }
    }

    private void syncShipmentDestination(PurchaseOrder order) {
        if (order.getFulfillmentMethod() != FulfillmentMethod.DELIVERY
                || order.getTrackingCode() == null || order.getTrackingCode().isBlank()) {
            return;
        }

        shipmentClient.updateShipment(
                order.getTrackingCode(),
                new ShipmentRequest(
                        order.getOrderNumber(),
                        order.getShippingAddress(),
                        totalUnits(order)
                )
        );
    }

    private void recordRejection(PurchaseOrder order, String reason) {
        increment("smartlogix.orders.rejected", "reason", reason);
        log.warn(
                "order_rejected orderNumber={} reason={} status={}",
                order.getOrderNumber(),
                reason,
                order.getStatus()
        );
    }

    private void increment(String name, String tagName, String tagValue) {
        meterRegistry.counter(name, tagName, tagValue).increment();
    }

    private record PricedLine(
            String sku,
            int quantity,
            BigDecimal unitPrice,
            int availableQuantity
    ) {
    }
}

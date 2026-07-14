package com.smartlogix.order.service;

import com.smartlogix.order.client.CatalogProductResponse;
import com.smartlogix.order.client.InventoryClient;
import com.smartlogix.order.client.InventoryClientException;
import com.smartlogix.order.client.ShipmentClient;
import com.smartlogix.order.client.ShipmentRequest;
import com.smartlogix.order.client.ShipmentResponse;
import com.smartlogix.order.domain.OrderLine;
import com.smartlogix.order.domain.OrderChannel;
import com.smartlogix.order.domain.OrderStatus;
import com.smartlogix.order.domain.PurchaseOrder;
import com.smartlogix.order.dto.CreateOrderRequest;
import com.smartlogix.order.dto.UpdateOrderRequest;
import com.smartlogix.order.dto.OrderLineRequest;
import com.smartlogix.order.dto.OrderLineResponse;
import com.smartlogix.order.dto.OrderResponse;
import com.smartlogix.order.exception.OrderNotFoundException;
import com.smartlogix.order.exception.OrderProcessingException;
import com.smartlogix.order.repository.PurchaseOrderRepository;
import com.smartlogix.order.discount.Discount;
import com.smartlogix.order.repository.DiscountRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class OrderService {

    private final PurchaseOrderRepository repository;
    private final InventoryClient inventoryClient;
    private final ShipmentClient shipmentClient;
    private final DiscountRepository discountRepository;

    public OrderService(
            PurchaseOrderRepository repository,
            InventoryClient inventoryClient,
            ShipmentClient shipmentClient,
            DiscountRepository discountRepository
    ) {
        this.repository = repository;
        this.inventoryClient = inventoryClient;
        this.shipmentClient = shipmentClient;
        this.discountRepository = discountRepository;
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

        for (PricedLine line : pricedLines) {
            if (line.availableQuantity() < line.quantity()) {
                order.setStatus(OrderStatus.REJECTED);
                order.setRejectionReason("Stock insuficiente para SKU " + line.sku());
                repository.save(order);
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
                return toResponse(order);
            }
        }

        order.setStatus(OrderStatus.APPROVED);

        ShipmentResponse shipmentResponse = shipmentClient.requestShipment(
                new ShipmentRequest(order.getOrderNumber(), order.getShippingAddress(), totalUnits(order))
        );

        if (shipmentResponse == null || shipmentResponse.trackingCode() == null) {
            order.setStatus(OrderStatus.FAILED);
            order.setRejectionReason("Servicio de envios no disponible. Asignacion manual requerida.");
            repository.save(order);
            return toResponse(order);
        }

        order.setStatus(OrderStatus.SHIPMENT_REQUESTED);
        order.setTrackingCode(shipmentResponse.trackingCode());
        repository.save(order);

        return toResponse(order);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getOrders() {
        return repository.findAll().stream()
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
        order.setCustomerUsername(customerUsername);
        order.setSalesChannel(salesChannel == null ? OrderChannel.ONLINE : salesChannel);
        order.setShippingAddress(request.shippingAddress().trim());
        order.setStatus(OrderStatus.PENDING);
        BigDecimal subtotal = calculateTotal(pricedLines);
        BigDecimal discountAmount = calculateDiscount(request.discountCode(), subtotal);
        BigDecimal total = subtotal.subtract(discountAmount);

        order.setSubtotalAmount(subtotal);
        order.setDiscountAmount(discountAmount);
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
            } catch (Exception ignored) {
                // Si la liberacion falla, la orden queda rechazada y se audita por log externo.
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
                order.getSalesChannel(),
                order.getShippingAddress(),
                order.getStatus(),
                order.getSubtotalAmount(),
                order.getDiscountAmount(),
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

        order.setCustomerName(request.customerName().trim());
        order.setCustomerEmail(request.customerEmail().trim().toLowerCase());
        order.setShippingAddress(request.shippingAddress().trim());
        List<PricedLine> pricedLines = priceLines(request.lines());
        BigDecimal subtotal = calculateTotal(pricedLines);
        BigDecimal discountAmount = calculateDiscount(request.discountCode(), subtotal);
        BigDecimal total = subtotal.subtract(discountAmount);

        order.setSubtotalAmount(subtotal);
        order.setDiscountAmount(discountAmount);
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

        return toResponse(savedOrder);
    }

    @Transactional
    public void deleteOrder(String orderNumber) {
        PurchaseOrder order = repository.findByOrderNumber(orderNumber)
                .orElseThrow(() ->
                        new OrderNotFoundException("No existe la orden " + orderNumber));

        if (hasReservedInventory(order)) {
            releaseReservedLinesOrThrow(order.getLines());
        }

        if (order.getTrackingCode() != null && !order.getTrackingCode().isBlank()) {
            shipmentClient.deleteShipment(order.getTrackingCode());
        }

        repository.delete(order);
    }

    private boolean hasReservedInventory(PurchaseOrder order) {
        return order.getStatus() == OrderStatus.APPROVED
                || order.getStatus() == OrderStatus.SHIPMENT_REQUESTED
                || order.getStatus() == OrderStatus.FAILED;
    }

    private void releaseReservedLinesOrThrow(List<OrderLine> reservedLines) {
        for (OrderLine line : reservedLines) {
            inventoryClient.release(line.getSku(), line.getQuantity());
        }
    }

    private void syncShipmentDestination(PurchaseOrder order) {
        if (order.getTrackingCode() == null || order.getTrackingCode().isBlank()) {
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

    private record PricedLine(
            String sku,
            int quantity,
            BigDecimal unitPrice,
            int availableQuantity
    ) {
    }
}

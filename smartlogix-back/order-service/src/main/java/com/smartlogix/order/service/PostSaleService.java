package com.smartlogix.order.service;

import com.smartlogix.order.client.InventoryBatchLineRequest;
import com.smartlogix.order.client.InventoryClient;
import com.smartlogix.order.client.RestockInventoryLineRequest;
import com.smartlogix.order.client.ShipmentClient;
import com.smartlogix.order.client.ShipmentRequest;
import com.smartlogix.order.client.ShipmentResponse;
import com.smartlogix.order.domain.FulfillmentMethod;
import com.smartlogix.order.domain.OrderLine;
import com.smartlogix.order.domain.OrderStatus;
import com.smartlogix.order.domain.PaymentStatus;
import com.smartlogix.order.domain.PostSaleLine;
import com.smartlogix.order.domain.PostSaleRequest;
import com.smartlogix.order.domain.PostSaleResolution;
import com.smartlogix.order.domain.PostSaleStatus;
import com.smartlogix.order.domain.PostSaleType;
import com.smartlogix.order.domain.PurchaseOrder;
import com.smartlogix.order.postsale.CreatePostSaleLineRequest;
import com.smartlogix.order.postsale.CreatePostSaleRequest;
import com.smartlogix.order.postsale.PostSaleLineResponse;
import com.smartlogix.order.postsale.PostSaleResponse;
import com.smartlogix.order.postsale.ReceivePostSaleLineRequest;
import com.smartlogix.order.postsale.ReceivePostSaleRequest;
import com.smartlogix.order.postsale.ResolvePostSaleRequest;
import com.smartlogix.order.postsale.ReviewPostSaleRequest;
import com.smartlogix.order.repository.PostSaleRequestRepository;
import com.smartlogix.order.repository.PurchaseOrderRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class PostSaleService {

    private static final int RETURN_WINDOW_DAYS = 30;
    private static final int WARRANTY_WINDOW_DAYS = 180;

    private final PostSaleRequestRepository repository;
    private final PurchaseOrderRepository orderRepository;
    private final InventoryClient inventoryClient;
    private final ShipmentClient shipmentClient;
    private final PaymentSimulationService paymentService;

    public PostSaleService(
            PostSaleRequestRepository repository,
            PurchaseOrderRepository orderRepository,
            InventoryClient inventoryClient,
            ShipmentClient shipmentClient,
            PaymentSimulationService paymentService
    ) {
        this.repository = repository;
        this.orderRepository = orderRepository;
        this.inventoryClient = inventoryClient;
        this.shipmentClient = shipmentClient;
        this.paymentService = paymentService;
    }

    @Transactional(readOnly = true)
    public List<PostSaleResponse> listCustomerRequests(String username) {
        return repository.findAllByCustomerUsernameOrderByRequestedAtDesc(username).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PostSaleResponse> listRequests() {
        return repository.findAllByOrderByRequestedAtDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PostSaleResponse findRequest(String requestNumber) {
        return toResponse(loadRequest(requestNumber));
    }

    public PostSaleResponse createCustomerRequest(
            String username,
            String orderNumber,
            CreatePostSaleRequest request
    ) {
        PurchaseOrder order = orderRepository
                .findByOrderNumberAndCustomerUsername(orderNumber, username)
                .orElseThrow(() -> new IllegalArgumentException("No existe la compra solicitada."));

        validateEligibility(order, request.type());
        validateResolutionForType(request.type(), request.preferredResolution());

        Map<String, OrderLine> orderLines = new HashMap<>();
        order.getLines().forEach(line -> orderLines.put(normalizeSku(line.getSku()), line));
        Map<String, Integer> committedQuantities = committedQuantities(orderNumber);
        Set<String> requestedSkus = new HashSet<>();

        PostSaleRequest entity = new PostSaleRequest();
        entity.setOrder(order);
        entity.setCustomerUsername(username);
        entity.setType(request.type());
        entity.setPreferredResolution(request.preferredResolution());
        entity.setReason(request.reason().trim());
        entity.setCustomerNotes(cleanOptional(request.notes()));

        for (CreatePostSaleLineRequest requestedLine : request.lines()) {
            String sku = normalizeSku(requestedLine.sku());
            if (!requestedSkus.add(sku)) {
                throw new IllegalArgumentException("Cada SKU debe aparecer una sola vez en la solicitud.");
            }

            OrderLine orderLine = orderLines.get(sku);
            if (orderLine == null) {
                throw new IllegalArgumentException("El SKU " + sku + " no pertenece a esta compra.");
            }
            int remaining = orderLine.getQuantity() - committedQuantities.getOrDefault(sku, 0);
            if (requestedLine.quantity() > remaining) {
                throw new IllegalArgumentException(
                        "Solo quedan " + remaining + " unidad(es) disponibles para postventa del SKU " + sku + "."
                );
            }

            PostSaleLine line = new PostSaleLine();
            line.setSku(sku);
            line.setProductName(orderLine.getProductName() == null ? sku : orderLine.getProductName());
            line.setRequestedQuantity(requestedLine.quantity());
            line.setReceivedQuantity(0);
            line.setRestockedQuantity(0);
            line.setUnitPrice(orderLine.getUnitPrice());
            entity.addLine(line);
        }

        return toResponse(repository.save(entity));
    }

    public PostSaleResponse cancelCustomerRequest(String username, String requestNumber) {
        PostSaleRequest request = repository
                .findByRequestNumberAndCustomerUsername(requestNumber, username)
                .orElseThrow(() -> new IllegalArgumentException("No existe la solicitud indicada."));
        requireStatus(request, PostSaleStatus.REQUESTED, "Solo puedes cancelar solicitudes pendientes.");
        request.setStatus(PostSaleStatus.CANCELLED);
        request.setCancelledAt(OffsetDateTime.now());
        return toResponse(repository.save(request));
    }

    public PostSaleResponse review(
            String requestNumber,
            String username,
            ReviewPostSaleRequest review
    ) {
        PostSaleRequest request = loadRequest(requestNumber);
        requireStatus(request, PostSaleStatus.REQUESTED, "La solicitud ya fue revisada.");
        request.setStatus(review.approved() ? PostSaleStatus.APPROVED : PostSaleStatus.REJECTED);
        request.setStaffResponse(review.response().trim());
        request.setReviewedBy(username);
        request.setReviewedAt(OffsetDateTime.now());
        return toResponse(repository.save(request));
    }

    public PostSaleResponse receive(
            String requestNumber,
            String username,
            ReceivePostSaleRequest received
    ) {
        PostSaleRequest request = loadRequest(requestNumber);
        requireStatus(request, PostSaleStatus.APPROVED, "La solicitud no esta lista para recepcion.");

        Map<String, ReceivePostSaleLineRequest> receivedLines = new HashMap<>();
        for (ReceivePostSaleLineRequest line : received.lines()) {
            String sku = normalizeSku(line.sku());
            if (receivedLines.put(sku, line) != null) {
                throw new IllegalArgumentException("Cada SKU recibido debe informarse una sola vez.");
            }
        }

        List<RestockInventoryLineRequest> restockLines = new ArrayList<>();
        for (PostSaleLine line : request.getLines()) {
            ReceivePostSaleLineRequest receivedLine = receivedLines.get(line.getSku());
            if (receivedLine == null || receivedLine.receivedQuantity() != line.getRequestedQuantity()) {
                throw new IllegalArgumentException("Debes confirmar todas las unidades aprobadas del SKU " + line.getSku() + ".");
            }
            if (receivedLine.restockQuantity() > receivedLine.receivedQuantity()) {
                throw new IllegalArgumentException("La reposicion no puede superar las unidades recibidas.");
            }
            if ((receivedLine.condition().name().equals("DEFECTIVE")
                    || receivedLine.condition().name().equals("DAMAGED"))
                    && receivedLine.restockQuantity() > 0) {
                throw new IllegalArgumentException("Los productos defectuosos o danados no vuelven al stock disponible.");
            }

            line.setReceivedQuantity(receivedLine.receivedQuantity());
            line.setRestockedQuantity(receivedLine.restockQuantity());
            line.setProductCondition(receivedLine.condition());
            if (receivedLine.restockQuantity() > 0) {
                restockLines.add(new RestockInventoryLineRequest(line.getSku(), receivedLine.restockQuantity()));
            }
        }

        String warehouseCode = received.warehouseCode().trim().toUpperCase(Locale.ROOT);
        if (!restockLines.isEmpty()) {
            inventoryClient.restockBatch(warehouseCode, request.getRequestNumber(), restockLines);
        }

        request.setReceivingWarehouseCode(warehouseCode);
        request.setReceivedBy(username);
        request.setReceivedAt(OffsetDateTime.now());
        request.setStatus(PostSaleStatus.RECEIVED);
        return toResponse(repository.save(request));
    }

    public PostSaleResponse resolve(
            String requestNumber,
            String username,
            ResolvePostSaleRequest resolution
    ) {
        PostSaleRequest request = loadRequest(requestNumber);
        requireStatus(request, PostSaleStatus.RECEIVED, "La solicitud debe recibirse antes de resolverla.");
        validateResolutionForType(request.getType(), resolution.resolution());

        switch (resolution.resolution()) {
            case REFUND -> applyRefund(request);
            case REPLACEMENT -> applyReplacement(request);
            case REPAIR -> request.setResolutionReference("RPR-" + randomToken());
        }

        request.setFinalResolution(resolution.resolution());
        request.setStaffResponse(resolution.notes().trim());
        request.setResolvedBy(username);
        request.setResolvedAt(OffsetDateTime.now());
        request.setStatus(PostSaleStatus.RESOLVED);
        return toResponse(repository.save(request));
    }

    private void applyRefund(PostSaleRequest request) {
        PurchaseOrder order = request.getOrder();
        BigDecimal refundAmount = calculateRefundAmount(order, request.getLines());
        RefundResult refund = paymentService.refundPartial(
                order.getPaymentStatus(),
                refundAmount,
                order.getTotalAmount(),
                order.getRefundAmount()
        );
        BigDecimal previousRefund = order.getRefundAmount() == null ? BigDecimal.ZERO : order.getRefundAmount();
        order.setPaymentStatus(refund.status());
        order.setRefundAmount(previousRefund.add(refund.amount()));
        order.setRefundReference(refund.reference());
        order.setRefundedAt(refund.processedAt());
        orderRepository.save(order);

        request.setRefundAmount(refund.amount());
        request.setRefundReference(refund.reference());
        request.setResolutionReference(refund.reference());
    }

    private void applyReplacement(PostSaleRequest request) {
        List<InventoryBatchLineRequest> replacements = request.getLines().stream()
                .map(line -> new InventoryBatchLineRequest(line.getSku(), line.getReceivedQuantity()))
                .toList();
        List<InventoryBatchLineRequest> reserved = new ArrayList<>();
        try {
            for (InventoryBatchLineRequest line : replacements) {
                inventoryClient.reserve(line.sku(), line.quantity());
                reserved.add(line);
            }
            inventoryClient.dispatchBatch(replacements);
        } catch (RuntimeException ex) {
            for (InventoryBatchLineRequest line : reserved) {
                try {
                    inventoryClient.release(line.sku(), line.quantity());
                } catch (RuntimeException ignored) {
                    // The original inventory error is the actionable failure.
                }
            }
            throw ex;
        }

        request.setResolutionReference("REP-" + randomToken());
        PurchaseOrder order = request.getOrder();
        if (order.getFulfillmentMethod() == FulfillmentMethod.DELIVERY) {
            int totalUnits = replacements.stream().mapToInt(InventoryBatchLineRequest::quantity).sum();
            ShipmentResponse shipment = shipmentClient.requestShipment(new ShipmentRequest(
                    request.getRequestNumber(),
                    order.getShippingAddress(),
                    totalUnits
            ));
            request.setReplacementTrackingCode(shipment == null ? null : shipment.trackingCode());
        }
    }

    private BigDecimal calculateRefundAmount(PurchaseOrder order, List<PostSaleLine> lines) {
        BigDecimal gross = lines.stream()
                .map(line -> line.getUnitPrice().multiply(BigDecimal.valueOf(line.getReceivedQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal subtotal = order.getSubtotalAmount();
        BigDecimal discount = order.getDiscountAmount() == null ? BigDecimal.ZERO : order.getDiscountAmount();
        if (subtotal == null || subtotal.compareTo(BigDecimal.ZERO) <= 0 || discount.signum() == 0) {
            return gross.setScale(2, RoundingMode.HALF_UP);
        }
        BigDecimal discountRate = discount.divide(subtotal, 8, RoundingMode.HALF_UP);
        return gross.subtract(gross.multiply(discountRate)).setScale(2, RoundingMode.HALF_UP);
    }

    private void validateEligibility(PurchaseOrder order, PostSaleType type) {
        if (order.getPaymentStatus() != PaymentStatus.PAID
                && order.getPaymentStatus() != PaymentStatus.PARTIALLY_REFUNDED) {
            throw new IllegalArgumentException("La compra no tiene un pago valido para postventa.");
        }

        boolean fulfilled = order.getStatus() == OrderStatus.COMPLETED
                || order.getStatus() == OrderStatus.DELIVERED;
        if (!fulfilled && order.getFulfillmentMethod() == FulfillmentMethod.DELIVERY
                && order.getTrackingCode() != null) {
            ShipmentResponse shipment = shipmentClient.getShipment(order.getTrackingCode());
            fulfilled = shipment != null && "DELIVERED".equals(shipment.status());
        }
        if (!fulfilled) {
            throw new IllegalArgumentException("La compra debe estar entregada antes de solicitar postventa.");
        }

        long elapsedDays = ChronoUnit.DAYS.between(order.getCreatedAt(), OffsetDateTime.now());
        int limit = type == PostSaleType.WARRANTY ? WARRANTY_WINDOW_DAYS : RETURN_WINDOW_DAYS;
        if (elapsedDays > limit) {
            throw new IllegalArgumentException("La compra supero el plazo de " + limit + " dias para esta solicitud.");
        }
    }

    private void validateResolutionForType(PostSaleType type, PostSaleResolution resolution) {
        boolean valid = switch (type) {
            case RETURN -> resolution == PostSaleResolution.REFUND;
            case EXCHANGE -> resolution == PostSaleResolution.REPLACEMENT
                    || resolution == PostSaleResolution.REFUND;
            case WARRANTY -> true;
        };
        if (!valid) {
            throw new IllegalArgumentException("La solucion seleccionada no corresponde al tipo de solicitud.");
        }
    }

    private Map<String, Integer> committedQuantities(String orderNumber) {
        Map<String, Integer> result = new HashMap<>();
        repository.findAllByOrder_OrderNumber(orderNumber).stream()
                .filter(request -> request.getStatus() != PostSaleStatus.REJECTED
                        && request.getStatus() != PostSaleStatus.CANCELLED)
                .flatMap(request -> request.getLines().stream())
                .forEach(line -> result.merge(line.getSku(), line.getRequestedQuantity(), Integer::sum));
        return result;
    }

    private PostSaleRequest loadRequest(String requestNumber) {
        return repository.findByRequestNumber(requestNumber)
                .orElseThrow(() -> new IllegalArgumentException("No existe la solicitud " + requestNumber + "."));
    }

    private void requireStatus(PostSaleRequest request, PostSaleStatus expected, String message) {
        if (request.getStatus() != expected) {
            throw new IllegalArgumentException(message);
        }
    }

    private PostSaleResponse toResponse(PostSaleRequest request) {
        PurchaseOrder order = request.getOrder();
        return new PostSaleResponse(
                request.getRequestNumber(),
                order.getOrderNumber(),
                request.getCustomerUsername(),
                order.getCustomerName(),
                order.getCustomerEmail(),
                request.getType(),
                request.getStatus(),
                request.getPreferredResolution(),
                request.getFinalResolution(),
                request.getReason(),
                request.getCustomerNotes(),
                request.getStaffResponse(),
                request.getReviewedBy(),
                request.getReceivedBy(),
                request.getResolvedBy(),
                request.getReceivingWarehouseCode(),
                request.getResolutionReference(),
                request.getReplacementTrackingCode(),
                request.getRefundAmount(),
                request.getRefundReference(),
                request.getRequestedAt(),
                request.getReviewedAt(),
                request.getReceivedAt(),
                request.getResolvedAt(),
                request.getCancelledAt(),
                request.getLines().stream().map(line -> new PostSaleLineResponse(
                        line.getSku(),
                        line.getProductName(),
                        line.getRequestedQuantity(),
                        line.getReceivedQuantity(),
                        line.getRestockedQuantity(),
                        line.getUnitPrice(),
                        line.getProductCondition()
                )).toList()
        );
    }

    private String cleanOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String normalizeSku(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private String randomToken() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
    }
}

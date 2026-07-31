package com.smartlogix.order.service;

import com.smartlogix.order.client.CatalogProductResponse;
import com.smartlogix.order.client.InventoryClient;
import com.smartlogix.order.client.InventoryClientException;
import com.smartlogix.order.client.InventoryBatchLineRequest;
import com.smartlogix.order.discount.Discount;
import com.smartlogix.order.domain.CashRegisterSession;
import com.smartlogix.order.domain.CashRegisterStatus;
import com.smartlogix.order.domain.FulfillmentMethod;
import com.smartlogix.order.domain.OrderChannel;
import com.smartlogix.order.domain.OrderLine;
import com.smartlogix.order.domain.OrderStatus;
import com.smartlogix.order.domain.PaymentMethod;
import com.smartlogix.order.domain.PaymentStatus;
import com.smartlogix.order.domain.PurchaseOrder;
import com.smartlogix.order.dto.OrderLineRequest;
import com.smartlogix.order.exception.OrderNotFoundException;
import com.smartlogix.order.exception.OrderProcessingException;
import com.smartlogix.order.pos.CashRegisterResponse;
import com.smartlogix.order.pos.CloseCashRegisterRequest;
import com.smartlogix.order.pos.CreatePosSaleRequest;
import com.smartlogix.order.pos.OpenCashRegisterRequest;
import com.smartlogix.order.pos.PosSaleLineResponse;
import com.smartlogix.order.pos.PosSaleResponse;
import com.smartlogix.order.repository.CashRegisterSessionRepository;
import com.smartlogix.order.repository.DiscountRepository;
import com.smartlogix.order.repository.PurchaseOrderRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class PosService {

    private static final Logger log = LoggerFactory.getLogger(PosService.class);
    private static final EnumSet<PaymentMethod> POS_PAYMENT_METHODS = EnumSet.of(
            PaymentMethod.POS_CASH,
            PaymentMethod.POS_DEBIT,
            PaymentMethod.POS_CREDIT,
            PaymentMethod.POS_TRANSFER
    );

    private final CashRegisterSessionRepository sessionRepository;
    private final PurchaseOrderRepository orderRepository;
    private final DiscountRepository discountRepository;
    private final InventoryClient inventoryClient;
    private final PaymentSimulationService paymentService;

    public PosService(
            CashRegisterSessionRepository sessionRepository,
            PurchaseOrderRepository orderRepository,
            DiscountRepository discountRepository,
            InventoryClient inventoryClient,
            PaymentSimulationService paymentService
    ) {
        this.sessionRepository = sessionRepository;
        this.orderRepository = orderRepository;
        this.discountRepository = discountRepository;
        this.inventoryClient = inventoryClient;
        this.paymentService = paymentService;
    }

    public CashRegisterResponse openSession(String username, OpenCashRegisterRequest request) {
        String registerCode = normalizeRegisterCode(request.registerCode());
        BigDecimal openingAmount = money(request.openingAmount());

        if (sessionRepository.findFirstByOpenedByAndStatusOrderByOpenedAtDesc(
                username,
                CashRegisterStatus.OPEN
        ).isPresent()) {
            throw new IllegalArgumentException("Ya tienes una caja abierta.");
        }
        if (sessionRepository.findFirstByRegisterCodeAndStatus(
                registerCode,
                CashRegisterStatus.OPEN
        ).isPresent()) {
            throw new IllegalArgumentException("La caja " + registerCode + " ya esta siendo utilizada.");
        }

        CashRegisterSession session = new CashRegisterSession();
        session.setRegisterCode(registerCode);
        session.setOpenedBy(username);
        session.setOpeningAmount(openingAmount);
        session.setStatus(CashRegisterStatus.OPEN);
        CashRegisterSession saved = sessionRepository.save(session);
        log.info("pos_register_opened session={} register={} user={}",
                saved.getSessionNumber(), registerCode, username);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public Optional<CashRegisterResponse> currentSession(String username) {
        return sessionRepository.findFirstByOpenedByAndStatusOrderByOpenedAtDesc(
                username,
                CashRegisterStatus.OPEN
        ).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public List<CashRegisterResponse> sessionHistory(String username) {
        return sessionRepository.findTop20ByOpenedByOrderByOpenedAtDesc(username).stream()
                .map(this::toResponse)
                .toList();
    }

    public CashRegisterResponse closeSession(
            String username,
            String sessionNumber,
            CloseCashRegisterRequest request
    ) {
        CashRegisterSession session = ownedOpenSession(username, sessionNumber);
        session.close(username, money(request.declaredCash()));
        CashRegisterSession saved = sessionRepository.save(session);
        log.info("pos_register_closed session={} user={} expected={} declared={} difference={}",
                sessionNumber,
                username,
                saved.getExpectedCash(),
                saved.getDeclaredCash(),
                saved.getCashDifference());
        return toResponse(saved);
    }

    public PosSaleResponse createSale(String username, CreatePosSaleRequest request) {
        CashRegisterSession session = ownedOpenSession(username, request.sessionNumber());
        validatePaymentMethod(request.paymentMethod());
        List<PricedLine> pricedLines = priceLines(request.lines());
        validateStock(pricedLines);

        BigDecimal subtotal = pricedLines.stream()
                .map(line -> line.unitPrice().multiply(BigDecimal.valueOf(line.quantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal discountAmount = calculateDiscount(request.discountCode(), subtotal);
        BigDecimal total = money(subtotal.subtract(discountAmount));
        BigDecimal amountTendered = resolveTenderedAmount(
                request.paymentMethod(),
                request.amountTendered(),
                total
        );
        BigDecimal change = request.paymentMethod() == PaymentMethod.POS_CASH
                ? amountTendered.subtract(total)
                : BigDecimal.ZERO;

        PurchaseOrder order = buildSale(
                username,
                session,
                request,
                pricedLines,
                subtotal,
                discountAmount,
                total,
                amountTendered,
                change
        );

        List<PricedLine> reservedLines = reserve(pricedLines);
        PaymentResult payment = paymentService.process(
                request.paymentMethod(),
                null,
                total
        );
        if (payment.status() != PaymentStatus.PAID) {
            release(reservedLines);
            throw new OrderProcessingException("El pago presencial fue rechazado.");
        }

        applyPayment(order, payment);
        dispatch(reservedLines);
        order.setStatus(OrderStatus.COMPLETED);
        PurchaseOrder savedOrder = orderRepository.save(order);

        BigDecimal cashSale = request.paymentMethod() == PaymentMethod.POS_CASH
                ? total
                : BigDecimal.ZERO;
        session.recordSale(total, cashSale);
        sessionRepository.save(session);
        log.info("pos_sale_completed receipt={} order={} session={} user={} total={}",
                savedOrder.getReceiptNumber(),
                savedOrder.getOrderNumber(),
                session.getSessionNumber(),
                username,
                total);
        return toSaleResponse(savedOrder);
    }

    @Transactional(readOnly = true)
    public List<PosSaleResponse> sessionSales(String username, String sessionNumber) {
        CashRegisterSession session = ownedSession(username, sessionNumber);
        return orderRepository.findAllByCashRegisterSession_IdOrderByCreatedAtDesc(session.getId()).stream()
                .map(this::toSaleResponse)
                .toList();
    }

    private PurchaseOrder buildSale(
            String username,
            CashRegisterSession session,
            CreatePosSaleRequest request,
            List<PricedLine> pricedLines,
            BigDecimal subtotal,
            BigDecimal discountAmount,
            BigDecimal total,
            BigDecimal amountTendered,
            BigDecimal change
    ) {
        PurchaseOrder order = new PurchaseOrder();
        order.setCustomerName(cleanOrDefault(request.customerName(), "Consumidor final"));
        order.setCustomerEmail(cleanOrDefault(request.customerEmail(), "pos@smartlogix.local").toLowerCase());
        order.setSalesChannel(OrderChannel.STORE);
        order.setFulfillmentMethod(FulfillmentMethod.PICKUP);
        order.setPickupLocation(session.getRegisterCode());
        order.setPaymentMethod(request.paymentMethod());
        order.setPaymentStatus(PaymentStatus.PENDING);
        order.setStatus(OrderStatus.PENDING);
        order.setSubtotalAmount(money(subtotal));
        order.setDiscountAmount(money(discountAmount));
        order.setShippingAmount(BigDecimal.ZERO.setScale(2));
        order.setTotalAmount(total);
        order.setDiscountCode(normalizeOptional(request.discountCode()));
        order.setCashRegisterSession(session);
        order.setCashierUsername(username);
        order.setReceiptNumber("CMP-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        order.setAmountTendered(amountTendered);
        order.setChangeAmount(money(change));

        for (PricedLine pricedLine : pricedLines) {
            OrderLine line = new OrderLine();
            line.setSku(pricedLine.sku());
            line.setProductName(pricedLine.productName());
            line.setQuantity(pricedLine.quantity());
            line.setUnitPrice(pricedLine.unitPrice());
            order.addLine(line);
        }
        return order;
    }

    private List<PricedLine> priceLines(List<OrderLineRequest> requestedLines) {
        return requestedLines.stream().map(line -> {
            String sku = line.sku().trim().toUpperCase();
            CatalogProductResponse product = inventoryClient.findProduct(sku);
            if (product == null || product.salePrice() == null
                    || product.salePrice().compareTo(BigDecimal.ZERO) <= 0) {
                throw new OrderProcessingException("El producto " + sku + " no tiene precio de venta valido.");
            }
            return new PricedLine(
                    sku,
                    product.productName(),
                    line.quantity(),
                    money(product.salePrice()),
                    product.availableQuantity()
            );
        }).toList();
    }

    private void validateStock(List<PricedLine> lines) {
        lines.forEach(line -> {
            if (line.availableQuantity() < line.quantity()) {
                throw new OrderProcessingException(
                        "Stock insuficiente para " + line.productName() + ". Disponible: " + line.availableQuantity()
                );
            }
        });
    }

    private List<PricedLine> reserve(List<PricedLine> lines) {
        List<PricedLine> reserved = new ArrayList<>();
        try {
            for (PricedLine line : lines) {
                inventoryClient.reserve(line.sku(), line.quantity());
                reserved.add(line);
            }
            return reserved;
        } catch (InventoryClientException ex) {
            release(reserved);
            throw new OrderProcessingException("No fue posible reservar el inventario de la venta.");
        }
    }

    private void dispatch(List<PricedLine> reservedLines) {
        try {
            inventoryClient.dispatchBatch(reservedLines.stream()
                    .map(line -> new InventoryBatchLineRequest(line.sku(), line.quantity()))
                    .toList());
        } catch (InventoryClientException ex) {
            release(reservedLines);
            throw new OrderProcessingException("No fue posible completar el descuento de inventario.");
        }
    }

    private void release(List<PricedLine> lines) {
        for (PricedLine line : lines) {
            try {
                inventoryClient.release(line.sku(), line.quantity());
            } catch (RuntimeException ex) {
                log.error("pos_inventory_release_failed sku={} quantity={}",
                        line.sku(), line.quantity(), ex);
            }
        }
    }

    private BigDecimal calculateDiscount(String code, BigDecimal subtotal) {
        if (code == null || code.isBlank()) {
            return BigDecimal.ZERO.setScale(2);
        }
        Discount discount = discountRepository.findByCodeIgnoreCase(code.trim())
                .orElseThrow(() -> new IllegalArgumentException("El codigo de descuento no existe."));
        if (!Boolean.TRUE.equals(discount.getActive())) {
            throw new IllegalArgumentException("El codigo de descuento no esta activo.");
        }
        LocalDate today = LocalDate.now();
        if (discount.getValidFrom() != null && today.isBefore(discount.getValidFrom())) {
            throw new IllegalArgumentException("El codigo de descuento aun no esta vigente.");
        }
        if (discount.getValidUntil() != null && today.isAfter(discount.getValidUntil())) {
            throw new IllegalArgumentException("El codigo de descuento esta vencido.");
        }
        return money(subtotal.multiply(BigDecimal.valueOf(discount.getPercentage()))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP));
    }

    private BigDecimal resolveTenderedAmount(
            PaymentMethod method,
            BigDecimal requestedAmount,
            BigDecimal total
    ) {
        if (method != PaymentMethod.POS_CASH) {
            return total;
        }
        if (requestedAmount == null) {
            throw new IllegalArgumentException("Ingresa el efectivo recibido.");
        }
        BigDecimal tendered = money(requestedAmount);
        if (tendered.compareTo(total) < 0) {
            throw new IllegalArgumentException("El efectivo recibido no cubre el total de la venta.");
        }
        return tendered;
    }

    private void applyPayment(PurchaseOrder order, PaymentResult payment) {
        order.setPaymentStatus(payment.status());
        order.setTransactionReference(payment.transactionReference());
        order.setPaymentAuthorizationCode(payment.authorizationCode());
        order.setPaymentProcessedAt(payment.processedAt());
        order.setPaymentFailureReason(payment.failureReason());
    }

    private CashRegisterSession ownedOpenSession(String username, String sessionNumber) {
        CashRegisterSession session = ownedSession(username, sessionNumber);
        if (session.getStatus() != CashRegisterStatus.OPEN) {
            throw new IllegalArgumentException("La caja ya se encuentra cerrada.");
        }
        return session;
    }

    private CashRegisterSession ownedSession(String username, String sessionNumber) {
        CashRegisterSession session = sessionRepository.findBySessionNumber(sessionNumber)
                .orElseThrow(() -> new OrderNotFoundException("No existe la sesion de caja solicitada."));
        if (!session.getOpenedBy().equals(username)) {
            throw new IllegalArgumentException("No puedes operar una caja abierta por otro usuario.");
        }
        return session;
    }

    private void validatePaymentMethod(PaymentMethod method) {
        if (!POS_PAYMENT_METHODS.contains(method)) {
            throw new IllegalArgumentException("El medio de pago no esta disponible en el POS.");
        }
    }

    private String normalizeRegisterCode(String value) {
        return value.trim().toUpperCase().replaceAll("[^A-Z0-9-]", "-");
    }

    private String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim().toUpperCase();
    }

    private String cleanOrDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private BigDecimal money(BigDecimal value) {
        BigDecimal safeValue = value == null ? BigDecimal.ZERO : value;
        if (safeValue.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("El monto no puede ser negativo.");
        }
        return safeValue.setScale(2, RoundingMode.HALF_UP);
    }

    private CashRegisterResponse toResponse(CashRegisterSession session) {
        return new CashRegisterResponse(
                session.getSessionNumber(),
                session.getRegisterCode(),
                session.getOpenedBy(),
                session.getClosedBy(),
                session.getStatus(),
                session.getOpeningAmount(),
                session.getCashSalesAmount(),
                session.getTotalSalesAmount(),
                session.getSaleCount(),
                session.getExpectedCash(),
                session.getDeclaredCash(),
                session.getCashDifference(),
                session.getOpenedAt(),
                session.getClosedAt()
        );
    }

    private PosSaleResponse toSaleResponse(PurchaseOrder order) {
        List<PosSaleLineResponse> lines = order.getLines().stream()
                .map(line -> new PosSaleLineResponse(
                        line.getSku(),
                        line.getProductName(),
                        line.getQuantity(),
                        line.getUnitPrice(),
                        line.getUnitPrice().multiply(BigDecimal.valueOf(line.getQuantity()))
                ))
                .toList();
        CashRegisterSession session = order.getCashRegisterSession();
        return new PosSaleResponse(
                order.getReceiptNumber(),
                order.getOrderNumber(),
                session.getSessionNumber(),
                session.getRegisterCode(),
                order.getCashierUsername(),
                order.getCustomerName(),
                order.getCustomerEmail(),
                order.getPaymentMethod(),
                order.getPaymentStatus(),
                order.getStatus(),
                order.getSubtotalAmount(),
                order.getDiscountAmount(),
                order.getTotalAmount(),
                order.getAmountTendered(),
                order.getChangeAmount(),
                order.getDiscountCode(),
                order.getTransactionReference(),
                order.getCreatedAt(),
                lines
        );
    }

    private record PricedLine(
            String sku,
            String productName,
            int quantity,
            BigDecimal unitPrice,
            int availableQuantity
    ) {
    }
}

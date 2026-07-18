package com.smartlogix.order.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "orders")
public class PurchaseOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String orderNumber;

    @Column(nullable = false, length = 120)
    private String customerName;

    @Column(nullable = false, length = 120)
    private String customerEmail;

    @Column(length = 30)
    private String customerPhone;

    @Column(length = 20)
    private String customerDocument;

    @Column(nullable = false)
    private boolean marketingOptIn;

    @Column(length = 50)
    private String customerUsername;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrderChannel salesChannel = OrderChannel.ONLINE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private FulfillmentMethod fulfillmentMethod = FulfillmentMethod.DELIVERY;

    @Column(length = 255)
    private String shippingAddress;

    @Column(length = 80)
    private String shippingRegion;

    @Column(length = 80)
    private String shippingCommune;

    @Column(length = 255)
    private String billingAddress;

    @Column(length = 250)
    private String deliveryInstructions;

    @Column(length = 120)
    private String pickupLocation;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private ShippingMethod shippingMethod;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private PaymentMethod paymentMethod = PaymentMethod.WEBPAY_SIMULATED;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentStatus paymentStatus = PaymentStatus.PENDING;

    @Column(length = 60)
    private String transactionReference;

    @Column(length = 30)
    private String paymentAuthorizationCode;

    private OffsetDateTime paymentProcessedAt;

    @Column(length = 250)
    private String paymentFailureReason;

    @Column(length = 60)
    private String refundReference;

    private OffsetDateTime refundedAt;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal refundAmount = BigDecimal.ZERO;

    private OffsetDateTime cancelledAt;

    @Column(length = 80)
    private String cancelledBy;

    @Column(length = 250)
    private String cancellationReason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private OrderStatus status;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal totalAmount;

    @Column(length = 40)
    private String trackingCode;

    @Column(length = 250)
    private String rejectionReason;

    @Column(nullable = false)
    private OffsetDateTime createdAt;

    @Column(precision = 14, scale = 2)
    private BigDecimal subtotalAmount = BigDecimal.ZERO;

    @Column(precision = 14, scale = 2)
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal shippingAmount = BigDecimal.ZERO;

    private String discountCode;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<OrderLine> lines = new ArrayList<>();

    @PrePersist
    public void beforeInsert() {
        this.createdAt = OffsetDateTime.now();
        if (this.orderNumber == null || this.orderNumber.isBlank()) {
            this.orderNumber = "ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        }
    }

    public Long getId() {
        return id;
    }

    public String getOrderNumber() {
        return orderNumber;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public String getCustomerEmail() {
        return customerEmail;
    }

    public void setCustomerEmail(String customerEmail) {
        this.customerEmail = customerEmail;
    }

    public String getCustomerPhone() {
        return customerPhone;
    }

    public void setCustomerPhone(String customerPhone) {
        this.customerPhone = customerPhone;
    }

    public String getCustomerDocument() {
        return customerDocument;
    }

    public void setCustomerDocument(String customerDocument) {
        this.customerDocument = customerDocument;
    }

    public boolean isMarketingOptIn() {
        return marketingOptIn;
    }

    public void setMarketingOptIn(boolean marketingOptIn) {
        this.marketingOptIn = marketingOptIn;
    }

    public String getCustomerUsername() {
        return customerUsername;
    }

    public void setCustomerUsername(String customerUsername) {
        this.customerUsername = customerUsername;
    }

    public OrderChannel getSalesChannel() {
        return salesChannel;
    }

    public void setSalesChannel(OrderChannel salesChannel) {
        this.salesChannel = salesChannel;
    }

    public FulfillmentMethod getFulfillmentMethod() {
        return fulfillmentMethod;
    }

    public void setFulfillmentMethod(FulfillmentMethod fulfillmentMethod) {
        this.fulfillmentMethod = fulfillmentMethod;
    }

    public String getShippingAddress() {
        return shippingAddress;
    }

    public void setShippingAddress(String shippingAddress) {
        this.shippingAddress = shippingAddress;
    }

    public String getShippingRegion() {
        return shippingRegion;
    }

    public void setShippingRegion(String shippingRegion) {
        this.shippingRegion = shippingRegion;
    }

    public String getShippingCommune() {
        return shippingCommune;
    }

    public void setShippingCommune(String shippingCommune) {
        this.shippingCommune = shippingCommune;
    }

    public String getBillingAddress() {
        return billingAddress;
    }

    public void setBillingAddress(String billingAddress) {
        this.billingAddress = billingAddress;
    }

    public String getDeliveryInstructions() {
        return deliveryInstructions;
    }

    public void setDeliveryInstructions(String deliveryInstructions) {
        this.deliveryInstructions = deliveryInstructions;
    }

    public String getPickupLocation() {
        return pickupLocation;
    }

    public void setPickupLocation(String pickupLocation) {
        this.pickupLocation = pickupLocation;
    }

    public ShippingMethod getShippingMethod() {
        return shippingMethod;
    }

    public void setShippingMethod(ShippingMethod shippingMethod) {
        this.shippingMethod = shippingMethod;
    }

    public PaymentMethod getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(PaymentMethod paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public PaymentStatus getPaymentStatus() {
        return paymentStatus;
    }

    public void setPaymentStatus(PaymentStatus paymentStatus) {
        this.paymentStatus = paymentStatus;
    }

    public String getTransactionReference() {
        return transactionReference;
    }

    public void setTransactionReference(String transactionReference) {
        this.transactionReference = transactionReference;
    }

    public String getPaymentAuthorizationCode() {
        return paymentAuthorizationCode;
    }

    public void setPaymentAuthorizationCode(String paymentAuthorizationCode) {
        this.paymentAuthorizationCode = paymentAuthorizationCode;
    }

    public OffsetDateTime getPaymentProcessedAt() {
        return paymentProcessedAt;
    }

    public void setPaymentProcessedAt(OffsetDateTime paymentProcessedAt) {
        this.paymentProcessedAt = paymentProcessedAt;
    }

    public String getPaymentFailureReason() {
        return paymentFailureReason;
    }

    public void setPaymentFailureReason(String paymentFailureReason) {
        this.paymentFailureReason = paymentFailureReason;
    }

    public String getRefundReference() {
        return refundReference;
    }

    public void setRefundReference(String refundReference) {
        this.refundReference = refundReference;
    }

    public OffsetDateTime getRefundedAt() {
        return refundedAt;
    }

    public void setRefundedAt(OffsetDateTime refundedAt) {
        this.refundedAt = refundedAt;
    }

    public BigDecimal getRefundAmount() {
        return refundAmount;
    }

    public void setRefundAmount(BigDecimal refundAmount) {
        this.refundAmount = refundAmount;
    }

    public OffsetDateTime getCancelledAt() {
        return cancelledAt;
    }

    public void setCancelledAt(OffsetDateTime cancelledAt) {
        this.cancelledAt = cancelledAt;
    }

    public String getCancelledBy() {
        return cancelledBy;
    }

    public void setCancelledBy(String cancelledBy) {
        this.cancelledBy = cancelledBy;
    }

    public String getCancellationReason() {
        return cancellationReason;
    }

    public void setCancellationReason(String cancellationReason) {
        this.cancellationReason = cancellationReason;
    }

    public OrderStatus getStatus() {
        return status;
    }

    public void setStatus(OrderStatus status) {
        this.status = status;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }

    public String getTrackingCode() {
        return trackingCode;
    }

    public void setTrackingCode(String trackingCode) {
        this.trackingCode = trackingCode;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public List<OrderLine> getLines() {
        return lines;
    }

    public void addLine(OrderLine line) {
        line.setOrder(this);
        this.lines.add(line);
    }

    public BigDecimal getSubtotalAmount() {
        return subtotalAmount;
    }

    public void setSubtotalAmount(BigDecimal subtotalAmount) {
        this.subtotalAmount = subtotalAmount;
    }

    public BigDecimal getDiscountAmount() {
        return discountAmount;
    }

    public void setDiscountAmount(BigDecimal discountAmount) {
        this.discountAmount = discountAmount;
    }

    public BigDecimal getShippingAmount() {
        return shippingAmount;
    }

    public void setShippingAmount(BigDecimal shippingAmount) {
        this.shippingAmount = shippingAmount;
    }

    public String getDiscountCode() {
        return discountCode;
    }

    public void setDiscountCode(String discountCode) {
        this.discountCode = discountCode;
    }
}

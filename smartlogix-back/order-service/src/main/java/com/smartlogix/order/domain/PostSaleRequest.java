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
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "post_sale_requests")
public class PostSaleRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String requestNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private PurchaseOrder order;

    @Column(nullable = false, length = 50)
    private String customerUsername;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PostSaleType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PostSaleStatus status = PostSaleStatus.REQUESTED;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PostSaleResolution preferredResolution;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private PostSaleResolution finalResolution;

    @Column(nullable = false, length = 120)
    private String reason;

    @Column(length = 500)
    private String customerNotes;

    @Column(length = 500)
    private String staffResponse;

    @Column(length = 80)
    private String reviewedBy;

    @Column(length = 80)
    private String receivedBy;

    @Column(length = 80)
    private String resolvedBy;

    @Column(length = 40)
    private String receivingWarehouseCode;

    @Column(length = 60)
    private String resolutionReference;

    @Column(length = 40)
    private String replacementTrackingCode;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal refundAmount = BigDecimal.ZERO;

    @Column(length = 60)
    private String refundReference;

    @Column(nullable = false)
    private OffsetDateTime requestedAt;

    private OffsetDateTime reviewedAt;
    private OffsetDateTime receivedAt;
    private OffsetDateTime resolvedAt;
    private OffsetDateTime cancelledAt;

    @OneToMany(mappedBy = "request", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<PostSaleLine> lines = new ArrayList<>();

    @PrePersist
    void beforeInsert() {
        requestedAt = OffsetDateTime.now();
        if (requestNumber == null || requestNumber.isBlank()) {
            requestNumber = "PSD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        }
    }

    public Long getId() { return id; }
    public String getRequestNumber() { return requestNumber; }
    public PurchaseOrder getOrder() { return order; }
    public void setOrder(PurchaseOrder order) { this.order = order; }
    public String getCustomerUsername() { return customerUsername; }
    public void setCustomerUsername(String customerUsername) { this.customerUsername = customerUsername; }
    public PostSaleType getType() { return type; }
    public void setType(PostSaleType type) { this.type = type; }
    public PostSaleStatus getStatus() { return status; }
    public void setStatus(PostSaleStatus status) { this.status = status; }
    public PostSaleResolution getPreferredResolution() { return preferredResolution; }
    public void setPreferredResolution(PostSaleResolution preferredResolution) { this.preferredResolution = preferredResolution; }
    public PostSaleResolution getFinalResolution() { return finalResolution; }
    public void setFinalResolution(PostSaleResolution finalResolution) { this.finalResolution = finalResolution; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public String getCustomerNotes() { return customerNotes; }
    public void setCustomerNotes(String customerNotes) { this.customerNotes = customerNotes; }
    public String getStaffResponse() { return staffResponse; }
    public void setStaffResponse(String staffResponse) { this.staffResponse = staffResponse; }
    public String getReviewedBy() { return reviewedBy; }
    public void setReviewedBy(String reviewedBy) { this.reviewedBy = reviewedBy; }
    public String getReceivedBy() { return receivedBy; }
    public void setReceivedBy(String receivedBy) { this.receivedBy = receivedBy; }
    public String getResolvedBy() { return resolvedBy; }
    public void setResolvedBy(String resolvedBy) { this.resolvedBy = resolvedBy; }
    public String getReceivingWarehouseCode() { return receivingWarehouseCode; }
    public void setReceivingWarehouseCode(String receivingWarehouseCode) { this.receivingWarehouseCode = receivingWarehouseCode; }
    public String getResolutionReference() { return resolutionReference; }
    public void setResolutionReference(String resolutionReference) { this.resolutionReference = resolutionReference; }
    public String getReplacementTrackingCode() { return replacementTrackingCode; }
    public void setReplacementTrackingCode(String replacementTrackingCode) { this.replacementTrackingCode = replacementTrackingCode; }
    public BigDecimal getRefundAmount() { return refundAmount; }
    public void setRefundAmount(BigDecimal refundAmount) { this.refundAmount = refundAmount; }
    public String getRefundReference() { return refundReference; }
    public void setRefundReference(String refundReference) { this.refundReference = refundReference; }
    public OffsetDateTime getRequestedAt() { return requestedAt; }
    public OffsetDateTime getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(OffsetDateTime reviewedAt) { this.reviewedAt = reviewedAt; }
    public OffsetDateTime getReceivedAt() { return receivedAt; }
    public void setReceivedAt(OffsetDateTime receivedAt) { this.receivedAt = receivedAt; }
    public OffsetDateTime getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(OffsetDateTime resolvedAt) { this.resolvedAt = resolvedAt; }
    public OffsetDateTime getCancelledAt() { return cancelledAt; }
    public void setCancelledAt(OffsetDateTime cancelledAt) { this.cancelledAt = cancelledAt; }
    public List<PostSaleLine> getLines() { return lines; }
    public void addLine(PostSaleLine line) { line.setRequest(this); lines.add(line); }
}

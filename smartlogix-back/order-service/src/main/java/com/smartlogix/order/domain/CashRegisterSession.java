package com.smartlogix.order.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "cash_register_sessions")
public class CashRegisterSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String sessionNumber;

    @Column(nullable = false, length = 40)
    private String registerCode;

    @Column(nullable = false, length = 80)
    private String openedBy;

    @Column(length = 80)
    private String closedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CashRegisterStatus status = CashRegisterStatus.OPEN;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal openingAmount = BigDecimal.ZERO;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal cashSalesAmount = BigDecimal.ZERO;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal totalSalesAmount = BigDecimal.ZERO;

    @Column(nullable = false)
    private int saleCount;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal expectedCash = BigDecimal.ZERO;

    @Column(precision = 14, scale = 2)
    private BigDecimal declaredCash;

    @Column(precision = 14, scale = 2)
    private BigDecimal cashDifference;

    @Column(nullable = false)
    private OffsetDateTime openedAt;

    private OffsetDateTime closedAt;

    @PrePersist
    public void beforeInsert() {
        if (sessionNumber == null || sessionNumber.isBlank()) {
            sessionNumber = "CAJ-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        }
        if (openedAt == null) {
            openedAt = OffsetDateTime.now();
        }
        expectedCash = openingAmount.add(cashSalesAmount);
    }

    public void recordSale(BigDecimal total, BigDecimal cashAmount) {
        totalSalesAmount = totalSalesAmount.add(total);
        cashSalesAmount = cashSalesAmount.add(cashAmount);
        expectedCash = openingAmount.add(cashSalesAmount);
        saleCount++;
    }

    public void close(String username, BigDecimal declaredAmount) {
        status = CashRegisterStatus.CLOSED;
        closedBy = username;
        declaredCash = declaredAmount;
        cashDifference = declaredAmount.subtract(expectedCash);
        closedAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public String getSessionNumber() { return sessionNumber; }
    public String getRegisterCode() { return registerCode; }
    public void setRegisterCode(String registerCode) { this.registerCode = registerCode; }
    public String getOpenedBy() { return openedBy; }
    public void setOpenedBy(String openedBy) { this.openedBy = openedBy; }
    public String getClosedBy() { return closedBy; }
    public CashRegisterStatus getStatus() { return status; }
    public void setStatus(CashRegisterStatus status) { this.status = status; }
    public BigDecimal getOpeningAmount() { return openingAmount; }
    public void setOpeningAmount(BigDecimal openingAmount) { this.openingAmount = openingAmount; }
    public BigDecimal getCashSalesAmount() { return cashSalesAmount; }
    public BigDecimal getTotalSalesAmount() { return totalSalesAmount; }
    public int getSaleCount() { return saleCount; }
    public BigDecimal getExpectedCash() { return expectedCash; }
    public BigDecimal getDeclaredCash() { return declaredCash; }
    public BigDecimal getCashDifference() { return cashDifference; }
    public OffsetDateTime getOpenedAt() { return openedAt; }
    public OffsetDateTime getClosedAt() { return closedAt; }
}

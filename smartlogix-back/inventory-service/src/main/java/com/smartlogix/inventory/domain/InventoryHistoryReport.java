package com.smartlogix.inventory.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "inventory_history_reports")
public class InventoryHistoryReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String username;

    @Column(length = 120)
    private String productFilter;

    @Column(length = 30)
    private String movementTypeFilter;

    @Column(length = 50)
    private String actionFilter;

    @Column(length = 100)
    private String userFilter;

    private LocalDate startDate;

    private LocalDate endDate;

    private Integer minQuantity;

    private Integer maxQuantity;

    @Column(nullable = false)
    private Long totalMovements;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void setCreationDate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public Long getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getProductFilter() {
        return productFilter;
    }

    public void setProductFilter(String productFilter) {
        this.productFilter = productFilter;
    }

    public String getMovementTypeFilter() {
        return movementTypeFilter;
    }

    public void setMovementTypeFilter(String movementTypeFilter) {
        this.movementTypeFilter = movementTypeFilter;
    }

    public String getActionFilter() {
        return actionFilter;
    }

    public void setActionFilter(String actionFilter) {
        this.actionFilter = actionFilter;
    }

    public String getUserFilter() {
        return userFilter;
    }

    public void setUserFilter(String userFilter) {
        this.userFilter = userFilter;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public Integer getMinQuantity() {
        return minQuantity;
    }

    public void setMinQuantity(Integer minQuantity) {
        this.minQuantity = minQuantity;
    }

    public Integer getMaxQuantity() {
        return maxQuantity;
    }

    public void setMaxQuantity(Integer maxQuantity) {
        this.maxQuantity = maxQuantity;
    }

    public Long getTotalMovements() {
        return totalMovements;
    }

    public void setTotalMovements(Long totalMovements) {
        this.totalMovements = totalMovements;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}

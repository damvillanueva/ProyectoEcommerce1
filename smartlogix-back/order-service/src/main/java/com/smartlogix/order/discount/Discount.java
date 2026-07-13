package com.smartlogix.order.discount;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "discounts")
public class Discount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(nullable = false)
    private Integer percentage;

    @Column(nullable = false)
    private Boolean active = true;

    private LocalDate validFrom;

    private LocalDate validUntil;

    private Boolean onlyNewUsers = true;

    private Long assignedUserId;

    private Boolean used = false;

    private OffsetDateTime usedAt;

    private OffsetDateTime createdAt = OffsetDateTime.now();

    // ===== GETTERS =====

    public Long getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public Integer getPercentage() {
        return percentage;
    }

    public Boolean getActive() {
        return active;
    }

    public LocalDate getValidFrom() {
        return validFrom;
    }

    public LocalDate getValidUntil() {
        return validUntil;
    }

    public Boolean getOnlyNewUsers() {
        return onlyNewUsers;
    }

    public Long getAssignedUserId() {
        return assignedUserId;
    }

    public Boolean getUsed() {
        return used;
    }

    public OffsetDateTime getUsedAt() {
        return usedAt;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    // ===== SETTERS =====

    public void setId(Long id) {
        this.id = id;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public void setPercentage(Integer percentage) {
        this.percentage = percentage;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }

    public void setValidFrom(LocalDate validFrom) {
        this.validFrom = validFrom;
    }

    public void setValidUntil(LocalDate validUntil) {
        this.validUntil = validUntil;
    }

    public void setOnlyNewUsers(Boolean onlyNewUsers) {
        this.onlyNewUsers = onlyNewUsers;
    }

    public void setAssignedUserId(Long assignedUserId) {
        this.assignedUserId = assignedUserId;
    }

    public void setUsed(Boolean used) {
        this.used = used;
    }

    public void setUsedAt(OffsetDateTime usedAt) {
        this.usedAt = usedAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
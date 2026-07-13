package com.smartlogix.order.discount;

import java.time.LocalDate;

public class DiscountResponse {

    private Long id;
    private String code;
    private String name;
    private String description;
    private Integer percentage;
    private Boolean active;
    private LocalDate validFrom;
    private LocalDate validUntil;
    private Boolean onlyNewUsers;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Integer getPercentage() {
        return percentage;
    }

    public void setPercentage(Integer percentage) {
        this.percentage = percentage;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }

    public LocalDate getValidFrom() {
        return validFrom;
    }

    public void setValidFrom(LocalDate validFrom) {
        this.validFrom = validFrom;
    }

    public LocalDate getValidUntil() {
        return validUntil;
    }

    public void setValidUntil(LocalDate validUntil) {
        this.validUntil = validUntil;
    }

    public Boolean getOnlyNewUsers() {
        return onlyNewUsers;
    }

    public void setOnlyNewUsers(Boolean onlyNewUsers) {
        this.onlyNewUsers = onlyNewUsers;
    }
}
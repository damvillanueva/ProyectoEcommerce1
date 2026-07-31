package com.smartlogix.inventory.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(
        name = "supplier_products",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_supplier_products_supplier_item",
                columnNames = {"supplier_id", "inventory_item_id"}
        )
)
public class SupplierProduct {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "supplier_id", nullable = false)
    private Supplier supplier;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "inventory_item_id", nullable = false)
    private InventoryItem item;

    @Column(nullable = false, length = 60)
    private String supplierSku;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal unitCost;

    @Column(nullable = false)
    private int minimumOrderQuantity;

    @Column(nullable = false)
    private boolean preferred;

    @Column(nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    @PreUpdate
    void updateTimestamp() {
        updatedAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public Supplier getSupplier() { return supplier; }
    public void setSupplier(Supplier supplier) { this.supplier = supplier; }
    public InventoryItem getItem() { return item; }
    public void setItem(InventoryItem item) { this.item = item; }
    public String getSupplierSku() { return supplierSku; }
    public void setSupplierSku(String supplierSku) { this.supplierSku = supplierSku; }
    public BigDecimal getUnitCost() { return unitCost; }
    public void setUnitCost(BigDecimal unitCost) { this.unitCost = unitCost; }
    public int getMinimumOrderQuantity() { return minimumOrderQuantity; }
    public void setMinimumOrderQuantity(int minimumOrderQuantity) { this.minimumOrderQuantity = minimumOrderQuantity; }
    public boolean isPreferred() { return preferred; }
    public void setPreferred(boolean preferred) { this.preferred = preferred; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}

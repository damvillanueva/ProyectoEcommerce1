package com.smartlogix.inventory.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "inventory_items")
public class InventoryItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 60)
    private String sku;

    @Column(nullable = false, length = 120)
    private String productName;

    @Lob
    private String imageUrl;

    @Column(length = 80)
    private String category;

    @Column(length = 80)
    private String brand;

    @Column(length = 280)
    private String shortDescription;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal salePrice;

    @Column(precision = 14, scale = 2)
    private BigDecimal originalPrice;

    @Column(nullable = false)
    private boolean featured;

    @Column(nullable = false)
    private boolean fastShipping;

    @Column(nullable = false)
    private boolean freeShipping;

    @Column(nullable = false)
    private boolean storePickup = true;

    @Column(nullable = false, length = 40)
    private String warehouseCode;

    @Column(length = 20)
    private String locationZone;

    @Column(length = 20)
    private String locationAisle;

    @Column(nullable = false)
    private int locationRack;

    @Column(nullable = false)
    private int locationLevel;

    @Column(nullable = false)
    private int locationPosition;

    @Column(nullable = false)
    private int availableQuantity;

    @Column(nullable = false)
    private int reservedQuantity;

    @Column(nullable = false)
    private int reorderLevel;

    @Column(nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    @PreUpdate
    public void updateTimestamp() {
        this.updatedAt = OffsetDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public String getSku() {
        return sku;
    }

    public void setSku(String sku) {
        this.sku = sku;
    }

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }

    public String getShortDescription() { return shortDescription; }
    public void setShortDescription(String shortDescription) { this.shortDescription = shortDescription; }

    public BigDecimal getSalePrice() {
        return salePrice;
    }

    public void setSalePrice(BigDecimal salePrice) {
        this.salePrice = salePrice;
    }

    public BigDecimal getOriginalPrice() { return originalPrice; }
    public void setOriginalPrice(BigDecimal originalPrice) { this.originalPrice = originalPrice; }

    public boolean isFeatured() { return featured; }
    public void setFeatured(boolean featured) { this.featured = featured; }

    public boolean isFastShipping() { return fastShipping; }
    public void setFastShipping(boolean fastShipping) { this.fastShipping = fastShipping; }

    public boolean isFreeShipping() { return freeShipping; }
    public void setFreeShipping(boolean freeShipping) { this.freeShipping = freeShipping; }

    public boolean isStorePickup() { return storePickup; }
    public void setStorePickup(boolean storePickup) { this.storePickup = storePickup; }

    public String getWarehouseCode() {
        return warehouseCode;
    }

    public void setWarehouseCode(String warehouseCode) {this.warehouseCode = warehouseCode;}

    public String getLocationZone() {
        return locationZone;
    }

    public void setLocationZone(String locationZone) {
        this.locationZone = locationZone;
    }

    public String getLocationAisle() {
        return locationAisle;
    }

    public void setLocationAisle(String locationAisle) {
        this.locationAisle = locationAisle;
    }

    public int getLocationRack() {
        return locationRack;
    }

    public void setLocationRack(int locationRack) {
        this.locationRack = locationRack;
    }

    public int getLocationLevel() {
        return locationLevel;
    }

    public void setLocationLevel(int locationLevel) {
        this.locationLevel = locationLevel;
    }

    public int getLocationPosition() {
        return locationPosition;
    }

    public void setLocationPosition(int locationPosition) {
        this.locationPosition = locationPosition;
    }

    public int getAvailableQuantity() {return availableQuantity;}

    public void setAvailableQuantity(int availableQuantity) {
        this.availableQuantity = availableQuantity;
    }

    public int getReservedQuantity() {
        return reservedQuantity;
    }

    public void setReservedQuantity(int reservedQuantity) {
        this.reservedQuantity = reservedQuantity;
    }

    public int getReorderLevel() {
        return reorderLevel;
    }

    public void setReorderLevel(int reorderLevel) {
        this.reorderLevel = reorderLevel;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}

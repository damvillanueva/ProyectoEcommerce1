package com.smartlogix.inventory.domain;

import jakarta.persistence.Column;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "warehouses")
public class Warehouse {

    @Id
    @Column(length = 40)
    private String code;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, length = 80)
    private String city;

    @Column(nullable = false, length = 80)
    private String region;

    @Column(nullable = false, length = 220)
    private String address;

    @Column(nullable = false)
    private boolean active = true;

    @Column(nullable = false)
    private int dispatchPriority = 100;

    @Column(nullable = false)
    private int aisleCount = 6;

    @Column(nullable = false)
    private int rackCount = 8;

    @Column(nullable = false)
    private int levelCount = 4;

    @Column(nullable = false)
    private int positionsPerLevel = 12;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
            name = "warehouse_zones",
            joinColumns = @JoinColumn(name = "warehouse_code")
    )
    @OrderColumn(name = "zone_order")
    @Column(name = "zone_code", nullable = false, length = 20)
    private List<String> zoneCodes = new ArrayList<>();

    @Column(nullable = false)
    private OffsetDateTime createdAt;

    @Column(nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    void beforeInsert() {
        OffsetDateTime now = OffsetDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void beforeUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public int getDispatchPriority() { return dispatchPriority; }
    public void setDispatchPriority(int dispatchPriority) { this.dispatchPriority = dispatchPriority; }
    public int getAisleCount() { return aisleCount; }
    public void setAisleCount(int aisleCount) { this.aisleCount = aisleCount; }
    public int getRackCount() { return rackCount; }
    public void setRackCount(int rackCount) { this.rackCount = rackCount; }
    public int getLevelCount() { return levelCount; }
    public void setLevelCount(int levelCount) { this.levelCount = levelCount; }
    public int getPositionsPerLevel() { return positionsPerLevel; }
    public void setPositionsPerLevel(int positionsPerLevel) { this.positionsPerLevel = positionsPerLevel; }
    public List<String> getZoneCodes() { return zoneCodes; }
    public void setZoneCodes(List<String> zoneCodes) { this.zoneCodes = new ArrayList<>(zoneCodes); }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}

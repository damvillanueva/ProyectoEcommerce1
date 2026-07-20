package com.smartlogix.inventory.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.OffsetDateTime;

@Entity
@Table(
        name = "inventory_stocks",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_inventory_stocks_item_warehouse",
                        columnNames = {"inventory_item_id", "warehouse_code"}
                ),
                @UniqueConstraint(
                        name = "uk_inventory_stocks_warehouse_location",
                        columnNames = {
                                "warehouse_code", "location_zone", "location_aisle",
                                "location_rack", "location_level", "location_position"
                        }
                )
        },
        indexes = {
                @Index(name = "idx_inventory_stocks_item", columnList = "inventory_item_id"),
                @Index(name = "idx_inventory_stocks_warehouse", columnList = "warehouse_code")
        }
)
public class InventoryStock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "inventory_item_id", nullable = false)
    private InventoryItem item;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "warehouse_code", nullable = false)
    private Warehouse warehouse;

    @Column(nullable = false, length = 20)
    private String locationZone;

    @Column(nullable = false, length = 20)
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
    void updateTimestamp() {
        updatedAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public InventoryItem getItem() { return item; }
    public void setItem(InventoryItem item) { this.item = item; }
    public Warehouse getWarehouse() { return warehouse; }
    public void setWarehouse(Warehouse warehouse) { this.warehouse = warehouse; }
    public String getLocationZone() { return locationZone; }
    public void setLocationZone(String locationZone) { this.locationZone = locationZone; }
    public String getLocationAisle() { return locationAisle; }
    public void setLocationAisle(String locationAisle) { this.locationAisle = locationAisle; }
    public int getLocationRack() { return locationRack; }
    public void setLocationRack(int locationRack) { this.locationRack = locationRack; }
    public int getLocationLevel() { return locationLevel; }
    public void setLocationLevel(int locationLevel) { this.locationLevel = locationLevel; }
    public int getLocationPosition() { return locationPosition; }
    public void setLocationPosition(int locationPosition) { this.locationPosition = locationPosition; }
    public int getAvailableQuantity() { return availableQuantity; }
    public void setAvailableQuantity(int availableQuantity) { this.availableQuantity = availableQuantity; }
    public int getReservedQuantity() { return reservedQuantity; }
    public void setReservedQuantity(int reservedQuantity) { this.reservedQuantity = reservedQuantity; }
    public int getReorderLevel() { return reorderLevel; }
    public void setReorderLevel(int reorderLevel) { this.reorderLevel = reorderLevel; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}

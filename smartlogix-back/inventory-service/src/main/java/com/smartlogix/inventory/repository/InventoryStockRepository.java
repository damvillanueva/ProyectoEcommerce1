package com.smartlogix.inventory.repository;

import com.smartlogix.inventory.domain.InventoryStock;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InventoryStockRepository extends JpaRepository<InventoryStock, Long> {

    @Query("""
            select stock from InventoryStock stock
            join fetch stock.item item
            join fetch stock.warehouse warehouse
            where item.sku = :sku
            order by warehouse.dispatchPriority asc, warehouse.code asc
            """)
    List<InventoryStock> findBySkuOrderByDispatchPriority(@Param("sku") String sku);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select stock from InventoryStock stock
            join fetch stock.item item
            join fetch stock.warehouse warehouse
            where item.sku = :sku
            order by warehouse.dispatchPriority asc, warehouse.code asc
            """)
    List<InventoryStock> findBySkuForUpdate(@Param("sku") String sku);

    Optional<InventoryStock> findByItem_SkuAndWarehouse_Code(String sku, String warehouseCode);

    Optional<InventoryStock> findByWarehouse_CodeAndLocationZoneAndLocationAisleAndLocationRackAndLocationLevelAndLocationPosition(
            String warehouseCode,
            String locationZone,
            String locationAisle,
            int locationRack,
            int locationLevel,
            int locationPosition
    );

    List<InventoryStock> findByWarehouse_CodeOrderByItem_ProductNameAsc(String warehouseCode);

    long countByWarehouse_Code(String warehouseCode);
}

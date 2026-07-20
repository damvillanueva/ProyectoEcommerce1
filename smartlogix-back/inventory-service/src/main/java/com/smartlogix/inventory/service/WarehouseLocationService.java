package com.smartlogix.inventory.service;

import com.smartlogix.inventory.domain.InventoryStock;
import com.smartlogix.inventory.domain.Warehouse;
import com.smartlogix.inventory.dto.WarehouseLocationSuggestionResponse;
import com.smartlogix.inventory.exception.InventoryOperationException;
import com.smartlogix.inventory.repository.InventoryStockRepository;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class WarehouseLocationService {

    private final InventoryStockRepository stockRepository;
    private final WarehouseService warehouseService;

    public WarehouseLocationService(
            InventoryStockRepository stockRepository,
            WarehouseService warehouseService
    ) {
        this.stockRepository = stockRepository;
        this.warehouseService = warehouseService;
    }

    public WarehouseLocationSuggestionResponse suggest(String warehouseCode, String preferredZone) {
        Warehouse warehouse = warehouseService.loadActiveWarehouse(warehouseCode);
        List<String> zones = prioritizeZones(warehouse, preferredZone);
        List<InventoryStock> stocks = stockRepository
                .findByWarehouse_CodeOrderByItem_ProductNameAsc(warehouse.getCode());
        Set<LocationKey> occupied = new HashSet<>();
        for (InventoryStock stock : stocks) occupied.add(key(stock));

        for (String zone : zones) {
            for (int aisleIndex = 0; aisleIndex < warehouse.getAisleCount(); aisleIndex++) {
                String aisle = String.valueOf((char) ('A' + aisleIndex));
                for (int rack = 1; rack <= warehouse.getRackCount(); rack++) {
                    for (int level = 1; level <= warehouse.getLevelCount(); level++) {
                        for (int position = 1; position <= warehouse.getPositionsPerLevel(); position++) {
                            LocationKey candidate = new LocationKey(zone, aisle, rack, level, position);
                            if (!occupied.contains(candidate)) {
                                long capacity = capacity(warehouse);
                                return new WarehouseLocationSuggestionResponse(
                                        warehouse.getCode(),
                                        zone,
                                        aisle,
                                        rack,
                                        level,
                                        position,
                                        locationCode(warehouse.getCode(), candidate),
                                        occupied.size(),
                                        capacity - occupied.size(),
                                        capacity
                                );
                            }
                        }
                    }
                }
            }
        }

        throw new InventoryOperationException("La bodega " + warehouse.getCode() + " no tiene ubicaciones libres.");
    }

    public void validateAvailable(
            Warehouse warehouse,
            String zone,
            String aisle,
            int rack,
            int level,
            int position,
            Long excludedStockId
    ) {
        String normalizedZone = normalize(zone);
        String normalizedAisle = normalize(aisle);
        if (!warehouse.getZoneCodes().contains(normalizedZone)) {
            throw new InventoryOperationException(
                    "La zona " + normalizedZone + " no esta habilitada en " + warehouse.getCode() + "."
            );
        }
        warehouseService.validateLocation(warehouse, normalizedAisle, rack, level, position);
        stockRepository
                .findByWarehouse_CodeAndLocationZoneAndLocationAisleAndLocationRackAndLocationLevelAndLocationPosition(
                        warehouse.getCode(), normalizedZone, normalizedAisle, rack, level, position
                )
                .filter(stock -> excludedStockId == null || !excludedStockId.equals(stock.getId()))
                .ifPresent(stock -> {
                    throw new InventoryOperationException(
                            "La ubicacion " + locationCode(warehouse.getCode(), key(stock))
                                    + " ya esta ocupada por " + stock.getItem().getSku() + "."
                    );
                });
    }

    private List<String> prioritizeZones(Warehouse warehouse, String preferredZone) {
        List<String> zones = new ArrayList<>(warehouse.getZoneCodes());
        if (zones.isEmpty()) {
            throw new InventoryOperationException("La bodega " + warehouse.getCode() + " no tiene zonas configuradas.");
        }
        if (preferredZone == null || preferredZone.isBlank()) return zones;

        String normalizedPreferred = normalize(preferredZone);
        if (!zones.remove(normalizedPreferred)) {
            throw new InventoryOperationException(
                    "La zona " + normalizedPreferred + " no esta habilitada en " + warehouse.getCode() + "."
            );
        }
        zones.add(0, normalizedPreferred);
        return zones;
    }

    private long capacity(Warehouse warehouse) {
        return (long) warehouse.getZoneCodes().size()
                * warehouse.getAisleCount()
                * warehouse.getRackCount()
                * warehouse.getLevelCount()
                * warehouse.getPositionsPerLevel();
    }

    private LocationKey key(InventoryStock stock) {
        return new LocationKey(
                normalize(stock.getLocationZone()),
                normalize(stock.getLocationAisle()),
                stock.getLocationRack(),
                stock.getLocationLevel(),
                stock.getLocationPosition()
        );
    }

    private String locationCode(String warehouseCode, LocationKey location) {
        return warehouseCode + "-" + location.zone() + location.aisle()
                + "-R" + location.rack() + "-N" + location.level() + "-P" + location.position();
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private record LocationKey(String zone, String aisle, int rack, int level, int position) {
    }
}

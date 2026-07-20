package com.smartlogix.inventory.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.smartlogix.inventory.domain.InventoryItem;
import com.smartlogix.inventory.domain.InventoryStock;
import com.smartlogix.inventory.domain.Warehouse;
import com.smartlogix.inventory.dto.WarehouseLocationSuggestionResponse;
import com.smartlogix.inventory.exception.InventoryOperationException;
import com.smartlogix.inventory.repository.InventoryStockRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class WarehouseLocationServiceTest {

    @Mock
    private InventoryStockRepository stockRepository;

    @Mock
    private WarehouseService warehouseService;

    private WarehouseLocationService locationService;

    @BeforeEach
    void setUp() {
        locationService = new WarehouseLocationService(stockRepository, warehouseService);
    }

    @Test
    void suggestionSkipsOccupiedLocationInsidePreferredZone() {
        Warehouse warehouse = warehouse();
        InventoryStock occupied = stock(warehouse, "SKU-100", "P", "A", 1, 1, 1);
        when(warehouseService.loadActiveWarehouse("WH-SCL-01")).thenReturn(warehouse);
        when(stockRepository.findByWarehouse_CodeOrderByItem_ProductNameAsc("WH-SCL-01"))
                .thenReturn(List.of(occupied));

        WarehouseLocationSuggestionResponse suggestion = locationService.suggest("WH-SCL-01", "p");

        assertThat(suggestion.code()).isEqualTo("WH-SCL-01-PA-R1-N1-P2");
        assertThat(suggestion.occupiedLocations()).isEqualTo(1);
        assertThat(suggestion.availableLocations()).isEqualTo(3);
    }

    @Test
    void validationRejectsLocationOccupiedByAnotherSku() {
        Warehouse warehouse = warehouse();
        InventoryStock occupied = stock(warehouse, "SKU-200", "P", "A", 1, 1, 1);
        when(stockRepository
                .findByWarehouse_CodeAndLocationZoneAndLocationAisleAndLocationRackAndLocationLevelAndLocationPosition(
                        "WH-SCL-01", "P", "A", 1, 1, 1
                ))
                .thenReturn(Optional.of(occupied));

        assertThatThrownBy(() -> locationService.validateAvailable(
                warehouse, "p", "a", 1, 1, 1, null
        )).isInstanceOf(InventoryOperationException.class)
                .hasMessageContaining("SKU-200");
    }

    @Test
    void suggestionRejectsZoneNotConfiguredInWarehouse() {
        Warehouse warehouse = warehouse();
        when(warehouseService.loadActiveWarehouse("WH-SCL-01")).thenReturn(warehouse);

        assertThatThrownBy(() -> locationService.suggest("WH-SCL-01", "Z"))
                .isInstanceOf(InventoryOperationException.class)
                .hasMessageContaining("no esta habilitada");
    }

    private Warehouse warehouse() {
        Warehouse warehouse = new Warehouse();
        warehouse.setCode("WH-SCL-01");
        warehouse.setName("Bodega Santiago");
        warehouse.setCity("Santiago");
        warehouse.setActive(true);
        warehouse.setAisleCount(1);
        warehouse.setRackCount(1);
        warehouse.setLevelCount(1);
        warehouse.setPositionsPerLevel(2);
        warehouse.setZoneCodes(List.of("P", "G"));
        return warehouse;
    }

    private InventoryStock stock(
            Warehouse warehouse,
            String sku,
            String zone,
            String aisle,
            int rack,
            int level,
            int position
    ) {
        InventoryItem item = new InventoryItem();
        item.setSku(sku);
        item.setProductName(sku);
        InventoryStock stock = new InventoryStock();
        stock.setItem(item);
        stock.setWarehouse(warehouse);
        stock.setLocationZone(zone);
        stock.setLocationAisle(aisle);
        stock.setLocationRack(rack);
        stock.setLocationLevel(level);
        stock.setLocationPosition(position);
        return stock;
    }
}

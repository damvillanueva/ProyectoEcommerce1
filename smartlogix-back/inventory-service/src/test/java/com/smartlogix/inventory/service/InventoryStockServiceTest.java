package com.smartlogix.inventory.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.smartlogix.inventory.domain.InventoryItem;
import com.smartlogix.inventory.domain.InventoryStock;
import com.smartlogix.inventory.domain.Warehouse;
import com.smartlogix.inventory.dto.UpsertInventoryStockRequest;
import com.smartlogix.inventory.exception.InventoryOperationException;
import com.smartlogix.inventory.repository.InventoryItemRepository;
import com.smartlogix.inventory.repository.InventoryStockRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class InventoryStockServiceTest {

    @Mock
    private InventoryStockRepository stockRepository;

    @Mock
    private InventoryItemRepository itemRepository;

    @Mock
    private WarehouseService warehouseService;

    @Mock
    private WarehouseLocationService locationService;

    private InventoryStockService stockService;

    @BeforeEach
    void setUp() {
        stockService = new InventoryStockService(
                stockRepository, itemRepository, warehouseService, locationService
        );
    }

    @Test
    void upsertUpdatesAvailableWithoutChangingReservedUnits() {
        InventoryItem item = item("SKU-100");
        Warehouse warehouse = warehouse("WH-SCL-01", 10);
        InventoryStock stock = stock(item, warehouse, 8, 3);
        when(warehouseService.loadActiveWarehouse("WH-SCL-01")).thenReturn(warehouse);
        when(stockRepository.findByItem_SkuAndWarehouse_Code("SKU-100", "WH-SCL-01"))
                .thenReturn(Optional.of(stock));
        when(stockRepository.saveAndFlush(stock)).thenReturn(stock);
        when(stockRepository.findBySkuOrderByDispatchPriority("SKU-100")).thenReturn(List.of(stock));

        InventoryStock saved = stockService.upsertStock(
                item,
                "wh-scl-01",
                new UpsertInventoryStockRequest("P", "B", 2, 2, 4, 14, 5)
        );

        assertThat(saved.getAvailableQuantity()).isEqualTo(14);
        assertThat(saved.getReservedQuantity()).isEqualTo(3);
        assertThat(item.getAvailableQuantity()).isEqualTo(14);
        assertThat(item.getReservedQuantity()).isEqualTo(3);
        assertThat(item.getWarehouseCode()).isEqualTo("WH-SCL-01");
        verify(itemRepository).save(item);
    }

    @Test
    void deleteRejectsStockWithReservations() {
        InventoryItem item = item("SKU-100");
        InventoryStock reserved = stock(item, warehouse("WH-SCL-01", 10), 4, 2);
        InventoryStock alternative = stock(item, warehouse("WH-CON-03", 20), 7, 0);
        when(stockRepository.findBySkuForUpdate("SKU-100"))
                .thenReturn(new java.util.ArrayList<>(List.of(reserved, alternative)));

        assertThatThrownBy(() -> stockService.deleteStock(item, "WH-SCL-01"))
                .isInstanceOf(InventoryOperationException.class)
                .hasMessageContaining("reservadas");

        verify(stockRepository, never()).delete(any(InventoryStock.class));
    }

    @Test
    void deleteRejectsRemovingTheOnlyWarehouseStock() {
        InventoryItem item = item("SKU-100");
        InventoryStock only = stock(item, warehouse("WH-SCL-01", 10), 4, 0);
        when(stockRepository.findBySkuForUpdate("SKU-100"))
                .thenReturn(new java.util.ArrayList<>(List.of(only)));

        assertThatThrownBy(() -> stockService.deleteStock(item, "WH-SCL-01"))
                .isInstanceOf(InventoryOperationException.class)
                .hasMessageContaining("al menos una");
    }

    private InventoryItem item(String sku) {
        InventoryItem item = new InventoryItem();
        item.setSku(sku);
        item.setProductName("Mouse");
        item.setCategory("Perifericos");
        return item;
    }

    private Warehouse warehouse(String code, int priority) {
        Warehouse warehouse = new Warehouse();
        warehouse.setCode(code);
        warehouse.setName(code);
        warehouse.setCity("Santiago");
        warehouse.setActive(true);
        warehouse.setDispatchPriority(priority);
        warehouse.setAisleCount(6);
        warehouse.setRackCount(8);
        warehouse.setLevelCount(4);
        warehouse.setPositionsPerLevel(12);
        return warehouse;
    }

    private InventoryStock stock(
            InventoryItem item,
            Warehouse warehouse,
            int available,
            int reserved
    ) {
        InventoryStock stock = new InventoryStock();
        stock.setItem(item);
        stock.setWarehouse(warehouse);
        stock.setLocationZone("P");
        stock.setLocationAisle("A");
        stock.setLocationRack(1);
        stock.setLocationLevel(1);
        stock.setLocationPosition(1);
        stock.setAvailableQuantity(available);
        stock.setReservedQuantity(reserved);
        stock.setReorderLevel(2);
        return stock;
    }
}

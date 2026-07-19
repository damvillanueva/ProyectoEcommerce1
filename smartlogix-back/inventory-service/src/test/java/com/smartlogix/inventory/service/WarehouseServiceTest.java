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
import com.smartlogix.inventory.dto.CreateWarehouseRequest;
import com.smartlogix.inventory.dto.UpdateWarehouseRequest;
import com.smartlogix.inventory.dto.WarehouseResponse;
import com.smartlogix.inventory.exception.InventoryOperationException;
import com.smartlogix.inventory.repository.InventoryStockRepository;
import com.smartlogix.inventory.repository.WarehouseRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class WarehouseServiceTest {

    @Mock
    private WarehouseRepository warehouseRepository;

    @Mock
    private InventoryStockRepository stockRepository;

    @Mock
    private InventoryAuditLogService auditLogService;

    private WarehouseService warehouseService;

    @BeforeEach
    void setUp() {
        warehouseService = new WarehouseService(warehouseRepository, stockRepository, auditLogService);
    }

    @Test
    void createNormalizesCodeAndUsesDefaultLayout() {
        when(warehouseRepository.existsById("WH-TEM-05")).thenReturn(false);
        when(warehouseRepository.save(any(Warehouse.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(stockRepository.findByWarehouse_CodeOrderByItem_ProductNameAsc("WH-TEM-05"))
                .thenReturn(List.of());

        WarehouseResponse response = warehouseService.create(new CreateWarehouseRequest(
                " wh-tem-05 ",
                "Bodega Temuco",
                "Temuco",
                "La Araucania",
                "Av. Demo 123",
                null,
                null,
                null,
                null,
                null,
                null
        ));

        assertThat(response.code()).isEqualTo("WH-TEM-05");
        assertThat(response.active()).isTrue();
        assertThat(response.aisleCount()).isEqualTo(6);
        assertThat(response.rackCount()).isEqualTo(8);
        verify(auditLogService).record(
                "CREATE_WAREHOUSE", "WH-TEM-05", "Bodega Temuco", "Bodega creada"
        );
    }

    @Test
    void deleteRejectsWarehouseWithProducts() {
        Warehouse warehouse = warehouse("WH-SCL-01", true);
        when(warehouseRepository.findById("WH-SCL-01")).thenReturn(Optional.of(warehouse));
        when(stockRepository.countByWarehouse_Code("WH-SCL-01")).thenReturn(3L);

        assertThatThrownBy(() -> warehouseService.delete("WH-SCL-01"))
                .isInstanceOf(InventoryOperationException.class)
                .hasMessageContaining("productos");

        verify(warehouseRepository, never()).delete(any(Warehouse.class));
    }

    @Test
    void updateRejectsLayoutThatLeavesProductOutside() {
        Warehouse warehouse = warehouse("WH-SCL-01", true);
        InventoryItem item = new InventoryItem();
        item.setSku("SKU-1001");
        item.setProductName("Teclado");
        item.setLocationAisle("F");
        item.setLocationRack(8);
        item.setLocationLevel(4);
        item.setLocationPosition(12);
        InventoryStock stock = new InventoryStock();
        stock.setItem(item);
        stock.setWarehouse(warehouse);
        stock.setLocationAisle("F");
        stock.setLocationRack(8);
        stock.setLocationLevel(4);
        stock.setLocationPosition(12);
        when(warehouseRepository.findById("WH-SCL-01")).thenReturn(Optional.of(warehouse));
        when(stockRepository.findByWarehouse_CodeOrderByItem_ProductNameAsc("WH-SCL-01"))
                .thenReturn(List.of(stock));

        UpdateWarehouseRequest request = new UpdateWarehouseRequest(
                "Bodega Santiago",
                "Santiago",
                "Region Metropolitana",
                "Av. Demo 123",
                true,
                10,
                5,
                7,
                3,
                10
        );

        assertThatThrownBy(() -> warehouseService.update("WH-SCL-01", request))
                .isInstanceOf(InventoryOperationException.class)
                .hasMessageContaining("SKU-1001");
    }

    @Test
    void inactiveWarehouseCannotReceiveInventory() {
        Warehouse warehouse = warehouse("WH-SCL-01", false);
        when(warehouseRepository.findById("WH-SCL-01")).thenReturn(Optional.of(warehouse));

        assertThatThrownBy(() -> warehouseService.loadActiveWarehouse("wh-scl-01"))
                .isInstanceOf(InventoryOperationException.class)
                .hasMessageContaining("desactivada");
    }

    private Warehouse warehouse(String code, boolean active) {
        Warehouse warehouse = new Warehouse();
        warehouse.setCode(code);
        warehouse.setName("Bodega");
        warehouse.setCity("Santiago");
        warehouse.setRegion("Region Metropolitana");
        warehouse.setAddress("Av. Demo 123");
        warehouse.setActive(active);
        warehouse.setDispatchPriority(10);
        warehouse.setAisleCount(6);
        warehouse.setRackCount(8);
        warehouse.setLevelCount(4);
        warehouse.setPositionsPerLevel(12);
        return warehouse;
    }
}

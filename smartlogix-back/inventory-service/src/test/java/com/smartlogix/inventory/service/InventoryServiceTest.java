package com.smartlogix.inventory.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.smartlogix.inventory.domain.InventoryItem;
import com.smartlogix.inventory.domain.InventoryStock;
import com.smartlogix.inventory.domain.Warehouse;
import com.smartlogix.inventory.dto.CreateInventoryItemRequest;
import com.smartlogix.inventory.dto.InventoryAvailabilityResponse;
import com.smartlogix.inventory.dto.InventoryBatchLineRequest;
import com.smartlogix.inventory.dto.InventoryItemResponse;
import com.smartlogix.inventory.dto.RestockInventoryLineRequest;
import com.smartlogix.inventory.exception.InventoryOperationException;
import com.smartlogix.inventory.repository.InventoryItemRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class InventoryServiceTest {

    @Mock
    private InventoryItemRepository repository;

    @Mock
    private InventoryMovementService movementService;

    @Mock
    private InventoryAuditLogService auditLogService;

    @Mock
    private InventoryStockService stockService;

    @InjectMocks
    private InventoryService inventoryService;

    @Test
    void reserveSplitsQuantityAcrossActiveWarehousesByPriority() {
        InventoryItem item = item("SKU-100");
        InventoryStock first = stock(item, warehouse("WH-SCL-01", true, 10), 3, 0);
        InventoryStock second = stock(item, warehouse("WH-CON-03", true, 20), 6, 0);
        List<InventoryStock> stocks = List.of(first, second);

        when(repository.findBySku("SKU-100")).thenReturn(Optional.of(item));
        when(stockService.findStocksForUpdate("SKU-100")).thenReturn(stocks);
        when(stockService.findStocks(item)).thenReturn(stocks);
        when(stockService.toResponses(stocks)).thenReturn(List.of());
        doAnswer(invocation -> {
            item.setAvailableQuantity(first.getAvailableQuantity() + second.getAvailableQuantity());
            item.setReservedQuantity(first.getReservedQuantity() + second.getReservedQuantity());
            return null;
        }).when(stockService).saveAndSynchronize(item, stocks);

        InventoryItemResponse response = inventoryService.reserve("sku-100", 7);

        assertThat(first.getAvailableQuantity()).isZero();
        assertThat(first.getReservedQuantity()).isEqualTo(3);
        assertThat(second.getAvailableQuantity()).isEqualTo(2);
        assertThat(second.getReservedQuantity()).isEqualTo(4);
        assertThat(response.availableQuantity()).isEqualTo(2);
        assertThat(response.reservedQuantity()).isEqualTo(7);
        verify(stockService).saveAndSynchronize(item, stocks);
    }

    @Test
    void dispatchBatchConsumesAllRequestedReservations() {
        InventoryItem item = item("SKU-POS-1");
        InventoryStock stock = stock(item, warehouse("WH-SCL-01", true, 10), 5, 2);
        List<InventoryStock> stocks = List.of(stock);

        when(repository.findBySku("SKU-POS-1")).thenReturn(Optional.of(item));
        when(stockService.findStocksForUpdate("SKU-POS-1")).thenReturn(stocks);
        when(stockService.findStocks(item)).thenReturn(stocks);
        when(stockService.toResponses(stocks)).thenReturn(List.of());
        doAnswer(invocation -> {
            item.setAvailableQuantity(stock.getAvailableQuantity());
            item.setReservedQuantity(stock.getReservedQuantity());
            return null;
        }).when(stockService).saveAndSynchronize(item, stocks);

        List<InventoryItemResponse> response = inventoryService.dispatchBatch(
                List.of(new InventoryBatchLineRequest("sku-pos-1", 2))
        );

        assertThat(stock.getAvailableQuantity()).isEqualTo(5);
        assertThat(stock.getReservedQuantity()).isZero();
        assertThat(response).singleElement()
                .satisfies(value -> assertThat(value.reservedQuantity()).isZero());
    }

    @Test
    void customerReturnBatchRestoresAvailableStockInReceivingWarehouse() {
        InventoryItem item = item("SKU-RET-1");
        InventoryStock stock = stock(item, warehouse("WH-SCL-01", true, 10), 4, 0);
        List<InventoryStock> stocks = List.of(stock);

        when(repository.findBySku("SKU-RET-1")).thenReturn(Optional.of(item));
        when(stockService.findStocksForUpdate("SKU-RET-1")).thenReturn(stocks);
        when(stockService.resolveStock(stocks, "WH-SCL-01")).thenReturn(stock);
        when(stockService.findStocks(item)).thenReturn(stocks);
        when(stockService.toResponses(stocks)).thenReturn(List.of());
        doAnswer(invocation -> {
            item.setAvailableQuantity(stock.getAvailableQuantity());
            return null;
        }).when(stockService).saveAndSynchronize(item, stocks);

        List<InventoryItemResponse> response = inventoryService.restockBatch(
                "WH-SCL-01",
                "PSD-TEST-1",
                List.of(new RestockInventoryLineRequest("sku-ret-1", 2))
        );

        assertThat(stock.getAvailableQuantity()).isEqualTo(6);
        assertThat(response).singleElement()
                .satisfies(value -> assertThat(value.availableQuantity()).isEqualTo(6));
        verify(stockService).saveAndSynchronize(item, stocks);
    }

    @Test
    void availabilityOnlyCountsActiveWarehouses() {
        InventoryItem item = item("SKU-100");
        List<InventoryStock> stocks = List.of(
                stock(item, warehouse("WH-SCL-01", true, 10), 4, 0),
                stock(item, warehouse("WH-CON-03", false, 20), 20, 0)
        );
        when(repository.findBySku("SKU-100")).thenReturn(Optional.of(item));
        when(stockService.findStocks(item)).thenReturn(stocks);

        InventoryAvailabilityResponse response = inventoryService.checkAvailability("SKU-100", 5);

        assertThat(response.availableQuantity()).isEqualTo(4);
        assertThat(response.available()).isFalse();
    }

    @Test
    void createItemNormalizesSkuBeforeCheckingDuplicates() {
        when(repository.existsBySku("SKU-ABC")).thenReturn(true);

        CreateInventoryItemRequest request = new CreateInventoryItemRequest(
                " sku-abc ",
                "Teclado",
                null,
                "Perifericos",
                null,
                null,
                BigDecimal.valueOf(29990),
                null,
                null,
                null,
                null,
                null,
                "WH-SCL-01",
                null,
                null,
                null,
                null,
                null,
                12,
                3
        );

        assertThrows(InventoryOperationException.class, () -> inventoryService.createItem(request));

        verify(repository, never()).save(any(InventoryItem.class));
    }

    private InventoryItem item(String sku) {
        InventoryItem item = new InventoryItem();
        item.setSku(sku);
        item.setProductName("Mouse");
        item.setCategory("Perifericos");
        item.setBrand("SmartLogix");
        item.setShortDescription("Mouse de prueba");
        item.setSalePrice(BigDecimal.valueOf(12990));
        item.setOriginalPrice(BigDecimal.valueOf(14990));
        return item;
    }

    private Warehouse warehouse(String code, boolean active, int priority) {
        Warehouse warehouse = new Warehouse();
        warehouse.setCode(code);
        warehouse.setName(code);
        warehouse.setCity("Santiago");
        warehouse.setActive(active);
        warehouse.setDispatchPriority(priority);
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

package com.smartlogix.inventory.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.smartlogix.inventory.domain.ActionType;
import com.smartlogix.inventory.domain.InventoryItem;
import com.smartlogix.inventory.domain.InventoryStock;
import com.smartlogix.inventory.domain.MovementType;
import com.smartlogix.inventory.domain.Warehouse;
import com.smartlogix.inventory.dto.InventoryMovementResponse;
import com.smartlogix.inventory.dto.InventoryTransferResponse;
import com.smartlogix.inventory.dto.TransferInventoryStockRequest;
import com.smartlogix.inventory.exception.InventoryOperationException;
import com.smartlogix.inventory.repository.InventoryItemRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class InventoryTransferServiceTest {

    @Mock
    private InventoryItemRepository itemRepository;

    @Mock
    private InventoryStockService stockService;

    @Mock
    private InventoryMovementService movementService;

    @Mock
    private InventoryAuditLogService auditLogService;

    private InventoryTransferService transferService;

    @BeforeEach
    void setUp() {
        transferService = new InventoryTransferService(
                itemRepository,
                stockService,
                movementService,
                auditLogService
        );
    }

    @Test
    void transferMovesOnlyAvailableStockAndLinksBothMovements() {
        InventoryItem item = item();
        InventoryStock source = stock(item, warehouse("WH-SCL-01"), 10, 3);
        InventoryStock destination = stock(item, warehouse("WH-CON-03"), 4, 1);
        TransferInventoryStockRequest request = request("WH-SCL-01", "WH-CON-03", 6);

        when(itemRepository.findBySku("SKU-100")).thenReturn(Optional.of(item));
        when(stockService.findStocksForUpdate("SKU-100")).thenReturn(List.of(source, destination));
        when(stockService.resolveStock(anyList(), eq("WH-SCL-01"))).thenReturn(source);
        when(movementService.recordMovement(
                eq(item), eq("WH-SCL-01"), eq(MovementType.EXIT), eq(ActionType.TRANSFER_OUT),
                eq(6), eq(10), eq(4), eq("Traslado a WH-CON-03: Reposicion tienda"),
                org.mockito.ArgumentMatchers.anyString()
        )).thenAnswer(invocation -> movement(
                1L, "EXIT", "TRANSFER_OUT", "WH-SCL-01", invocation.getArgument(8, String.class)
        ));
        when(movementService.recordMovement(
                eq(item), eq("WH-CON-03"), eq(MovementType.ENTRY), eq(ActionType.TRANSFER_IN),
                eq(6), eq(4), eq(10), eq("Traslado desde WH-SCL-01: Reposicion tienda"),
                org.mockito.ArgumentMatchers.anyString()
        )).thenAnswer(invocation -> movement(
                2L, "ENTRY", "TRANSFER_IN", "WH-CON-03", invocation.getArgument(8, String.class)
        ));

        InventoryTransferResponse response = transferService.transfer("sku-100", request);

        assertThat(source.getAvailableQuantity()).isEqualTo(4);
        assertThat(source.getReservedQuantity()).isEqualTo(3);
        assertThat(destination.getAvailableQuantity()).isEqualTo(10);
        assertThat(destination.getReservedQuantity()).isEqualTo(1);
        assertThat(response.reference()).startsWith("TRF-");
        assertThat(response.sourceMovement().transferReference()).isEqualTo(response.reference());
        assertThat(response.destinationMovement().transferReference()).isEqualTo(response.reference());
        verify(stockService).saveAndSynchronize(eq(item), anyList());
        verify(auditLogService).record(
                eq("TRANSFER_STOCK"),
                eq("SKU-100"),
                eq("Teclado"),
                org.mockito.ArgumentMatchers.contains(response.reference())
        );
    }

    @Test
    void transferRejectsQuantityGreaterThanSourceAvailableStock() {
        InventoryItem item = item();
        InventoryStock source = stock(item, warehouse("WH-SCL-01"), 3, 7);
        InventoryStock destination = stock(item, warehouse("WH-CON-03"), 2, 0);

        when(itemRepository.findBySku("SKU-100")).thenReturn(Optional.of(item));
        when(stockService.findStocksForUpdate("SKU-100")).thenReturn(List.of(source, destination));
        when(stockService.resolveStock(anyList(), eq("WH-SCL-01"))).thenReturn(source);

        assertThatThrownBy(() -> transferService.transfer(
                "SKU-100",
                request("WH-SCL-01", "WH-CON-03", 4)
        )).isInstanceOf(InventoryOperationException.class)
                .hasMessageContaining("Disponible: 3");

        verify(stockService, never()).saveAndSynchronize(eq(item), anyList());
    }

    @Test
    void transferCreatesDestinationStockWhenSkuIsNotAssignedThere() {
        InventoryItem item = item();
        InventoryStock source = stock(item, warehouse("WH-SCL-01"), 8, 0);
        InventoryStock destination = stock(item, warehouse("WH-VAP-02"), 0, 0);
        TransferInventoryStockRequest request = new TransferInventoryStockRequest(
                "WH-SCL-01", "WH-VAP-02", 2, null,
                "P", "B", 2, 2, 3, null
        );

        when(itemRepository.findBySku("SKU-100")).thenReturn(Optional.of(item));
        when(stockService.findStocksForUpdate("SKU-100")).thenReturn(List.of(source));
        when(stockService.resolveStock(anyList(), eq("WH-SCL-01"))).thenReturn(source);
        when(stockService.createTransferDestination(
                item, "WH-VAP-02", "P", "B", 2, 2, 3, source.getReorderLevel()
        )).thenReturn(destination);

        InventoryTransferResponse response = transferService.transfer("SKU-100", request);

        assertThat(source.getAvailableQuantity()).isEqualTo(6);
        assertThat(destination.getAvailableQuantity()).isEqualTo(2);
        assertThat(response.destinationWarehouseCode()).isEqualTo("WH-VAP-02");
        verify(stockService).saveAndSynchronize(eq(item), anyList());
    }

    @Test
    void transferRejectsUsingTheSameWarehouseAsOriginAndDestination() {
        assertThatThrownBy(() -> transferService.transfer(
                "SKU-100",
                request("WH-SCL-01", "WH-SCL-01", 1)
        )).isInstanceOf(InventoryOperationException.class)
                .hasMessageContaining("diferentes");

        verify(itemRepository, never()).findBySku("SKU-100");
    }

    private TransferInventoryStockRequest request(String source, String destination, int quantity) {
        return new TransferInventoryStockRequest(
                source, destination, quantity, "Reposicion tienda",
                null, null, null, null, null, null
        );
    }

    private InventoryMovementResponse movement(
            long id,
            String movementType,
            String actionType,
            String warehouseCode,
            String reference
    ) {
        return new InventoryMovementResponse(
                id, 1L, "Teclado", "SKU-100", movementType, actionType,
                6, 10, 4, "bodeguero", "Traslado", warehouseCode,
                reference, LocalDateTime.now()
        );
    }

    private InventoryItem item() {
        InventoryItem item = new InventoryItem();
        item.setSku("SKU-100");
        item.setProductName("Teclado");
        item.setCategory("Perifericos");
        return item;
    }

    private Warehouse warehouse(String code) {
        Warehouse warehouse = new Warehouse();
        warehouse.setCode(code);
        warehouse.setName(code);
        warehouse.setCity("Santiago");
        warehouse.setActive(true);
        warehouse.setDispatchPriority(10);
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

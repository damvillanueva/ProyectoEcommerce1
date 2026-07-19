package com.smartlogix.inventory.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.smartlogix.inventory.domain.InventoryItem;
import com.smartlogix.inventory.dto.CreateInventoryItemRequest;
import com.smartlogix.inventory.dto.UpdateInventoryItemRequest;
import com.smartlogix.inventory.exception.InventoryOperationException;
import com.smartlogix.inventory.repository.InventoryItemRepository;
import java.util.Optional;
import java.math.BigDecimal;
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
    private WarehouseService warehouseService;

    @InjectMocks
    private InventoryService inventoryService;

    @Test
    void updateItemRejectsAvailableQuantityLowerThanReservedQuantity() {
        InventoryItem item = new InventoryItem();
        item.setSku("SKU-100");
        item.setProductName("Mouse");
        item.setWarehouseCode("WH-SCL-01");
        item.setAvailableQuantity(10);
        item.setReservedQuantity(4);
        item.setReorderLevel(2);

        when(repository.findBySku("SKU-100")).thenReturn(Optional.of(item));

        UpdateInventoryItemRequest request = new UpdateInventoryItemRequest(
                "Mouse",
                null,
                "Perifericos",
                null,
                null,
                BigDecimal.valueOf(12990),
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
                3,
                5,
                2
        );

        assertThrows(InventoryOperationException.class, () ->
                inventoryService.updateItem("SKU-100", request)
        );

        verify(repository, never()).save(item);
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

        assertThrows(InventoryOperationException.class, () ->
                inventoryService.createItem(request)
        );

        verify(repository, never()).save(any(InventoryItem.class));
    }
}

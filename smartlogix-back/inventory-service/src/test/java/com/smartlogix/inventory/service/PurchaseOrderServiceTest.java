package com.smartlogix.inventory.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.smartlogix.inventory.domain.ActionType;
import com.smartlogix.inventory.domain.InventoryItem;
import com.smartlogix.inventory.domain.InventoryStock;
import com.smartlogix.inventory.domain.MovementType;
import com.smartlogix.inventory.domain.PurchaseOrder;
import com.smartlogix.inventory.domain.PurchaseOrderLine;
import com.smartlogix.inventory.domain.PurchaseOrderStatus;
import com.smartlogix.inventory.domain.Supplier;
import com.smartlogix.inventory.domain.Warehouse;
import com.smartlogix.inventory.dto.ReceivePurchaseOrderLineRequest;
import com.smartlogix.inventory.dto.ReceivePurchaseOrderRequest;
import com.smartlogix.inventory.exception.InventoryOperationException;
import com.smartlogix.inventory.repository.InventoryItemRepository;
import com.smartlogix.inventory.repository.InventoryStockRepository;
import com.smartlogix.inventory.repository.PurchaseOrderRepository;
import com.smartlogix.inventory.repository.SupplierProductRepository;
import com.smartlogix.inventory.repository.SupplierRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class PurchaseOrderServiceTest {

    @Mock private PurchaseOrderRepository purchaseOrderRepository;
    @Mock private SupplierRepository supplierRepository;
    @Mock private SupplierProductRepository supplierProductRepository;
    @Mock private InventoryItemRepository itemRepository;
    @Mock private InventoryStockRepository stockRepository;
    @Mock private WarehouseService warehouseService;
    @Mock private InventoryStockService stockService;
    @Mock private InventoryMovementService movementService;

    private PurchaseOrderService purchaseOrderService;

    @BeforeEach
    void setUp() {
        purchaseOrderService = new PurchaseOrderService(
                purchaseOrderRepository,
                supplierRepository,
                supplierProductRepository,
                itemRepository,
                stockRepository,
                warehouseService,
                stockService,
                movementService
        );
    }

    @Test
    void receiveAddsWarehouseStockAndKeepsPartialStatus() {
        PurchaseOrder order = order(PurchaseOrderStatus.APPROVED, 10, 0);
        PurchaseOrderLine line = order.getLines().get(0);
        InventoryStock stock = new InventoryStock();
        stock.setItem(line.getItem());
        stock.setWarehouse(order.getWarehouse());
        stock.setAvailableQuantity(12);
        stock.setReservedQuantity(0);
        stock.setReorderLevel(3);
        List<InventoryStock> stocks = List.of(stock);
        when(purchaseOrderRepository.findById(1L)).thenReturn(Optional.of(order));
        when(stockService.findStocksForUpdate("SKU-1001")).thenReturn(stocks);
        when(stockService.resolveStock(stocks, "WH-SCL-01")).thenReturn(stock);
        when(purchaseOrderRepository.save(order)).thenReturn(order);

        var response = purchaseOrderService.receive(
                1L,
                new ReceivePurchaseOrderRequest(List.of(new ReceivePurchaseOrderLineRequest(11L, 4)))
        );

        assertThat(stock.getAvailableQuantity()).isEqualTo(16);
        assertThat(line.getReceivedQuantity()).isEqualTo(4);
        assertThat(response.status()).isEqualTo("PARTIALLY_RECEIVED");
        verify(stockService).saveAndSynchronize(line.getItem(), stocks);
        verify(movementService).recordMovement(
                eq(line.getItem()),
                eq("WH-SCL-01"),
                eq(MovementType.ENTRY),
                eq(ActionType.PURCHASE_RECEIPT),
                eq(4),
                eq(12),
                eq(16),
                eq("Recepcion de compra OC-TEST-001"),
                eq("OC-TEST-001")
        );
    }

    @Test
    void receiveRejectsQuantityAbovePendingUnits() {
        PurchaseOrder order = order(PurchaseOrderStatus.PARTIALLY_RECEIVED, 10, 8);
        when(purchaseOrderRepository.findById(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> purchaseOrderService.receive(
                1L,
                new ReceivePurchaseOrderRequest(List.of(new ReceivePurchaseOrderLineRequest(11L, 3)))
        ))
                .isInstanceOf(InventoryOperationException.class)
                .hasMessageContaining("2 unidades pendientes");
    }

    private PurchaseOrder order(PurchaseOrderStatus status, int ordered, int received) {
        Supplier supplier = new Supplier();
        ReflectionTestUtils.setField(supplier, "id", 7L);
        supplier.setCode("TECHDATA");
        supplier.setBusinessName("TechData Chile");

        Warehouse warehouse = new Warehouse();
        warehouse.setCode("WH-SCL-01");
        warehouse.setName("Bodega Santiago");

        InventoryItem item = new InventoryItem();
        ReflectionTestUtils.setField(item, "id", 9L);
        item.setSku("SKU-1001");
        item.setProductName("Teclado");

        PurchaseOrder order = new PurchaseOrder();
        ReflectionTestUtils.setField(order, "id", 1L);
        order.setOrderNumber("OC-TEST-001");
        order.setSupplier(supplier);
        order.setWarehouse(warehouse);
        order.setStatus(status);
        order.setExpectedAt(LocalDate.now().plusDays(2));
        order.setCreatedBy("admin");

        PurchaseOrderLine line = new PurchaseOrderLine();
        ReflectionTestUtils.setField(line, "id", 11L);
        line.setItem(item);
        line.setSupplierSku("TD-1001");
        line.setOrderedQuantity(ordered);
        line.setReceivedQuantity(received);
        line.setUnitCost(BigDecimal.valueOf(20000));
        order.addLine(line);
        return order;
    }
}

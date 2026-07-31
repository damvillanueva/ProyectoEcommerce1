package com.smartlogix.inventory.service;

import com.smartlogix.inventory.domain.ActionType;
import com.smartlogix.inventory.domain.InventoryItem;
import com.smartlogix.inventory.domain.InventoryStock;
import com.smartlogix.inventory.domain.MovementType;
import com.smartlogix.inventory.domain.PurchaseOrder;
import com.smartlogix.inventory.domain.PurchaseOrderLine;
import com.smartlogix.inventory.domain.PurchaseOrderStatus;
import com.smartlogix.inventory.domain.Supplier;
import com.smartlogix.inventory.domain.SupplierProduct;
import com.smartlogix.inventory.dto.CreatePurchaseOrderLineRequest;
import com.smartlogix.inventory.dto.CreatePurchaseOrderRequest;
import com.smartlogix.inventory.dto.PurchaseOrderLineResponse;
import com.smartlogix.inventory.dto.PurchaseOrderResponse;
import com.smartlogix.inventory.dto.ReceivePurchaseOrderLineRequest;
import com.smartlogix.inventory.dto.ReceivePurchaseOrderRequest;
import com.smartlogix.inventory.exception.InventoryNotFoundException;
import com.smartlogix.inventory.exception.InventoryOperationException;
import com.smartlogix.inventory.repository.InventoryItemRepository;
import com.smartlogix.inventory.repository.InventoryStockRepository;
import com.smartlogix.inventory.repository.PurchaseOrderRepository;
import com.smartlogix.inventory.repository.SupplierProductRepository;
import com.smartlogix.inventory.repository.SupplierRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class PurchaseOrderService {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final SupplierRepository supplierRepository;
    private final SupplierProductRepository supplierProductRepository;
    private final InventoryItemRepository itemRepository;
    private final InventoryStockRepository stockRepository;
    private final WarehouseService warehouseService;
    private final InventoryStockService stockService;
    private final InventoryMovementService movementService;

    public PurchaseOrderService(
            PurchaseOrderRepository purchaseOrderRepository,
            SupplierRepository supplierRepository,
            SupplierProductRepository supplierProductRepository,
            InventoryItemRepository itemRepository,
            InventoryStockRepository stockRepository,
            WarehouseService warehouseService,
            InventoryStockService stockService,
            InventoryMovementService movementService
    ) {
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.supplierRepository = supplierRepository;
        this.supplierProductRepository = supplierProductRepository;
        this.itemRepository = itemRepository;
        this.stockRepository = stockRepository;
        this.warehouseService = warehouseService;
        this.stockService = stockService;
        this.movementService = movementService;
    }

    @Transactional(readOnly = true)
    public List<PurchaseOrderResponse> findAll() {
        return purchaseOrderRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PurchaseOrderResponse findById(Long id) {
        return toResponse(loadOrder(id));
    }

    public PurchaseOrderResponse create(CreatePurchaseOrderRequest request) {
        Supplier supplier = supplierRepository.findById(request.supplierId())
                .orElseThrow(() -> new InventoryNotFoundException("No existe el proveedor solicitado."));
        if (!supplier.isActive()) {
            throw new InventoryOperationException("No se puede comprar a un proveedor inactivo.");
        }

        String warehouseCode = request.warehouseCode().trim().toUpperCase(Locale.ROOT);
        PurchaseOrder order = new PurchaseOrder();
        order.setOrderNumber(generateOrderNumber());
        order.setSupplier(supplier);
        order.setWarehouse(warehouseService.loadActiveWarehouse(warehouseCode));
        order.setExpectedAt(request.expectedAt());
        order.setNotes(normalizeOptional(request.notes()));
        order.setCreatedBy(resolveUsername());

        Set<String> uniqueSkus = new HashSet<>();
        for (CreatePurchaseOrderLineRequest requestedLine : request.lines()) {
            String sku = requestedLine.sku().trim().toUpperCase(Locale.ROOT);
            if (!uniqueSkus.add(sku)) {
                throw new InventoryOperationException("El SKU " + sku + " esta repetido en la orden.");
            }
            InventoryItem item = itemRepository.findBySku(sku)
                    .orElseThrow(() -> new InventoryNotFoundException("No existe inventario para SKU: " + sku));
            SupplierProduct supplierProduct = supplierProductRepository
                    .findBySupplier_IdAndItem_Sku(supplier.getId(), sku)
                    .orElseThrow(() -> new InventoryOperationException(
                            "El SKU " + sku + " no esta asociado al proveedor."
                    ));
            if (requestedLine.quantity() < supplierProduct.getMinimumOrderQuantity()) {
                throw new InventoryOperationException(
                        "El SKU " + sku + " exige un minimo de "
                                + supplierProduct.getMinimumOrderQuantity() + " unidades."
                );
            }
            if (stockRepository.findByItem_SkuAndWarehouse_Code(sku, warehouseCode).isEmpty()) {
                throw new InventoryOperationException(
                        "El SKU " + sku + " no tiene una ubicacion en la bodega " + warehouseCode + "."
                );
            }

            PurchaseOrderLine line = new PurchaseOrderLine();
            line.setItem(item);
            line.setSupplierSku(supplierProduct.getSupplierSku());
            line.setOrderedQuantity(requestedLine.quantity());
            line.setReceivedQuantity(0);
            line.setUnitCost(supplierProduct.getUnitCost());
            order.addLine(line);
        }

        return toResponse(purchaseOrderRepository.save(order));
    }

    public PurchaseOrderResponse approve(Long id) {
        PurchaseOrder order = loadOrder(id);
        requireStatus(order, PurchaseOrderStatus.DRAFT, "Solo se puede aprobar una orden en borrador.");
        order.setStatus(PurchaseOrderStatus.APPROVED);
        order.setApprovedBy(resolveUsername());
        order.setApprovedAt(OffsetDateTime.now());
        return toResponse(purchaseOrderRepository.save(order));
    }

    public PurchaseOrderResponse receive(Long id, ReceivePurchaseOrderRequest request) {
        PurchaseOrder order = loadOrder(id);
        if (order.getStatus() != PurchaseOrderStatus.APPROVED
                && order.getStatus() != PurchaseOrderStatus.PARTIALLY_RECEIVED) {
            throw new InventoryOperationException("La orden debe estar aprobada para recibir mercaderia.");
        }

        Set<Long> uniqueLineIds = new HashSet<>();
        for (ReceivePurchaseOrderLineRequest receivedLine : request.lines()) {
            if (!uniqueLineIds.add(receivedLine.lineId())) {
                throw new InventoryOperationException("No se puede recibir dos veces la misma linea.");
            }
            PurchaseOrderLine line = order.getLines().stream()
                    .filter(current -> current.getId().equals(receivedLine.lineId()))
                    .findFirst()
                    .orElseThrow(() -> new InventoryNotFoundException("La linea no pertenece a la orden."));
            int pending = line.getOrderedQuantity() - line.getReceivedQuantity();
            if (receivedLine.quantity() > pending) {
                throw new InventoryOperationException(
                        "La recepcion de " + line.getItem().getSku() + " supera las " + pending + " unidades pendientes."
                );
            }

            receiveStock(order, line, receivedLine.quantity());
            line.setReceivedQuantity(line.getReceivedQuantity() + receivedLine.quantity());
        }

        boolean complete = order.getLines().stream()
                .allMatch(line -> line.getReceivedQuantity() == line.getOrderedQuantity());
        order.setStatus(complete ? PurchaseOrderStatus.RECEIVED : PurchaseOrderStatus.PARTIALLY_RECEIVED);
        if (complete) {
            order.setReceivedAt(OffsetDateTime.now());
        }
        return toResponse(purchaseOrderRepository.save(order));
    }

    public PurchaseOrderResponse cancel(Long id) {
        PurchaseOrder order = loadOrder(id);
        if (order.getStatus() != PurchaseOrderStatus.DRAFT
                && order.getStatus() != PurchaseOrderStatus.APPROVED) {
            throw new InventoryOperationException("La orden ya recibio mercaderia o esta cerrada.");
        }
        order.setStatus(PurchaseOrderStatus.CANCELLED);
        return toResponse(purchaseOrderRepository.save(order));
    }

    private void receiveStock(PurchaseOrder order, PurchaseOrderLine line, int quantity) {
        InventoryItem item = line.getItem();
        List<InventoryStock> stocks = stockService.findStocksForUpdate(item.getSku());
        InventoryStock stock = stockService.resolveStock(stocks, order.getWarehouse().getCode());
        int previousStock = stock.getAvailableQuantity();
        int newStock = previousStock + quantity;
        stock.setAvailableQuantity(newStock);
        stockService.saveAndSynchronize(item, stocks);
        movementService.recordMovement(
                item,
                order.getWarehouse().getCode(),
                MovementType.ENTRY,
                ActionType.PURCHASE_RECEIPT,
                quantity,
                previousStock,
                newStock,
                "Recepcion de compra " + order.getOrderNumber(),
                order.getOrderNumber()
        );
    }

    private PurchaseOrder loadOrder(Long id) {
        return purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new InventoryNotFoundException("No existe la orden de compra solicitada."));
    }

    private void requireStatus(PurchaseOrder order, PurchaseOrderStatus status, String message) {
        if (order.getStatus() != status) {
            throw new InventoryOperationException(message);
        }
    }

    private PurchaseOrderResponse toResponse(PurchaseOrder order) {
        List<PurchaseOrderLineResponse> lines = order.getLines().stream()
                .map(line -> new PurchaseOrderLineResponse(
                        line.getId(),
                        line.getItem().getSku(),
                        line.getItem().getProductName(),
                        line.getSupplierSku(),
                        line.getOrderedQuantity(),
                        line.getReceivedQuantity(),
                        line.getOrderedQuantity() - line.getReceivedQuantity(),
                        line.getUnitCost(),
                        line.getUnitCost().multiply(BigDecimal.valueOf(line.getOrderedQuantity()))
                ))
                .toList();
        BigDecimal total = lines.stream()
                .map(PurchaseOrderLineResponse::subtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        int orderedUnits = lines.stream().mapToInt(PurchaseOrderLineResponse::orderedQuantity).sum();
        int receivedUnits = lines.stream().mapToInt(PurchaseOrderLineResponse::receivedQuantity).sum();
        return new PurchaseOrderResponse(
                order.getId(),
                order.getOrderNumber(),
                order.getSupplier().getId(),
                order.getSupplier().getCode(),
                order.getSupplier().getBusinessName(),
                order.getWarehouse().getCode(),
                order.getWarehouse().getName(),
                order.getStatus().name(),
                order.getExpectedAt(),
                order.getNotes(),
                order.getCreatedBy(),
                order.getApprovedBy(),
                total,
                orderedUnits,
                receivedUnits,
                lines,
                order.getCreatedAt(),
                order.getApprovedAt(),
                order.getReceivedAt(),
                order.getUpdatedAt()
        );
    }

    private String generateOrderNumber() {
        return "OC-" + LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE) + "-"
                + UUID.randomUUID().toString().substring(0, 6).toUpperCase(Locale.ROOT);
    }

    private String resolveUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return "system";
        }
        String username = authentication.getName();
        return username == null || username.isBlank() ? "system" : username;
    }

    private String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}

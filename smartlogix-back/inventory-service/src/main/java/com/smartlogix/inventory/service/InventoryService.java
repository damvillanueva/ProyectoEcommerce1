package com.smartlogix.inventory.service;

import com.smartlogix.inventory.domain.ActionType;
import com.smartlogix.inventory.domain.InventoryItem;
import com.smartlogix.inventory.domain.InventoryStock;
import com.smartlogix.inventory.domain.MovementType;
import com.smartlogix.inventory.dto.CatalogProductResponse;
import com.smartlogix.inventory.dto.CreateInventoryItemRequest;
import com.smartlogix.inventory.dto.InventoryAvailabilityResponse;
import com.smartlogix.inventory.dto.InventoryItemResponse;
import com.smartlogix.inventory.dto.UpdateInventoryItemRequest;
import com.smartlogix.inventory.dto.UpsertInventoryStockRequest;
import com.smartlogix.inventory.exception.InventoryNotFoundException;
import com.smartlogix.inventory.exception.InventoryOperationException;
import com.smartlogix.inventory.repository.InventoryItemRepository;
import io.micrometer.core.instrument.MeterRegistry;
import java.util.List;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class InventoryService {

    private static final Logger log = LoggerFactory.getLogger(InventoryService.class);

    private final InventoryItemRepository repository;
    private final InventoryMovementService movementService;
    private final InventoryAuditLogService auditLogService;
    private final InventoryStockService stockService;
    private MeterRegistry meterRegistry;

    public InventoryService(
            InventoryItemRepository repository,
            InventoryMovementService movementService,
            InventoryAuditLogService auditLogService,
            InventoryStockService stockService
    ) {
        this.repository = repository;
        this.movementService = movementService;
        this.auditLogService = auditLogService;
        this.stockService = stockService;
    }

    @Autowired
    void setMeterRegistry(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    public InventoryItemResponse createItem(CreateInventoryItemRequest request) {
        String normalizedSku = normalizeSku(request.sku());
        if (repository.existsBySku(normalizedSku)) {
            throw new InventoryOperationException("El SKU ya existe: " + normalizedSku);
        }

        InventoryItem item = new InventoryItem();
        item.setSku(normalizedSku);
        applyProductData(
                item,
                request.productName(),
                request.imageUrl(),
                request.category(),
                request.brand(),
                request.shortDescription(),
                request.salePrice(),
                request.originalPrice(),
                request.featured(),
                request.fastShipping(),
                request.freeShipping(),
                request.storePickup()
        );

        InventoryStock initialStock = stockService.createInitialStock(
                item,
                request.warehouseCode(),
                request.locationZone(),
                request.locationAisle(),
                request.locationRack(),
                request.locationLevel(),
                request.locationPosition(),
                request.initialQuantity(),
                request.reorderLevel()
        );
        InventoryItem savedItem = initialStock.getItem();

        movementService.recordMovement(
                savedItem,
                initialStock.getWarehouse().getCode(),
                MovementType.ENTRY,
                ActionType.CREATE_PRODUCT,
                initialStock.getAvailableQuantity(),
                0,
                initialStock.getAvailableQuantity(),
                "Producto creado"
        );
        auditLogService.record(
                "CREATE_PRODUCT",
                savedItem.getSku(),
                savedItem.getProductName(),
                "Producto creado con stock inicial " + initialStock.getAvailableQuantity()
        );
        increment("smartlogix.inventory.products.added", "warehouse", initialStock.getWarehouse().getCode());
        log.info(
                "inventory_product_created sku={} warehouse={} available={}",
                savedItem.getSku(),
                initialStock.getWarehouse().getCode(),
                initialStock.getAvailableQuantity()
        );
        return toResponse(savedItem);
    }

    @Transactional(readOnly = true)
    public List<InventoryItemResponse> findAll() {
        return repository.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public InventoryItemResponse findBySku(String sku) {
        return toResponse(loadBySku(sku));
    }

    @Transactional(readOnly = true)
    public List<CatalogProductResponse> findCatalogProducts() {
        return repository.findAll().stream().map(this::toCatalogResponse).toList();
    }

    @Transactional(readOnly = true)
    public CatalogProductResponse findCatalogProduct(String sku) {
        return toCatalogResponse(loadBySku(sku));
    }

    @Transactional(readOnly = true)
    public InventoryAvailabilityResponse checkAvailability(String sku, int quantity) {
        InventoryItem item = loadBySku(sku);
        int availableQuantity = activeAvailable(stockService.findStocks(item));
        return new InventoryAvailabilityResponse(
                item.getSku(),
                quantity,
                availableQuantity,
                availableQuantity >= quantity
        );
    }

    public InventoryItemResponse reserve(String sku, int quantity) {
        validatePositiveQuantity(quantity);
        InventoryItem item = loadBySku(sku);
        List<InventoryStock> stocks = stockService.findStocksForUpdate(item.getSku());
        List<InventoryStock> activeStocks = stocks.stream()
                .filter(stock -> stock.getWarehouse().isActive())
                .toList();
        int availableQuantity = activeAvailable(activeStocks);
        if (availableQuantity < quantity) {
            throw new InventoryOperationException(
                    "Stock insuficiente para SKU " + sku + ". Disponible: " + availableQuantity
            );
        }

        int remaining = quantity;
        for (InventoryStock stock : activeStocks) {
            if (remaining == 0) break;
            int allocated = Math.min(stock.getAvailableQuantity(), remaining);
            if (allocated == 0) continue;

            int previousStock = stock.getAvailableQuantity();
            stock.setAvailableQuantity(previousStock - allocated);
            stock.setReservedQuantity(stock.getReservedQuantity() + allocated);
            movementService.recordMovement(
                    item,
                    stock.getWarehouse().getCode(),
                    MovementType.EXIT,
                    ActionType.ORDER_CREATED,
                    allocated,
                    previousStock,
                    stock.getAvailableQuantity(),
                    "Reserva de stock"
            );
            remaining -= allocated;
        }

        stockService.saveAndSynchronize(item, stocks);
        increment("smartlogix.inventory.operations", "operation", "reserve");
        log.info(
                "inventory_reserved sku={} quantity={} available={} reserved={}",
                item.getSku(),
                quantity,
                item.getAvailableQuantity(),
                item.getReservedQuantity()
        );
        return toResponse(item);
    }

    public InventoryItemResponse release(String sku, int quantity) {
        validatePositiveQuantity(quantity);
        InventoryItem item = loadBySku(sku);
        List<InventoryStock> stocks = stockService.findStocksForUpdate(item.getSku());
        int reservedQuantity = stocks.stream().mapToInt(InventoryStock::getReservedQuantity).sum();
        if (reservedQuantity < quantity) {
            throw new InventoryOperationException("No hay suficiente stock reservado para liberar en SKU " + sku);
        }

        int remaining = quantity;
        for (InventoryStock stock : stocks) {
            if (remaining == 0) break;
            int released = Math.min(stock.getReservedQuantity(), remaining);
            if (released == 0) continue;

            int previousStock = stock.getAvailableQuantity();
            stock.setReservedQuantity(stock.getReservedQuantity() - released);
            stock.setAvailableQuantity(previousStock + released);
            movementService.recordMovement(
                    item,
                    stock.getWarehouse().getCode(),
                    MovementType.ENTRY,
                    ActionType.ORDER_CANCELLED,
                    released,
                    previousStock,
                    stock.getAvailableQuantity(),
                    "Liberacion de reserva"
            );
            remaining -= released;
        }

        stockService.saveAndSynchronize(item, stocks);
        increment("smartlogix.inventory.operations", "operation", "release");
        log.info(
                "inventory_released sku={} quantity={} available={} reserved={}",
                item.getSku(),
                quantity,
                item.getAvailableQuantity(),
                item.getReservedQuantity()
        );
        return toResponse(item);
    }

    public InventoryItemResponse dispatch(String sku, int quantity) {
        validatePositiveQuantity(quantity);
        InventoryItem item = loadBySku(sku);
        List<InventoryStock> stocks = stockService.findStocksForUpdate(item.getSku());
        int reservedQuantity = stocks.stream().mapToInt(InventoryStock::getReservedQuantity).sum();
        if (reservedQuantity < quantity) {
            throw new InventoryOperationException("No hay stock reservado suficiente para despachar SKU " + sku);
        }

        int remaining = quantity;
        for (InventoryStock stock : stocks) {
            if (remaining == 0) break;
            int dispatched = Math.min(stock.getReservedQuantity(), remaining);
            stock.setReservedQuantity(stock.getReservedQuantity() - dispatched);
            remaining -= dispatched;
        }

        stockService.saveAndSynchronize(item, stocks);
        increment("smartlogix.inventory.operations", "operation", "dispatch");
        log.info(
                "inventory_dispatched sku={} quantity={} reserved={}",
                item.getSku(),
                quantity,
                item.getReservedQuantity()
        );
        return toResponse(item);
    }

    public InventoryItemResponse updateItem(String sku, UpdateInventoryItemRequest request) {
        InventoryItem item = loadBySku(sku);
        List<InventoryStock> currentStocks = stockService.findStocks(item);
        int previousStock = currentStocks.stream()
                .filter(stock -> stock.getWarehouse().getCode().equals(normalizeWarehouseCode(request.warehouseCode())))
                .mapToInt(InventoryStock::getAvailableQuantity)
                .findFirst()
                .orElse(0);

        applyProductData(
                item,
                request.productName(),
                request.imageUrl(),
                request.category(),
                request.brand(),
                request.shortDescription(),
                request.salePrice(),
                request.originalPrice(),
                request.featured(),
                request.fastShipping(),
                request.freeShipping(),
                request.storePickup()
        );
        repository.save(item);

        InventoryStock stock = stockService.upsertStock(
                item,
                request.warehouseCode(),
                new UpsertInventoryStockRequest(
                        request.locationZone(),
                        request.locationAisle(),
                        request.locationRack(),
                        request.locationLevel(),
                        request.locationPosition(),
                        request.availableQuantity(),
                        request.reorderLevel()
                )
        );
        if (previousStock != stock.getAvailableQuantity()) {
            movementService.recordMovement(
                    item,
                    stock.getWarehouse().getCode(),
                    MovementType.ADJUSTMENT,
                    ActionType.UPDATE_STOCK,
                    Math.abs(stock.getAvailableQuantity() - previousStock),
                    previousStock,
                    stock.getAvailableQuantity(),
                    "Actualizacion manual de stock"
            );
        }

        auditLogService.record(
                "UPDATE_PRODUCT",
                item.getSku(),
                item.getProductName(),
                "Producto actualizado. Stock anterior: " + previousStock
                        + ", stock nuevo: " + stock.getAvailableQuantity()
        );
        increment("smartlogix.inventory.products.updated", "warehouse", stock.getWarehouse().getCode());
        log.info(
                "inventory_product_updated sku={} warehouse={} available={} reserved={}",
                item.getSku(),
                stock.getWarehouse().getCode(),
                stock.getAvailableQuantity(),
                stock.getReservedQuantity()
        );
        return toResponse(item);
    }

    public InventoryItemResponse upsertStock(
            String sku,
            String warehouseCode,
            UpsertInventoryStockRequest request
    ) {
        InventoryItem item = loadBySku(sku);
        String normalizedWarehouseCode = normalizeWarehouseCode(warehouseCode);
        int previousStock = stockService.findStocks(item).stream()
                .filter(stock -> stock.getWarehouse().getCode().equals(normalizedWarehouseCode))
                .mapToInt(InventoryStock::getAvailableQuantity)
                .findFirst()
                .orElse(0);
        InventoryStock stock = stockService.upsertStock(item, normalizedWarehouseCode, request);

        if (previousStock != stock.getAvailableQuantity()) {
            movementService.recordMovement(
                    item,
                    stock.getWarehouse().getCode(),
                    MovementType.ADJUSTMENT,
                    ActionType.UPDATE_STOCK,
                    Math.abs(stock.getAvailableQuantity() - previousStock),
                    previousStock,
                    stock.getAvailableQuantity(),
                    previousStock == 0 ? "Existencia creada en bodega" : "Existencia actualizada en bodega"
            );
        }
        auditLogService.record(
                "UPSERT_STOCK",
                item.getSku(),
                item.getProductName(),
                "Existencia actualizada en " + normalizedWarehouseCode
        );
        increment("smartlogix.inventory.stock.updated", "warehouse", normalizedWarehouseCode);
        return toResponse(item);
    }

    public void deleteStock(String sku, String warehouseCode) {
        InventoryItem item = loadBySku(sku);
        String normalizedWarehouseCode = normalizeWarehouseCode(warehouseCode);
        stockService.deleteStock(item, normalizedWarehouseCode);
        auditLogService.record(
                "DELETE_STOCK",
                item.getSku(),
                item.getProductName(),
                "Existencia eliminada de " + normalizedWarehouseCode
        );
        increment("smartlogix.inventory.stock.deleted", "warehouse", normalizedWarehouseCode);
    }

    public void deleteItem(String sku) {
        InventoryItem item = loadBySku(sku);
        List<InventoryStock> stocks = stockService.findStocksForUpdate(item.getSku());
        for (InventoryStock stock : stocks) {
            movementService.recordMovement(
                    item,
                    stock.getWarehouse().getCode(),
                    MovementType.EXIT,
                    ActionType.DELETE_PRODUCT,
                    stock.getAvailableQuantity() + stock.getReservedQuantity(),
                    stock.getAvailableQuantity(),
                    0,
                    "Producto eliminado"
            );
        }
        auditLogService.record(
                "DELETE_PRODUCT",
                item.getSku(),
                item.getProductName(),
                "Producto eliminado del inventario"
        );
        stockService.deleteAllStocks(item);
        repository.delete(item);
        increment("smartlogix.inventory.products.deleted", "warehouse", item.getWarehouseCode());
        log.info("inventory_product_deleted sku={}", item.getSku());
    }

    private InventoryItem loadBySku(String sku) {
        return repository.findBySku(normalizeSku(sku))
                .orElseThrow(() -> new InventoryNotFoundException("No existe inventario para SKU: " + sku));
    }

    private InventoryItemResponse toResponse(InventoryItem item) {
        List<InventoryStock> stocks = stockService.findStocks(item);
        InventoryStock primary = stocks.stream().findFirst()
                .orElseThrow(() -> new InventoryNotFoundException("No existen existencias para SKU: " + item.getSku()));
        int available = stocks.stream().mapToInt(InventoryStock::getAvailableQuantity).sum();
        int reserved = stocks.stream().mapToInt(InventoryStock::getReservedQuantity).sum();
        int reorder = stocks.stream().mapToInt(InventoryStock::getReorderLevel).sum();

        return new InventoryItemResponse(
                item.getSku(),
                item.getProductName(),
                item.getImageUrl(),
                item.getCategory(),
                item.getBrand(),
                item.getShortDescription(),
                item.getSalePrice(),
                item.getOriginalPrice(),
                item.isFeatured(),
                item.isFastShipping(),
                item.isFreeShipping(),
                item.isStorePickup(),
                primary.getWarehouse().getCode(),
                primary.getLocationZone(),
                primary.getLocationAisle(),
                primary.getLocationRack(),
                primary.getLocationLevel(),
                primary.getLocationPosition(),
                available,
                reserved,
                reorder,
                item.getUpdatedAt(),
                stockService.toResponses(stocks)
        );
    }

    private CatalogProductResponse toCatalogResponse(InventoryItem item) {
        List<InventoryStock> activeStocks = stockService.findStocks(item).stream()
                .filter(stock -> stock.getWarehouse().isActive())
                .toList();
        int available = activeAvailable(activeStocks);
        int reorder = activeStocks.stream().mapToInt(InventoryStock::getReorderLevel).sum();
        return new CatalogProductResponse(
                item.getSku(),
                item.getProductName(),
                item.getImageUrl(),
                item.getCategory(),
                item.getBrand(),
                item.getShortDescription(),
                item.getSalePrice(),
                item.getOriginalPrice(),
                item.isFeatured(),
                item.isFastShipping(),
                item.isFreeShipping(),
                item.isStorePickup(),
                available,
                available > 0,
                available > 0 && available <= reorder
        );
    }

    private void applyProductData(
            InventoryItem item,
            String productName,
            String imageUrl,
            String category,
            String brand,
            String shortDescription,
            java.math.BigDecimal salePrice,
            java.math.BigDecimal originalPrice,
            Boolean featured,
            Boolean fastShipping,
            Boolean freeShipping,
            Boolean storePickup
    ) {
        item.setProductName(productName.trim());
        item.setImageUrl(normalizeImageUrl(imageUrl));
        item.setCategory(normalizeCategory(category));
        item.setBrand(normalizeOptionalText(brand, "SmartLogix"));
        item.setShortDescription(normalizeOptionalText(shortDescription, productName.trim()));
        item.setSalePrice(salePrice);
        item.setOriginalPrice(originalPrice == null ? salePrice : originalPrice);
        item.setFeatured(Boolean.TRUE.equals(featured));
        item.setFastShipping(Boolean.TRUE.equals(fastShipping));
        item.setFreeShipping(Boolean.TRUE.equals(freeShipping));
        item.setStorePickup(storePickup == null || storePickup);
    }

    private int activeAvailable(List<InventoryStock> stocks) {
        return stocks.stream()
                .filter(stock -> stock.getWarehouse().isActive())
                .mapToInt(InventoryStock::getAvailableQuantity)
                .sum();
    }

    private void validatePositiveQuantity(int quantity) {
        if (quantity <= 0) {
            throw new InventoryOperationException("La cantidad debe ser mayor a 0.");
        }
    }

    private String normalizeSku(String sku) {
        return sku == null ? "" : sku.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeWarehouseCode(String warehouseCode) {
        return warehouseCode == null ? "" : warehouseCode.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeImageUrl(String imageUrl) {
        return imageUrl == null || imageUrl.isBlank() ? null : imageUrl.trim();
    }

    private String normalizeCategory(String category) {
        return category == null || category.isBlank() ? "General" : category.trim();
    }

    private String normalizeOptionalText(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private void increment(String metricName, String tagName, String tagValue) {
        if (meterRegistry != null) {
            meterRegistry.counter(metricName, tagName, tagValue).increment();
        }
    }
}

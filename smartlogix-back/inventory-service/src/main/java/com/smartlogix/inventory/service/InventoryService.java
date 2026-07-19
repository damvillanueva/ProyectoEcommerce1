package com.smartlogix.inventory.service;

import com.smartlogix.inventory.domain.ActionType;
import com.smartlogix.inventory.domain.InventoryItem;
import com.smartlogix.inventory.domain.MovementType;
import com.smartlogix.inventory.domain.Warehouse;
import com.smartlogix.inventory.dto.CatalogProductResponse;
import com.smartlogix.inventory.dto.CreateInventoryItemRequest;
import com.smartlogix.inventory.dto.UpdateInventoryItemRequest;
import com.smartlogix.inventory.dto.InventoryAvailabilityResponse;
import com.smartlogix.inventory.dto.InventoryItemResponse;
import com.smartlogix.inventory.exception.InventoryNotFoundException;
import com.smartlogix.inventory.exception.InventoryOperationException;
import com.smartlogix.inventory.repository.InventoryItemRepository;
import io.micrometer.core.instrument.MeterRegistry;
import java.util.List;
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
    private final WarehouseService warehouseService;
    private MeterRegistry meterRegistry;

    public InventoryService(
            InventoryItemRepository repository,
            InventoryMovementService movementService,
            InventoryAuditLogService auditLogService,
            WarehouseService warehouseService
    ) {
        this.repository = repository;
        this.movementService = movementService;
        this.auditLogService = auditLogService;
        this.warehouseService = warehouseService;
    }

    @Autowired
    void setMeterRegistry(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    public InventoryItemResponse createItem(CreateInventoryItemRequest request) {
        String normalizedSku = request.sku().trim().toUpperCase();
        if (repository.existsBySku(normalizedSku)) {
            throw new InventoryOperationException("El SKU ya existe: " + normalizedSku);
        }

        Warehouse warehouse = warehouseService.loadActiveWarehouse(request.warehouseCode());

        InventoryItem item = new InventoryItem();
        item.setSku(normalizedSku);
        item.setProductName(request.productName().trim());
        item.setImageUrl(normalizeImageUrl(request.imageUrl()));
        item.setCategory(normalizeCategory(request.category()));
        item.setBrand(normalizeOptionalText(request.brand(), "SmartLogix"));
        item.setShortDescription(normalizeOptionalText(request.shortDescription(), request.productName().trim()));
        item.setSalePrice(request.salePrice());
        item.setOriginalPrice(request.originalPrice() == null ? request.salePrice() : request.originalPrice());
        item.setFeatured(Boolean.TRUE.equals(request.featured()));
        item.setFastShipping(Boolean.TRUE.equals(request.fastShipping()));
        item.setFreeShipping(Boolean.TRUE.equals(request.freeShipping()));
        item.setStorePickup(request.storePickup() == null || request.storePickup());
        item.setWarehouseCode(warehouse.getCode());
        applyLocation(
                item,
                request.locationZone(),
                request.locationAisle(),
                request.locationRack(),
                request.locationLevel(),
                request.locationPosition()
        );
        warehouseService.validateLocation(
                warehouse,
                item.getLocationAisle(),
                item.getLocationRack(),
                item.getLocationLevel(),
                item.getLocationPosition()
        );
        item.setAvailableQuantity(request.initialQuantity());
        item.setReservedQuantity(0);
        item.setReorderLevel(request.reorderLevel());

        InventoryItem savedItem = repository.save(item);
        movementService.recordMovement(
                savedItem,
                MovementType.ENTRY,
                ActionType.CREATE_PRODUCT,
                savedItem.getAvailableQuantity(),
                0,
                savedItem.getAvailableQuantity(),
                "Producto creado"
        );
        auditLogService.record(
                "CREATE_PRODUCT",
                savedItem.getSku(),
                savedItem.getProductName(),
                "Producto creado con stock inicial " + savedItem.getAvailableQuantity()
        );
        increment("smartlogix.inventory.products.added", "warehouse", savedItem.getWarehouseCode());
        log.info(
                "inventory_product_created sku={} warehouse={} available={}",
                savedItem.getSku(),
                savedItem.getWarehouseCode(),
                savedItem.getAvailableQuantity()
        );

        return toResponse(savedItem);
    }

    @Transactional(readOnly = true)
    public List<InventoryItemResponse> findAll() {
        return repository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public InventoryItemResponse findBySku(String sku) {
        InventoryItem item = loadBySku(sku);
        return toResponse(item);
    }

    @Transactional(readOnly = true)
    public List<CatalogProductResponse> findCatalogProducts() {
        return repository.findAll().stream()
                .map(this::toCatalogResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public CatalogProductResponse findCatalogProduct(String sku) {
        return toCatalogResponse(loadBySku(sku));
    }

    @Transactional(readOnly = true)
    public InventoryAvailabilityResponse checkAvailability(String sku, int quantity) {
        InventoryItem item = loadBySku(sku);
        boolean available = item.getAvailableQuantity() >= quantity;
        return new InventoryAvailabilityResponse(
                item.getSku(),
                quantity,
                item.getAvailableQuantity(),
                available
        );
    }

    public InventoryItemResponse reserve(String sku, int quantity) {
        InventoryItem item = loadBySku(sku);
        int previousStock = item.getAvailableQuantity();
        if (quantity <= 0) {
            throw new InventoryOperationException("La cantidad debe ser mayor a 0.");
        }
        if (item.getAvailableQuantity() < quantity) {
            throw new InventoryOperationException(
                    "Stock insuficiente para SKU " + sku + ". Disponible: " + item.getAvailableQuantity());
        }

        item.setAvailableQuantity(item.getAvailableQuantity() - quantity);
        item.setReservedQuantity(item.getReservedQuantity() + quantity);

        InventoryItem savedItem = repository.save(item);
        movementService.recordMovement(
                savedItem,
                MovementType.EXIT,
                ActionType.ORDER_CREATED,
                quantity,
                previousStock,
                savedItem.getAvailableQuantity(),
                "Reserva de stock"
        );
        increment("smartlogix.inventory.operations", "operation", "reserve");
        log.info(
                "inventory_reserved sku={} quantity={} available={} reserved={}",
                savedItem.getSku(),
                quantity,
                savedItem.getAvailableQuantity(),
                savedItem.getReservedQuantity()
        );

        return toResponse(savedItem);
    }

    public InventoryItemResponse release(String sku, int quantity) {
        InventoryItem item = loadBySku(sku);
        if (quantity <= 0) {
            throw new InventoryOperationException("La cantidad debe ser mayor a 0.");
        }
        if (item.getReservedQuantity() < quantity) {
            throw new InventoryOperationException(
                    "No hay suficiente stock reservado para liberar en SKU " + sku);
        }
        int previousStock = item.getAvailableQuantity();

        item.setReservedQuantity(item.getReservedQuantity() - quantity);
        item.setAvailableQuantity(item.getAvailableQuantity() + quantity);

        InventoryItem savedItem = repository.save(item);
        movementService.recordMovement(
                savedItem,
                MovementType.ENTRY,
                ActionType.ORDER_CANCELLED,
                quantity,
                previousStock,
                savedItem.getAvailableQuantity(),
                "Liberacion de reserva"
        );
        increment("smartlogix.inventory.operations", "operation", "release");
        log.info(
                "inventory_released sku={} quantity={} available={} reserved={}",
                savedItem.getSku(),
                quantity,
                savedItem.getAvailableQuantity(),
                savedItem.getReservedQuantity()
        );

        return toResponse(savedItem);
    }

    public InventoryItemResponse dispatch(String sku, int quantity) {
        InventoryItem item = loadBySku(sku);
        if (quantity <= 0) {
            throw new InventoryOperationException("La cantidad debe ser mayor a 0.");
        }
        if (item.getReservedQuantity() < quantity) {
            throw new InventoryOperationException(
                    "No hay stock reservado suficiente para despachar SKU " + sku);
        }

        item.setReservedQuantity(item.getReservedQuantity() - quantity);
        InventoryItem savedItem = repository.save(item);
        increment("smartlogix.inventory.operations", "operation", "dispatch");
        log.info(
                "inventory_dispatched sku={} quantity={} reserved={}",
                savedItem.getSku(),
                quantity,
                savedItem.getReservedQuantity()
        );
        return toResponse(savedItem);
    }

    private InventoryItem loadBySku(String sku) {
        return repository.findBySku(sku.trim().toUpperCase())
                .orElseThrow(() -> new InventoryNotFoundException("No existe inventario para SKU: " + sku));
    }

    private InventoryItemResponse toResponse(InventoryItem item) {
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
                item.getWarehouseCode(),
                item.getLocationZone(),
                item.getLocationAisle(),
                item.getLocationRack(),
                item.getLocationLevel(),
                item.getLocationPosition(),
                item.getAvailableQuantity(),
                item.getReservedQuantity(),
                item.getReorderLevel(),
                item.getUpdatedAt()
        );
    }

    private CatalogProductResponse toCatalogResponse(InventoryItem item) {
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
                item.getAvailableQuantity(),
                item.getAvailableQuantity() > 0,
                item.getAvailableQuantity() > 0
                        && item.getAvailableQuantity() <= item.getReorderLevel()
        );
    }

    public InventoryItemResponse updateItem(String sku, UpdateInventoryItemRequest request) {
        InventoryItem item = loadBySku(sku);

        validateStockState(request.availableQuantity(), request.reservedQuantity());
        Warehouse warehouse = warehouseService.loadActiveWarehouse(request.warehouseCode());

        int previousStock = item.getAvailableQuantity();
        item.setProductName(request.productName().trim());
        item.setImageUrl(normalizeImageUrl(request.imageUrl()));
        item.setCategory(normalizeCategory(request.category()));
        if (request.brand() != null) {
            item.setBrand(normalizeOptionalText(request.brand(), "SmartLogix"));
        }
        if (request.shortDescription() != null) {
            item.setShortDescription(normalizeOptionalText(request.shortDescription(), request.productName().trim()));
        }
        item.setSalePrice(request.salePrice());
        if (request.originalPrice() != null) {
            item.setOriginalPrice(request.originalPrice());
        }
        if (request.featured() != null) {
            item.setFeatured(request.featured());
        }
        if (request.fastShipping() != null) {
            item.setFastShipping(request.fastShipping());
        }
        if (request.freeShipping() != null) {
            item.setFreeShipping(request.freeShipping());
        }
        if (request.storePickup() != null) {
            item.setStorePickup(request.storePickup());
        }
        item.setWarehouseCode(warehouse.getCode());
        applyLocation(
                item,
                request.locationZone(),
                request.locationAisle(),
                request.locationRack(),
                request.locationLevel(),
                request.locationPosition()
        );
        warehouseService.validateLocation(
                warehouse,
                item.getLocationAisle(),
                item.getLocationRack(),
                item.getLocationLevel(),
                item.getLocationPosition()
        );
        item.setAvailableQuantity(request.availableQuantity());
        item.setReservedQuantity(request.reservedQuantity());
        item.setReorderLevel(request.reorderLevel());

        InventoryItem savedItem = repository.save(item);
        if (previousStock != savedItem.getAvailableQuantity()) {
            movementService.recordMovement(
                    savedItem,
                    MovementType.ADJUSTMENT,
                    ActionType.UPDATE_STOCK,
                    Math.abs(savedItem.getAvailableQuantity() - previousStock),
                    previousStock,
                    savedItem.getAvailableQuantity(),
                    "Actualizacion manual de stock"
            );
        }
        auditLogService.record(
                "UPDATE_PRODUCT",
                savedItem.getSku(),
                savedItem.getProductName(),
                "Producto actualizado. Stock anterior: " + previousStock
                        + ", stock nuevo: " + savedItem.getAvailableQuantity()
        );
        increment("smartlogix.inventory.products.updated", "warehouse", savedItem.getWarehouseCode());
        log.info(
                "inventory_product_updated sku={} warehouse={} available={} reserved={}",
                savedItem.getSku(),
                savedItem.getWarehouseCode(),
                savedItem.getAvailableQuantity(),
                savedItem.getReservedQuantity()
        );

        return toResponse(savedItem);
    }

    @Transactional
    public void deleteItem(String sku) {
        InventoryItem item = repository.findBySku(sku)
                .orElseThrow(() ->
                        new InventoryNotFoundException("No existe el SKU " + sku));

        movementService.recordMovement(
                item,
                MovementType.EXIT,
                ActionType.DELETE_PRODUCT,
                item.getAvailableQuantity() + item.getReservedQuantity(),
                item.getAvailableQuantity(),
                0,
                "Producto eliminado"
        );
        auditLogService.record(
                "DELETE_PRODUCT",
                item.getSku(),
                item.getProductName(),
                "Producto eliminado del inventario"
        );

        repository.delete(item);
        increment("smartlogix.inventory.products.deleted", "warehouse", item.getWarehouseCode());
        log.info("inventory_product_deleted sku={} warehouse={}", item.getSku(), item.getWarehouseCode());
    }

    private String normalizeImageUrl(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return null;
        }

        return imageUrl.trim();
    }

    private String normalizeCategory(String category) {
        if (category == null || category.isBlank()) {
            return "General";
        }

        return category.trim();
    }

    private String normalizeOptionalText(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value.trim();
    }

    private void applyLocation(
            InventoryItem item,
            String zone,
            String aisle,
            Integer rack,
            Integer level,
            Integer position
    ) {
        LocationParts fallback = buildFallbackLocation(item);

        item.setLocationZone(normalizeLocationText(zone, fallback.zone()));
        item.setLocationAisle(normalizeLocationText(aisle, fallback.aisle()));
        item.setLocationRack(normalizeLocationNumber(rack, fallback.rack()));
        item.setLocationLevel(normalizeLocationNumber(level, fallback.level()));
        item.setLocationPosition(normalizeLocationNumber(position, fallback.position()));
    }

    private LocationParts buildFallbackLocation(InventoryItem item) {
        int hash = hashText(item.getWarehouseCode() + "-" + item.getSku() + "-" + item.getCategory());
        String zone = switch (item.getCategory()) {
            case "Accesorios" -> "A";
            case "Componentes" -> "C";
            case "Monitores" -> "M";
            case "Notebooks" -> "N";
            case "Perifericos" -> "P";
            default -> "G";
        };
        String aisle = String.valueOf((char) ('A' + (hash % 5)));
        int rack = ((hash / 5) % 8) + 1;
        int level = ((hash / 41) % 4) + 1;
        int position = ((hash / 163) % 12) + 1;

        return new LocationParts(zone, aisle, rack, level, position);
    }

    private int hashText(String value) {
        int hash = 0x811c9dc5;

        for (int index = 0; index < value.length(); index++) {
            hash ^= Character.toUpperCase(value.charAt(index));
            hash *= 0x01000193;
        }

        return hash & 0x7fffffff;
    }

    private String normalizeLocationText(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }

        return value.trim().toUpperCase();
    }

    private int normalizeLocationNumber(Integer value, int fallback) {
        if (value == null || value <= 0) {
            return fallback;
        }

        return value;
    }

    private void validateStockState(int availableQuantity, int reservedQuantity) {
        if (availableQuantity < reservedQuantity) {
            throw new InventoryOperationException(
                    "El stock disponible no puede ser menor al stock reservado."
            );
        }
    }

    private void increment(String name, String tagName, String tagValue) {
        if (meterRegistry != null) {
            meterRegistry.counter(name, tagName, tagValue).increment();
        }
    }

    private record LocationParts(String zone, String aisle, int rack, int level, int position) {
    }
}

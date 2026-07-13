package com.smartlogix.inventory.service;

import com.smartlogix.inventory.domain.ActionType;
import com.smartlogix.inventory.domain.InventoryItem;
import com.smartlogix.inventory.domain.MovementType;
import com.smartlogix.inventory.dto.CreateInventoryItemRequest;
import com.smartlogix.inventory.dto.UpdateInventoryItemRequest;
import com.smartlogix.inventory.dto.InventoryAvailabilityResponse;
import com.smartlogix.inventory.dto.InventoryItemResponse;
import com.smartlogix.inventory.exception.InventoryNotFoundException;
import com.smartlogix.inventory.exception.InventoryOperationException;
import com.smartlogix.inventory.repository.InventoryItemRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class InventoryService {

    private final InventoryItemRepository repository;
    private final InventoryMovementService movementService;

    public InventoryService(
            InventoryItemRepository repository,
            InventoryMovementService movementService
    ) {
        this.repository = repository;
        this.movementService = movementService;
    }

    public InventoryItemResponse createItem(CreateInventoryItemRequest request) {
        if (repository.existsBySku(request.sku())) {
            throw new InventoryOperationException("El SKU ya existe: " + request.sku());
        }

        InventoryItem item = new InventoryItem();
        item.setSku(request.sku().trim().toUpperCase());
        item.setProductName(request.productName().trim());
        item.setImageUrl(normalizeImageUrl(request.imageUrl()));
        item.setWarehouseCode(request.warehouseCode().trim().toUpperCase());
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
        return toResponse(repository.save(item));
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
                item.getWarehouseCode(),
                item.getAvailableQuantity(),
                item.getReservedQuantity(),
                item.getReorderLevel(),
                item.getUpdatedAt()
        );
    }

    public InventoryItemResponse updateItem(String sku, UpdateInventoryItemRequest request) {
        InventoryItem item = loadBySku(sku);

        int previousStock = item.getAvailableQuantity();
        item.setProductName(request.productName().trim());
        item.setImageUrl(normalizeImageUrl(request.imageUrl()));
        item.setWarehouseCode(request.warehouseCode().trim().toUpperCase());
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

        repository.delete(item);
    }

    private String normalizeImageUrl(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return null;
        }

        return imageUrl.trim();
    }
}

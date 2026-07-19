package com.smartlogix.inventory.service;

import com.smartlogix.inventory.domain.InventoryItem;
import com.smartlogix.inventory.domain.Warehouse;
import com.smartlogix.inventory.dto.CreateWarehouseRequest;
import com.smartlogix.inventory.dto.UpdateWarehouseRequest;
import com.smartlogix.inventory.dto.WarehouseResponse;
import com.smartlogix.inventory.exception.InventoryNotFoundException;
import com.smartlogix.inventory.exception.InventoryOperationException;
import com.smartlogix.inventory.repository.InventoryItemRepository;
import com.smartlogix.inventory.repository.WarehouseRepository;
import java.util.List;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class WarehouseService {

    private static final Logger log = LoggerFactory.getLogger(WarehouseService.class);

    private final WarehouseRepository warehouseRepository;
    private final InventoryItemRepository itemRepository;
    private final InventoryAuditLogService auditLogService;

    public WarehouseService(
            WarehouseRepository warehouseRepository,
            InventoryItemRepository itemRepository,
            InventoryAuditLogService auditLogService
    ) {
        this.warehouseRepository = warehouseRepository;
        this.itemRepository = itemRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public List<WarehouseResponse> findAll() {
        return warehouseRepository.findAllByOrderByDispatchPriorityAscCodeAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public WarehouseResponse findByCode(String code) {
        return toResponse(loadWarehouse(code));
    }

    public WarehouseResponse create(CreateWarehouseRequest request) {
        String code = normalizeCode(request.code());
        if (warehouseRepository.existsById(code)) {
            throw new InventoryOperationException("La bodega ya existe: " + code);
        }

        Warehouse warehouse = new Warehouse();
        warehouse.setCode(code);
        applyData(
                warehouse,
                request.name(),
                request.city(),
                request.region(),
                request.address(),
                request.active() == null || request.active(),
                valueOrDefault(request.dispatchPriority(), 100),
                valueOrDefault(request.aisleCount(), 6),
                valueOrDefault(request.rackCount(), 8),
                valueOrDefault(request.levelCount(), 4),
                valueOrDefault(request.positionsPerLevel(), 12)
        );

        Warehouse saved = warehouseRepository.save(warehouse);
        auditLogService.record("CREATE_WAREHOUSE", saved.getCode(), saved.getName(), "Bodega creada");
        log.info("warehouse_created code={} city={} active={}", saved.getCode(), saved.getCity(), saved.isActive());
        return toResponse(saved);
    }

    public WarehouseResponse update(String code, UpdateWarehouseRequest request) {
        Warehouse warehouse = loadWarehouse(code);
        validateLayoutReduction(warehouse, request);
        applyData(
                warehouse,
                request.name(),
                request.city(),
                request.region(),
                request.address(),
                request.active(),
                request.dispatchPriority(),
                request.aisleCount(),
                request.rackCount(),
                request.levelCount(),
                request.positionsPerLevel()
        );

        Warehouse saved = warehouseRepository.save(warehouse);
        auditLogService.record("UPDATE_WAREHOUSE", saved.getCode(), saved.getName(), "Bodega actualizada");
        log.info("warehouse_updated code={} active={} priority={}", saved.getCode(), saved.isActive(), saved.getDispatchPriority());
        return toResponse(saved);
    }

    public void delete(String code) {
        Warehouse warehouse = loadWarehouse(code);
        long productCount = itemRepository.countByWarehouseCode(warehouse.getCode());
        if (productCount > 0) {
            throw new InventoryOperationException(
                    "No se puede eliminar una bodega con productos. Desactivala o traslada su inventario."
            );
        }
        warehouseRepository.delete(warehouse);
        auditLogService.record("DELETE_WAREHOUSE", warehouse.getCode(), warehouse.getName(), "Bodega eliminada");
        log.info("warehouse_deleted code={}", warehouse.getCode());
    }

    public Warehouse loadActiveWarehouse(String code) {
        Warehouse warehouse = loadWarehouse(code);
        if (!warehouse.isActive()) {
            throw new InventoryOperationException("La bodega " + warehouse.getCode() + " esta desactivada.");
        }
        return warehouse;
    }

    public void validateLocation(
            Warehouse warehouse,
            String aisle,
            int rack,
            int level,
            int position
    ) {
        String normalizedAisle = aisle == null ? "" : aisle.trim().toUpperCase(Locale.ROOT);
        char lastAisle = (char) ('A' + warehouse.getAisleCount() - 1);
        if (normalizedAisle.length() != 1
                || normalizedAisle.charAt(0) < 'A'
                || normalizedAisle.charAt(0) > lastAisle) {
            throw new InventoryOperationException(
                    "El pasillo debe estar entre A y " + lastAisle + " para " + warehouse.getCode() + "."
            );
        }
        if (rack < 1 || rack > warehouse.getRackCount()) {
            throw new InventoryOperationException("Rack fuera del plano de " + warehouse.getCode() + ".");
        }
        if (level < 1 || level > warehouse.getLevelCount()) {
            throw new InventoryOperationException("Nivel fuera del plano de " + warehouse.getCode() + ".");
        }
        if (position < 1 || position > warehouse.getPositionsPerLevel()) {
            throw new InventoryOperationException("Posicion fuera del plano de " + warehouse.getCode() + ".");
        }
    }

    private void validateLayoutReduction(Warehouse warehouse, UpdateWarehouseRequest request) {
        for (InventoryItem item : itemRepository.findByWarehouseCodeOrderByProductNameAsc(warehouse.getCode())) {
            int aisleNumber = aisleNumber(item.getLocationAisle());
            if (aisleNumber > request.aisleCount()
                    || item.getLocationRack() > request.rackCount()
                    || item.getLocationLevel() > request.levelCount()
                    || item.getLocationPosition() > request.positionsPerLevel()) {
                throw new InventoryOperationException(
                        "El nuevo plano dejaria fuera la ubicacion del SKU " + item.getSku() + "."
                );
            }
        }
    }

    private int aisleNumber(String aisle) {
        if (aisle == null || aisle.isBlank()) return Integer.MAX_VALUE;
        return Character.toUpperCase(aisle.trim().charAt(0)) - 'A' + 1;
    }

    private Warehouse loadWarehouse(String code) {
        String normalizedCode = normalizeCode(code);
        return warehouseRepository.findById(normalizedCode)
                .orElseThrow(() -> new InventoryNotFoundException("No existe la bodega " + normalizedCode));
    }

    private void applyData(
            Warehouse warehouse,
            String name,
            String city,
            String region,
            String address,
            boolean active,
            int dispatchPriority,
            int aisleCount,
            int rackCount,
            int levelCount,
            int positionsPerLevel
    ) {
        warehouse.setName(name.trim());
        warehouse.setCity(city.trim());
        warehouse.setRegion(region.trim());
        warehouse.setAddress(address.trim());
        warehouse.setActive(active);
        warehouse.setDispatchPriority(dispatchPriority);
        warehouse.setAisleCount(aisleCount);
        warehouse.setRackCount(rackCount);
        warehouse.setLevelCount(levelCount);
        warehouse.setPositionsPerLevel(positionsPerLevel);
    }

    private WarehouseResponse toResponse(Warehouse warehouse) {
        List<InventoryItem> items = itemRepository.findByWarehouseCodeOrderByProductNameAsc(warehouse.getCode());
        int available = items.stream().mapToInt(InventoryItem::getAvailableQuantity).sum();
        int reserved = items.stream().mapToInt(InventoryItem::getReservedQuantity).sum();
        long critical = items.stream()
                .filter(item -> item.getAvailableQuantity() <= item.getReorderLevel())
                .count();
        long capacity = (long) warehouse.getAisleCount()
                * warehouse.getRackCount()
                * warehouse.getLevelCount()
                * warehouse.getPositionsPerLevel();

        return new WarehouseResponse(
                warehouse.getCode(),
                warehouse.getName(),
                warehouse.getCity(),
                warehouse.getRegion(),
                warehouse.getAddress(),
                warehouse.isActive(),
                warehouse.getDispatchPriority(),
                warehouse.getAisleCount(),
                warehouse.getRackCount(),
                warehouse.getLevelCount(),
                warehouse.getPositionsPerLevel(),
                items.size(),
                available + reserved,
                available,
                reserved,
                critical,
                items.size(),
                capacity,
                warehouse.getUpdatedAt()
        );
    }

    private String normalizeCode(String code) {
        return code == null ? "" : code.trim().toUpperCase(Locale.ROOT);
    }

    private int valueOrDefault(Integer value, int fallback) {
        return value == null ? fallback : value;
    }
}

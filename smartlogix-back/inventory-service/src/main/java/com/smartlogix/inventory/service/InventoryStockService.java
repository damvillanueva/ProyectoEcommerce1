package com.smartlogix.inventory.service;

import com.smartlogix.inventory.domain.InventoryItem;
import com.smartlogix.inventory.domain.InventoryStock;
import com.smartlogix.inventory.domain.Warehouse;
import com.smartlogix.inventory.dto.InventoryStockResponse;
import com.smartlogix.inventory.dto.UpsertInventoryStockRequest;
import com.smartlogix.inventory.exception.InventoryNotFoundException;
import com.smartlogix.inventory.exception.InventoryOperationException;
import com.smartlogix.inventory.repository.InventoryItemRepository;
import com.smartlogix.inventory.repository.InventoryStockRepository;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class InventoryStockService {

    private final InventoryStockRepository stockRepository;
    private final InventoryItemRepository itemRepository;
    private final WarehouseService warehouseService;

    public InventoryStockService(
            InventoryStockRepository stockRepository,
            InventoryItemRepository itemRepository,
            WarehouseService warehouseService
    ) {
        this.stockRepository = stockRepository;
        this.itemRepository = itemRepository;
        this.warehouseService = warehouseService;
    }

    public InventoryStock createInitialStock(
            InventoryItem item,
            String warehouseCode,
            String zone,
            String aisle,
            Integer rack,
            Integer level,
            Integer position,
            int availableQuantity,
            int reorderLevel
    ) {
        Warehouse warehouse = warehouseService.loadActiveWarehouse(warehouseCode);
        InventoryStock stock = new InventoryStock();
        stock.setItem(item);
        stock.setWarehouse(warehouse);
        applyLocation(stock, item, zone, aisle, rack, level, position);
        warehouseService.validateLocation(
                warehouse,
                stock.getLocationAisle(),
                stock.getLocationRack(),
                stock.getLocationLevel(),
                stock.getLocationPosition()
        );
        stock.setAvailableQuantity(availableQuantity);
        stock.setReservedQuantity(0);
        stock.setReorderLevel(reorderLevel);

        applyLegacySnapshot(item, List.of(stock));
        InventoryItem savedItem = itemRepository.save(item);
        stock.setItem(savedItem);
        return stockRepository.save(stock);
    }

    public InventoryStock upsertStock(
            InventoryItem item,
            String warehouseCode,
            UpsertInventoryStockRequest request
    ) {
        String normalizedWarehouseCode = normalizeWarehouseCode(warehouseCode);
        Warehouse warehouse = warehouseService.loadActiveWarehouse(normalizedWarehouseCode);
        InventoryStock stock = stockRepository
                .findByItem_SkuAndWarehouse_Code(item.getSku(), normalizedWarehouseCode)
                .orElseGet(() -> {
                    InventoryStock created = new InventoryStock();
                    created.setItem(item);
                    created.setWarehouse(warehouse);
                    created.setReservedQuantity(0);
                    return created;
                });

        applyLocation(
                stock,
                item,
                request.locationZone(),
                request.locationAisle(),
                request.locationRack(),
                request.locationLevel(),
                request.locationPosition()
        );
        warehouseService.validateLocation(
                warehouse,
                stock.getLocationAisle(),
                stock.getLocationRack(),
                stock.getLocationLevel(),
                stock.getLocationPosition()
        );
        stock.setAvailableQuantity(request.availableQuantity());
        stock.setReorderLevel(request.reorderLevel());
        InventoryStock saved = stockRepository.saveAndFlush(stock);
        synchronizeLegacySnapshot(item, findStocks(item));
        return saved;
    }

    public void deleteStock(InventoryItem item, String warehouseCode) {
        List<InventoryStock> stocks = findStocksForUpdate(item.getSku());
        if (stocks.size() <= 1) {
            throw new InventoryOperationException(
                    "El producto debe conservar al menos una existencia de bodega."
            );
        }

        InventoryStock stock = resolveStock(stocks, warehouseCode);
        if (stock.getReservedQuantity() > 0) {
            throw new InventoryOperationException(
                    "No se puede eliminar una existencia con unidades reservadas."
            );
        }

        stockRepository.delete(stock);
        stocks.remove(stock);
        synchronizeLegacySnapshot(item, stocks);
    }

    @Transactional(readOnly = true)
    public List<InventoryStock> findStocks(InventoryItem item) {
        return stockRepository.findBySkuOrderByDispatchPriority(item.getSku());
    }

    public List<InventoryStock> findStocksForUpdate(String sku) {
        List<InventoryStock> stocks = stockRepository.findBySkuForUpdate(normalizeSku(sku));
        if (stocks.isEmpty()) {
            throw new InventoryNotFoundException("No existen existencias para SKU: " + sku);
        }
        return stocks;
    }

    public InventoryStock resolveStock(List<InventoryStock> stocks, String warehouseCode) {
        if (warehouseCode == null || warehouseCode.isBlank()) {
            return stocks.get(0);
        }

        String normalizedCode = normalizeWarehouseCode(warehouseCode);
        return stocks.stream()
                .filter(stock -> stock.getWarehouse().getCode().equals(normalizedCode))
                .findFirst()
                .orElseThrow(() -> new InventoryNotFoundException(
                        "El SKU no tiene existencia en la bodega " + normalizedCode
                ));
    }

    public void saveAndSynchronize(InventoryItem item, List<InventoryStock> stocks) {
        stockRepository.saveAll(stocks);
        synchronizeLegacySnapshot(item, stocks);
    }

    public void deleteAllStocks(InventoryItem item) {
        List<InventoryStock> stocks = findStocksForUpdate(item.getSku());
        stockRepository.deleteAll(stocks);
        stockRepository.flush();
    }

    public void synchronizeLegacySnapshot(InventoryItem item, List<InventoryStock> stocks) {
        if (stocks.isEmpty()) {
            throw new InventoryOperationException("El producto debe conservar al menos una existencia.");
        }
        applyLegacySnapshot(item, stocks);
        itemRepository.save(item);
    }

    public List<InventoryStockResponse> toResponses(List<InventoryStock> stocks) {
        return stocks.stream().map(this::toResponse).toList();
    }

    private InventoryStockResponse toResponse(InventoryStock stock) {
        Warehouse warehouse = stock.getWarehouse();
        return new InventoryStockResponse(
                warehouse.getCode(),
                warehouse.getName(),
                warehouse.getCity(),
                warehouse.isActive(),
                warehouse.getDispatchPriority(),
                stock.getLocationZone(),
                stock.getLocationAisle(),
                stock.getLocationRack(),
                stock.getLocationLevel(),
                stock.getLocationPosition(),
                stock.getAvailableQuantity(),
                stock.getReservedQuantity(),
                stock.getAvailableQuantity() + stock.getReservedQuantity(),
                stock.getReorderLevel(),
                stock.getAvailableQuantity() <= stock.getReorderLevel(),
                stock.getUpdatedAt()
        );
    }

    private void applyLegacySnapshot(InventoryItem item, List<InventoryStock> stocks) {
        InventoryStock primary = stocks.stream()
                .sorted((left, right) -> {
                    int priority = Integer.compare(
                            left.getWarehouse().getDispatchPriority(),
                            right.getWarehouse().getDispatchPriority()
                    );
                    return priority != 0
                            ? priority
                            : left.getWarehouse().getCode().compareTo(right.getWarehouse().getCode());
                })
                .findFirst()
                .orElseThrow();

        item.setWarehouseCode(primary.getWarehouse().getCode());
        item.setLocationZone(primary.getLocationZone());
        item.setLocationAisle(primary.getLocationAisle());
        item.setLocationRack(primary.getLocationRack());
        item.setLocationLevel(primary.getLocationLevel());
        item.setLocationPosition(primary.getLocationPosition());
        item.setAvailableQuantity(stocks.stream().mapToInt(InventoryStock::getAvailableQuantity).sum());
        item.setReservedQuantity(stocks.stream().mapToInt(InventoryStock::getReservedQuantity).sum());
        item.setReorderLevel(stocks.stream().mapToInt(InventoryStock::getReorderLevel).sum());
    }

    private void applyLocation(
            InventoryStock stock,
            InventoryItem item,
            String zone,
            String aisle,
            Integer rack,
            Integer level,
            Integer position
    ) {
        LocationParts fallback = buildFallbackLocation(item, stock.getWarehouse().getCode());
        stock.setLocationZone(normalizeLocationText(zone, fallback.zone()));
        stock.setLocationAisle(normalizeLocationText(aisle, fallback.aisle()));
        stock.setLocationRack(normalizeLocationNumber(rack, fallback.rack()));
        stock.setLocationLevel(normalizeLocationNumber(level, fallback.level()));
        stock.setLocationPosition(normalizeLocationNumber(position, fallback.position()));
    }

    private LocationParts buildFallbackLocation(InventoryItem item, String warehouseCode) {
        int hash = hashText(warehouseCode + "-" + item.getSku() + "-" + item.getCategory());
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
        return value == null || value.isBlank() ? fallback : value.trim().toUpperCase(Locale.ROOT);
    }

    private int normalizeLocationNumber(Integer value, int fallback) {
        return value == null || value <= 0 ? fallback : value;
    }

    private String normalizeWarehouseCode(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeSku(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private record LocationParts(String zone, String aisle, int rack, int level, int position) {
    }
}

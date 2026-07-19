package com.smartlogix.inventory.service;

import com.smartlogix.inventory.domain.ActionType;
import com.smartlogix.inventory.domain.InventoryItem;
import com.smartlogix.inventory.domain.InventoryStock;
import com.smartlogix.inventory.domain.MovementType;
import com.smartlogix.inventory.dto.InventoryMovementResponse;
import com.smartlogix.inventory.dto.InventoryTransferResponse;
import com.smartlogix.inventory.dto.TransferInventoryStockRequest;
import com.smartlogix.inventory.exception.InventoryNotFoundException;
import com.smartlogix.inventory.exception.InventoryOperationException;
import com.smartlogix.inventory.repository.InventoryItemRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class InventoryTransferService {

    private static final Logger log = LoggerFactory.getLogger(InventoryTransferService.class);

    private final InventoryItemRepository itemRepository;
    private final InventoryStockService stockService;
    private final InventoryMovementService movementService;
    private final InventoryAuditLogService auditLogService;

    public InventoryTransferService(
            InventoryItemRepository itemRepository,
            InventoryStockService stockService,
            InventoryMovementService movementService,
            InventoryAuditLogService auditLogService
    ) {
        this.itemRepository = itemRepository;
        this.stockService = stockService;
        this.movementService = movementService;
        this.auditLogService = auditLogService;
    }

    public InventoryTransferResponse transfer(String sku, TransferInventoryStockRequest request) {
        String normalizedSku = normalize(sku);
        String sourceCode = normalize(request.sourceWarehouseCode());
        String destinationCode = normalize(request.destinationWarehouseCode());

        if (request.quantity() <= 0) {
            throw new InventoryOperationException("La cantidad a trasladar debe ser mayor a 0.");
        }
        if (sourceCode.equals(destinationCode)) {
            throw new InventoryOperationException("La bodega de origen y destino deben ser diferentes.");
        }

        InventoryItem item = itemRepository.findBySku(normalizedSku)
                .orElseThrow(() -> new InventoryNotFoundException(
                        "No existe inventario para SKU: " + normalizedSku
                ));
        List<InventoryStock> stocks = new ArrayList<>(stockService.findStocksForUpdate(normalizedSku));
        InventoryStock source = stockService.resolveStock(stocks, sourceCode);

        if (!source.getWarehouse().isActive()) {
            throw new InventoryOperationException("La bodega " + sourceCode + " esta desactivada.");
        }
        if (source.getAvailableQuantity() < request.quantity()) {
            throw new InventoryOperationException(
                    "Stock disponible insuficiente en " + sourceCode
                            + ". Disponible: " + source.getAvailableQuantity()
            );
        }

        InventoryStock destination = stocks.stream()
                .filter(stock -> stock.getWarehouse().getCode().equals(destinationCode))
                .findFirst()
                .orElseGet(() -> {
                    InventoryStock created = stockService.createTransferDestination(
                            item,
                            destinationCode,
                            request.destinationLocationZone(),
                            request.destinationLocationAisle(),
                            request.destinationLocationRack(),
                            request.destinationLocationLevel(),
                            request.destinationLocationPosition(),
                            request.destinationReorderLevel() == null
                                    ? source.getReorderLevel()
                                    : request.destinationReorderLevel()
                    );
                    stocks.add(created);
                    return created;
                });

        if (!destination.getWarehouse().isActive()) {
            throw new InventoryOperationException("La bodega " + destinationCode + " esta desactivada.");
        }

        int sourcePrevious = source.getAvailableQuantity();
        int destinationPrevious = destination.getAvailableQuantity();
        int destinationNew;
        try {
            destinationNew = Math.addExact(destinationPrevious, request.quantity());
        } catch (ArithmeticException ex) {
            throw new InventoryOperationException("El stock destino excede el limite permitido.");
        }

        source.setAvailableQuantity(sourcePrevious - request.quantity());
        destination.setAvailableQuantity(destinationNew);
        stockService.saveAndSynchronize(item, stocks);

        String reference = buildReference();
        String reason = normalizeReason(request.reason());
        InventoryMovementResponse sourceMovement = movementService.recordMovement(
                item,
                sourceCode,
                MovementType.EXIT,
                ActionType.TRANSFER_OUT,
                request.quantity(),
                sourcePrevious,
                source.getAvailableQuantity(),
                "Traslado a " + destinationCode + ": " + reason,
                reference
        );
        InventoryMovementResponse destinationMovement = movementService.recordMovement(
                item,
                destinationCode,
                MovementType.ENTRY,
                ActionType.TRANSFER_IN,
                request.quantity(),
                destinationPrevious,
                destination.getAvailableQuantity(),
                "Traslado desde " + sourceCode + ": " + reason,
                reference
        );

        auditLogService.record(
                "TRANSFER_STOCK",
                item.getSku(),
                item.getProductName(),
                reference + ": " + request.quantity() + " unidades de "
                        + sourceCode + " a " + destinationCode + ". Motivo: " + reason
        );
        log.info(
                "inventory_stock_transferred reference={} sku={} source={} destination={} quantity={}",
                reference,
                item.getSku(),
                sourceCode,
                destinationCode,
                request.quantity()
        );

        return new InventoryTransferResponse(
                reference,
                item.getSku(),
                item.getProductName(),
                sourceCode,
                destinationCode,
                request.quantity(),
                reason,
                sourceMovement,
                destinationMovement
        );
    }

    private String buildReference() {
        return "TRF-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeReason(String value) {
        return value == null || value.isBlank() ? "Reposicion interna" : value.trim();
    }
}

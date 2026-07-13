package com.smartlogix.inventory.service;

import com.smartlogix.inventory.domain.ActionType;
import com.smartlogix.inventory.domain.InventoryHistoryReport;
import com.smartlogix.inventory.domain.InventoryItem;
import com.smartlogix.inventory.domain.InventoryMovement;
import com.smartlogix.inventory.domain.MovementType;
import com.smartlogix.inventory.dto.InventoryHistoryReportResponse;
import com.smartlogix.inventory.dto.InventoryMovementResponse;
import com.smartlogix.inventory.dto.ManualInventoryMovementRequest;
import com.smartlogix.inventory.dto.SaveInventoryHistoryRequest;
import com.smartlogix.inventory.exception.InventoryNotFoundException;
import com.smartlogix.inventory.exception.InventoryOperationException;
import com.smartlogix.inventory.repository.InventoryHistoryReportRepository;
import com.smartlogix.inventory.repository.InventoryItemRepository;
import com.smartlogix.inventory.repository.InventoryMovementRepository;
import jakarta.persistence.criteria.Predicate;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class InventoryMovementService {

    private final InventoryMovementRepository movementRepository;
    private final InventoryItemRepository itemRepository;
    private final InventoryHistoryReportRepository historyReportRepository;

    public InventoryMovementService(
            InventoryMovementRepository movementRepository,
            InventoryItemRepository itemRepository,
            InventoryHistoryReportRepository historyReportRepository
    ) {
        this.movementRepository = movementRepository;
        this.itemRepository = itemRepository;
        this.historyReportRepository = historyReportRepository;
    }

    public InventoryMovementResponse recordMovement(
            InventoryItem item,
            MovementType movementType,
            ActionType actionType,
            int quantity,
            int previousStock,
            int newStock,
            String reason
    ) {
        InventoryMovement movement = new InventoryMovement();
        movement.setInventoryItemId(item.getId());
        movement.setProductName(item.getProductName());
        movement.setSku(item.getSku());
        movement.setMovementType(movementType);
        movement.setActionType(actionType);
        movement.setQuantity(Math.max(quantity, 0));
        movement.setPreviousStock(previousStock);
        movement.setNewStock(newStock);
        movement.setUsername(resolveUsername());
        movement.setReason(normalizeReason(reason));

        return toResponse(movementRepository.save(movement));
    }

    @Transactional(readOnly = true)
    public Page<InventoryMovementResponse> findMovements(
            String product,
            MovementType type,
            ActionType action,
            String user,
            LocalDate startDate,
            LocalDate endDate,
            Integer minQuantity,
            Integer maxQuantity,
            Pageable pageable
    ) {
        return movementRepository.findAll(
                        buildSpecification(product, type, action, user, startDate, endDate, minQuantity, maxQuantity),
                        pageable
                )
                .map(this::toResponse);
    }

    public InventoryMovementResponse registerManualMovement(ManualInventoryMovementRequest request) {
        InventoryItem item = itemRepository.findBySku(request.sku().trim().toUpperCase(Locale.ROOT))
                .orElseThrow(() -> new InventoryNotFoundException("No existe inventario para SKU: " + request.sku()));

        MovementType movementType = parseMovementType(request.movementType());
        int previousStock = item.getAvailableQuantity();
        int newStock = calculateManualStock(previousStock, request.quantity(), movementType);
        int movementQuantity = movementType == MovementType.ADJUSTMENT
                ? Math.abs(newStock - previousStock)
                : request.quantity();

        if (movementType != MovementType.ADJUSTMENT && request.quantity() <= 0) {
            throw new InventoryOperationException("La cantidad debe ser mayor a 0.");
        }
        if (movementType == MovementType.EXIT && previousStock < request.quantity()) {
            throw new InventoryOperationException("Stock insuficiente para registrar la salida.");
        }

        item.setAvailableQuantity(newStock);
        InventoryItem savedItem = itemRepository.save(item);

        return recordMovement(
                savedItem,
                movementType,
                resolveManualAction(movementType),
                movementQuantity,
                previousStock,
                newStock,
                request.reason()
        );
    }

    @Transactional(readOnly = true)
    public ByteArrayResource exportCsv(
            String product,
            MovementType type,
            ActionType action,
            String user,
            LocalDate startDate,
            LocalDate endDate,
            Integer minQuantity,
            Integer maxQuantity
    ) {
        List<InventoryMovement> movements = movementRepository.findAll(
                buildSpecification(product, type, action, user, startDate, endDate, minQuantity, maxQuantity),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );

        StringBuilder csv = new StringBuilder();
        csv.append("Fecha,Producto,SKU,Movimiento,Accion,Cantidad,Stock anterior,Stock nuevo,Usuario,Motivo\n");

        for (InventoryMovement movement : movements) {
            csv.append(csvValue(movement.getCreatedAt()))
                    .append(",")
                    .append(csvValue(movement.getProductName()))
                    .append(",")
                    .append(csvValue(movement.getSku()))
                    .append(",")
                    .append(csvValue(movement.getMovementType()))
                    .append(",")
                    .append(csvValue(movement.getActionType()))
                    .append(",")
                    .append(csvValue(movement.getQuantity()))
                    .append(",")
                    .append(csvValue(movement.getPreviousStock()))
                    .append(",")
                    .append(csvValue(movement.getNewStock()))
                    .append(",")
                    .append(csvValue(movement.getUsername()))
                    .append(",")
                    .append(csvValue(movement.getReason()))
                    .append("\n");
        }

        return new ByteArrayResource(csv.toString().getBytes(StandardCharsets.UTF_8));
    }

    public InventoryHistoryReportResponse saveHistoryReport(SaveInventoryHistoryRequest request) {
        Specification<InventoryMovement> specification = buildSpecification(
                request.product(),
                request.type(),
                request.action(),
                request.user(),
                request.startDate(),
                request.endDate(),
                request.minQuantity(),
                request.maxQuantity()
        );

        long totalMovements = movementRepository.count(specification);

        InventoryHistoryReport report = new InventoryHistoryReport();
        report.setUsername(resolveUsername());
        report.setProductFilter(normalizeOptionalText(request.product()));
        report.setMovementTypeFilter(request.type() == null ? null : request.type().name());
        report.setActionFilter(request.action() == null ? null : request.action().name());
        report.setUserFilter(normalizeOptionalText(request.user()));
        report.setStartDate(request.startDate());
        report.setEndDate(request.endDate());
        report.setMinQuantity(request.minQuantity());
        report.setMaxQuantity(request.maxQuantity());
        report.setTotalMovements(totalMovements);

        return toReportResponse(historyReportRepository.save(report));
    }

    @Transactional(readOnly = true)
    public InventoryHistoryReportResponse findLatestHistoryReport() {
        return historyReportRepository.findTopByOrderByCreatedAtDesc()
                .map(this::toReportResponse)
                .orElse(null);
    }

    private Specification<InventoryMovement> buildSpecification(
            String product,
            MovementType type,
            ActionType action,
            String user,
            LocalDate startDate,
            LocalDate endDate,
            Integer minQuantity,
            Integer maxQuantity
    ) {
        validateQuantityRange(minQuantity, maxQuantity);

        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (product != null && !product.isBlank()) {
                String normalizedProduct = "%" + product.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(criteriaBuilder.or(
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("productName")), normalizedProduct),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("sku")), normalizedProduct)
                ));
            }

            if (type != null) {
                predicates.add(criteriaBuilder.equal(root.get("movementType"), type));
            }

            if (action != null) {
                predicates.add(criteriaBuilder.equal(root.get("actionType"), action));
            }

            if (user != null && !user.isBlank()) {
                String normalizedUser = "%" + user.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("username")), normalizedUser));
            }

            if (startDate != null) {
                LocalDateTime from = startDate.atStartOfDay();
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("createdAt"), from));
            }

            if (endDate != null) {
                LocalDateTime toExclusive = endDate.plusDays(1).atStartOfDay();
                predicates.add(criteriaBuilder.lessThan(root.get("createdAt"), toExclusive));
            }

            if (minQuantity != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("quantity"), minQuantity));
            }

            if (maxQuantity != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("quantity"), maxQuantity));
            }

            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };
    }

    private void validateQuantityRange(Integer minQuantity, Integer maxQuantity) {
        if (minQuantity != null && minQuantity < 0) {
            throw new InventoryOperationException("La cantidad minima no puede ser negativa.");
        }

        if (maxQuantity != null && maxQuantity < 0) {
            throw new InventoryOperationException("La cantidad maxima no puede ser negativa.");
        }

        if (minQuantity != null && maxQuantity != null && minQuantity > maxQuantity) {
            throw new InventoryOperationException("La cantidad minima no puede ser mayor a la maxima.");
        }
    }

    private int calculateManualStock(int previousStock, int quantity, MovementType movementType) {
        return switch (movementType) {
            case ENTRY -> previousStock + quantity;
            case EXIT -> previousStock - quantity;
            case ADJUSTMENT -> quantity;
        };
    }

    private ActionType resolveManualAction(MovementType movementType) {
        return switch (movementType) {
            case ENTRY -> ActionType.MANUAL_ENTRY;
            case EXIT -> ActionType.MANUAL_EXIT;
            case ADJUSTMENT -> ActionType.MANUAL_ADJUSTMENT;
        };
    }

    private MovementType parseMovementType(String movementType) {
        try {
            return MovementType.valueOf(movementType.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new InventoryOperationException("Tipo de movimiento invalido: " + movementType);
        }
    }

    private String resolveUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return "system";
        }

        String username = authentication.getName();
        if (username == null || username.isBlank() || "anonymousUser".equals(username)) {
            return "system";
        }

        return username;
    }

    private String normalizeReason(String reason) {
        if (reason == null || reason.isBlank()) {
            return "Movimiento de inventario";
        }

        return reason.trim();
    }

    private String normalizeOptionalText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }

    private String csvValue(Object value) {
        if (value == null) {
            return "";
        }

        String text = String.valueOf(value).replace("\"", "\"\"");
        if (text.contains(",") || text.contains("\n") || text.contains("\"")) {
            return "\"" + text + "\"";
        }

        return text;
    }

    private InventoryMovementResponse toResponse(InventoryMovement movement) {
        return new InventoryMovementResponse(
                movement.getId(),
                movement.getInventoryItemId(),
                movement.getProductName(),
                movement.getSku(),
                movement.getMovementType().name(),
                movement.getActionType().name(),
                movement.getQuantity(),
                movement.getPreviousStock(),
                movement.getNewStock(),
                movement.getUsername(),
                movement.getReason(),
                movement.getCreatedAt()
        );
    }

    private InventoryHistoryReportResponse toReportResponse(InventoryHistoryReport report) {
        return new InventoryHistoryReportResponse(
                report.getId(),
                report.getUsername(),
                report.getProductFilter(),
                report.getMovementTypeFilter(),
                report.getActionFilter(),
                report.getUserFilter(),
                report.getStartDate(),
                report.getEndDate(),
                report.getMinQuantity(),
                report.getMaxQuantity(),
                report.getTotalMovements(),
                report.getCreatedAt()
        );
    }
}

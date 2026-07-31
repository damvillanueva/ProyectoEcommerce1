package com.smartlogix.inventory.service;

import com.smartlogix.inventory.domain.InventoryItem;
import com.smartlogix.inventory.domain.SupplierProduct;
import com.smartlogix.inventory.dto.ReplenishmentProposalResponse;
import com.smartlogix.inventory.repository.InventoryItemRepository;
import com.smartlogix.inventory.repository.SupplierProductRepository;
import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ReplenishmentService {

    private final InventoryItemRepository itemRepository;
    private final SupplierProductRepository supplierProductRepository;

    public ReplenishmentService(
            InventoryItemRepository itemRepository,
            SupplierProductRepository supplierProductRepository
    ) {
        this.itemRepository = itemRepository;
        this.supplierProductRepository = supplierProductRepository;
    }

    public List<ReplenishmentProposalResponse> findProposals() {
        return itemRepository.findAll().stream()
                .filter(item -> item.getReorderLevel() > 0)
                .filter(item -> item.getAvailableQuantity() <= item.getReorderLevel() * 3)
                .map(this::toProposal)
                .sorted(Comparator.comparingDouble(this::coverageRatio)
                        .thenComparing(ReplenishmentProposalResponse::productName))
                .toList();
    }

    private ReplenishmentProposalResponse toProposal(InventoryItem item) {
        SupplierProduct supplierProduct = supplierProductRepository
                .findByItem_SkuAndPreferredTrue(item.getSku()).stream()
                .findFirst()
                .orElseGet(() -> supplierProductRepository.findByItem_Sku(item.getSku()).stream()
                        .findFirst()
                        .orElse(null));
        int targetStock = item.getReorderLevel() * 4;
        int baseSuggestion = Math.max(targetStock - item.getAvailableQuantity(), 1);
        int suggestedQuantity = supplierProduct == null
                ? baseSuggestion
                : Math.max(baseSuggestion, supplierProduct.getMinimumOrderQuantity());
        BigDecimal unitCost = supplierProduct == null ? null : supplierProduct.getUnitCost();
        return new ReplenishmentProposalResponse(
                item.getSku(),
                item.getProductName(),
                item.getWarehouseCode(),
                item.getAvailableQuantity(),
                item.getReorderLevel(),
                suggestedQuantity,
                supplierProduct == null ? null : supplierProduct.getSupplier().getId(),
                supplierProduct == null ? null : supplierProduct.getSupplier().getBusinessName(),
                supplierProduct == null ? null : supplierProduct.getSupplierSku(),
                unitCost,
                unitCost == null ? null : unitCost.multiply(BigDecimal.valueOf(suggestedQuantity))
        );
    }

    private double coverageRatio(ReplenishmentProposalResponse proposal) {
        return (double) proposal.availableQuantity() / Math.max(proposal.reorderLevel(), 1);
    }
}

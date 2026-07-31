package com.smartlogix.inventory.service;

import com.smartlogix.inventory.domain.InventoryItem;
import com.smartlogix.inventory.domain.Supplier;
import com.smartlogix.inventory.domain.SupplierProduct;
import com.smartlogix.inventory.dto.SupplierProductRequest;
import com.smartlogix.inventory.dto.SupplierProductResponse;
import com.smartlogix.inventory.dto.SupplierRequest;
import com.smartlogix.inventory.dto.SupplierResponse;
import com.smartlogix.inventory.exception.InventoryNotFoundException;
import com.smartlogix.inventory.exception.InventoryOperationException;
import com.smartlogix.inventory.repository.InventoryItemRepository;
import com.smartlogix.inventory.repository.SupplierProductRepository;
import com.smartlogix.inventory.repository.SupplierRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class SupplierService {

    private final SupplierRepository supplierRepository;
    private final SupplierProductRepository supplierProductRepository;
    private final InventoryItemRepository itemRepository;

    public SupplierService(
            SupplierRepository supplierRepository,
            SupplierProductRepository supplierProductRepository,
            InventoryItemRepository itemRepository
    ) {
        this.supplierRepository = supplierRepository;
        this.supplierProductRepository = supplierProductRepository;
        this.itemRepository = itemRepository;
    }

    @Transactional(readOnly = true)
    public List<SupplierResponse> findAll() {
        return supplierRepository.findAllByOrderByBusinessNameAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public SupplierResponse findById(Long id) {
        return toResponse(loadSupplier(id));
    }

    public SupplierResponse create(SupplierRequest request) {
        String code = normalizeCode(request.code());
        String taxId = normalizeAndValidateTaxId(request.taxId());
        if (supplierRepository.existsByCode(code)) {
            throw new InventoryOperationException("Ya existe un proveedor con codigo " + code + ".");
        }
        if (supplierRepository.existsByTaxId(taxId)) {
            throw new InventoryOperationException("Ya existe un proveedor con ese RUT.");
        }

        Supplier supplier = new Supplier();
        applyRequest(supplier, request, code, taxId);
        return toResponse(supplierRepository.save(supplier));
    }

    public SupplierResponse update(Long id, SupplierRequest request) {
        Supplier supplier = loadSupplier(id);
        String code = normalizeCode(request.code());
        String taxId = normalizeAndValidateTaxId(request.taxId());
        if (supplierRepository.existsByCodeAndIdNot(code, id)) {
            throw new InventoryOperationException("Ya existe un proveedor con codigo " + code + ".");
        }
        if (supplierRepository.existsByTaxIdAndIdNot(taxId, id)) {
            throw new InventoryOperationException("Ya existe un proveedor con ese RUT.");
        }

        applyRequest(supplier, request, code, taxId);
        return toResponse(supplierRepository.save(supplier));
    }

    public SupplierResponse deactivate(Long id) {
        Supplier supplier = loadSupplier(id);
        supplier.setActive(false);
        return toResponse(supplierRepository.save(supplier));
    }

    public SupplierResponse upsertProduct(Long supplierId, SupplierProductRequest request) {
        Supplier supplier = loadSupplier(supplierId);
        if (!supplier.isActive()) {
            throw new InventoryOperationException("No se pueden asociar productos a un proveedor inactivo.");
        }

        String sku = normalizeSku(request.sku());
        InventoryItem item = itemRepository.findBySku(sku)
                .orElseThrow(() -> new InventoryNotFoundException("No existe inventario para SKU: " + sku));
        SupplierProduct association = supplierProductRepository
                .findBySupplier_IdAndItem_Sku(supplierId, sku)
                .orElseGet(SupplierProduct::new);

        if (request.preferred()) {
            List<SupplierProduct> currentPreferred = supplierProductRepository.findByItem_SkuAndPreferredTrue(sku);
            currentPreferred.stream()
                    .filter(current -> association.getId() == null || !current.getId().equals(association.getId()))
                    .forEach(current -> current.setPreferred(false));
            supplierProductRepository.saveAll(currentPreferred);
        }

        association.setSupplier(supplier);
        association.setItem(item);
        association.setSupplierSku(normalizeCode(request.supplierSku()));
        association.setUnitCost(request.unitCost().setScale(2, RoundingMode.HALF_UP));
        association.setMinimumOrderQuantity(request.minimumOrderQuantity());
        association.setPreferred(request.preferred());
        supplierProductRepository.save(association);
        return toResponse(supplier);
    }

    public SupplierResponse removeProduct(Long supplierId, String sku) {
        Supplier supplier = loadSupplier(supplierId);
        SupplierProduct association = supplierProductRepository
                .findBySupplier_IdAndItem_Sku(supplierId, normalizeSku(sku))
                .orElseThrow(() -> new InventoryNotFoundException("El producto no esta asociado al proveedor."));
        supplierProductRepository.delete(association);
        return toResponse(supplier);
    }

    Supplier loadSupplier(Long id) {
        return supplierRepository.findById(id)
                .orElseThrow(() -> new InventoryNotFoundException("No existe el proveedor solicitado."));
    }

    private void applyRequest(Supplier supplier, SupplierRequest request, String code, String taxId) {
        supplier.setCode(code);
        supplier.setBusinessName(request.businessName().trim());
        supplier.setTaxId(taxId);
        supplier.setContactName(normalizeOptional(request.contactName()));
        supplier.setEmail(request.email().trim().toLowerCase(Locale.ROOT));
        supplier.setPhone(normalizeOptional(request.phone()));
        supplier.setAddress(normalizeOptional(request.address()));
        supplier.setPaymentTermsDays(request.paymentTermsDays());
        supplier.setLeadTimeDays(request.leadTimeDays());
        supplier.setActive(request.active());
    }

    private SupplierResponse toResponse(Supplier supplier) {
        List<SupplierProductResponse> products = supplierProductRepository
                .findBySupplier_IdOrderByItem_ProductNameAsc(supplier.getId()).stream()
                .map(this::toProductResponse)
                .toList();
        return new SupplierResponse(
                supplier.getId(),
                supplier.getCode(),
                supplier.getBusinessName(),
                supplier.getTaxId(),
                supplier.getContactName(),
                supplier.getEmail(),
                supplier.getPhone(),
                supplier.getAddress(),
                supplier.getPaymentTermsDays(),
                supplier.getLeadTimeDays(),
                supplier.isActive(),
                products,
                supplier.getCreatedAt(),
                supplier.getUpdatedAt()
        );
    }

    private SupplierProductResponse toProductResponse(SupplierProduct association) {
        BigDecimal salePrice = association.getItem().getSalePrice();
        BigDecimal marginAmount = salePrice.subtract(association.getUnitCost()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal marginPercentage = salePrice.signum() == 0
                ? BigDecimal.ZERO
                : marginAmount.multiply(BigDecimal.valueOf(100))
                        .divide(salePrice, 1, RoundingMode.HALF_UP);
        BigDecimal suggestedSalePrice = association.getUnitCost()
                .divide(BigDecimal.valueOf(0.75), 0, RoundingMode.CEILING);
        return new SupplierProductResponse(
                association.getId(),
                association.getItem().getSku(),
                association.getItem().getProductName(),
                association.getSupplierSku(),
                association.getUnitCost(),
                association.getMinimumOrderQuantity(),
                association.isPreferred(),
                salePrice,
                marginAmount,
                marginPercentage,
                suggestedSalePrice,
                association.getUpdatedAt()
        );
    }

    private String normalizeAndValidateTaxId(String value) {
        String normalized = value == null
                ? ""
                : value.replace(".", "").replace(" ", "").toUpperCase(Locale.ROOT);
        if (!normalized.matches("[0-9]{7,8}-[0-9K]")) {
            throw new InventoryOperationException("El RUT del proveedor no tiene un formato valido.");
        }

        String[] parts = normalized.split("-");
        int factor = 2;
        int sum = 0;
        for (int index = parts[0].length() - 1; index >= 0; index--) {
            sum += Character.digit(parts[0].charAt(index), 10) * factor;
            factor = factor == 7 ? 2 : factor + 1;
        }
        int result = 11 - (sum % 11);
        String expected = result == 11 ? "0" : result == 10 ? "K" : String.valueOf(result);
        if (!expected.equals(parts[1])) {
            throw new InventoryOperationException("El digito verificador del RUT no es valido.");
        }
        return normalized;
    }

    private String normalizeCode(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeSku(String value) {
        return normalizeCode(value);
    }

    private String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}

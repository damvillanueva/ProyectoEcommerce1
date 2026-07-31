package com.smartlogix.inventory.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.smartlogix.inventory.domain.Supplier;
import com.smartlogix.inventory.dto.SupplierRequest;
import com.smartlogix.inventory.dto.SupplierResponse;
import com.smartlogix.inventory.exception.InventoryOperationException;
import com.smartlogix.inventory.repository.InventoryItemRepository;
import com.smartlogix.inventory.repository.SupplierProductRepository;
import com.smartlogix.inventory.repository.SupplierRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SupplierServiceTest {

    @Mock
    private SupplierRepository supplierRepository;
    @Mock
    private SupplierProductRepository supplierProductRepository;
    @Mock
    private InventoryItemRepository itemRepository;

    private SupplierService supplierService;

    @BeforeEach
    void setUp() {
        supplierService = new SupplierService(
                supplierRepository,
                supplierProductRepository,
                itemRepository
        );
    }

    @Test
    void createNormalizesAndValidatesChileanTaxId() {
        when(supplierRepository.save(any(Supplier.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(supplierProductRepository.findBySupplier_IdOrderByItem_ProductNameAsc(any()))
                .thenReturn(List.of());

        SupplierResponse response = supplierService.create(request(" td-demo ", "76.123.456-0"));

        assertThat(response.code()).isEqualTo("TD-DEMO");
        assertThat(response.taxId()).isEqualTo("76123456-0");
        assertThat(response.email()).isEqualTo("compras@proveedor.cl");
    }

    @Test
    void createRejectsInvalidTaxIdCheckDigit() {
        assertThatThrownBy(() -> supplierService.create(request("TD-DEMO", "76.123.456-7")))
                .isInstanceOf(InventoryOperationException.class)
                .hasMessageContaining("digito verificador");
    }

    private SupplierRequest request(String code, String taxId) {
        return new SupplierRequest(
                code,
                "Proveedor de prueba",
                taxId,
                "Ana Perez",
                "COMPRAS@PROVEEDOR.CL",
                "+56 2 2000 0000",
                "Santiago",
                30,
                5,
                true
        );
    }
}

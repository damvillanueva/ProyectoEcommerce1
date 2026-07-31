package com.smartlogix.inventory.config;

import com.smartlogix.inventory.domain.InventoryItem;
import com.smartlogix.inventory.domain.Supplier;
import com.smartlogix.inventory.domain.SupplierProduct;
import com.smartlogix.inventory.repository.InventoryItemRepository;
import com.smartlogix.inventory.repository.SupplierProductRepository;
import com.smartlogix.inventory.repository.SupplierRepository;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;

@Configuration
public class ProcurementSeedConfig {

    @Bean
    @Order(3)
    CommandLineRunner procurementSeeder(
            SupplierRepository supplierRepository,
            SupplierProductRepository supplierProductRepository,
            InventoryItemRepository itemRepository
    ) {
        return args -> {
            if (supplierRepository.count() > 0) {
                return;
            }

            Supplier techData = supplierRepository.save(supplier(
                    "TECHDATA", "TechData Chile SpA", "76123456-0", "Camila Soto",
                    "compras@techdata.demo", "+56 2 2345 1000", 30, 4
            ));
            Supplier ingram = supplierRepository.save(supplier(
                    "INGRAM", "Ingram Micro Chile", "77654321-7", "Rodrigo Diaz",
                    "ventas@ingram.demo", "+56 2 2780 2200", 45, 6
            ));
            Supplier pacifico = supplierRepository.save(supplier(
                    "PACIFICO", "Distribuidora Pacifico Ltda.", "96789540-7", "Paula Reyes",
                    "abastecimiento@pacifico.demo", "+56 32 245 8800", 15, 3
            ));

            List<ProductSeed> products = List.of(
                    product(techData, "SKU-1001", "TD-RDK-K552", 22990, 10),
                    product(techData, "SKU-2001", "TD-SAM-G3-24", 104990, 4),
                    product(techData, "SKU-3003", "TD-HP-V15", 689990, 2),
                    product(ingram, "SKU-3001", "IM-LNV-SLIM3", 349990, 2),
                    product(ingram, "SKU-4001", "IM-ASUS-4060", 319990, 2),
                    product(ingram, "SKU-7001", "IM-APC-1200", 94990, 3),
                    product(pacifico, "SKU-1003", "DP-HX-CLOUD3", 72990, 4),
                    product(pacifico, "SKU-4006", "DP-NZXT-H5", 69990, 3),
                    product(pacifico, "SKU-7003", "DP-COUGAR-A1", 139990, 2),
                    product(pacifico, "SKU-7005", "DP-CAN-G3170", 134990, 2)
            );
            products.forEach(seed -> itemRepository.findBySku(seed.sku()).ifPresent(item ->
                    supplierProductRepository.save(association(seed, item))
            ));
        };
    }

    private Supplier supplier(
            String code,
            String name,
            String taxId,
            String contact,
            String email,
            String phone,
            int paymentTerms,
            int leadTime
    ) {
        Supplier supplier = new Supplier();
        supplier.setCode(code);
        supplier.setBusinessName(name);
        supplier.setTaxId(taxId);
        supplier.setContactName(contact);
        supplier.setEmail(email);
        supplier.setPhone(phone);
        supplier.setAddress("Chile");
        supplier.setPaymentTermsDays(paymentTerms);
        supplier.setLeadTimeDays(leadTime);
        supplier.setActive(true);
        return supplier;
    }

    private ProductSeed product(Supplier supplier, String sku, String supplierSku, long unitCost, int minimum) {
        return new ProductSeed(supplier, sku, supplierSku, BigDecimal.valueOf(unitCost), minimum);
    }

    private SupplierProduct association(ProductSeed seed, InventoryItem item) {
        SupplierProduct association = new SupplierProduct();
        association.setSupplier(seed.supplier());
        association.setItem(item);
        association.setSupplierSku(seed.supplierSku());
        association.setUnitCost(seed.unitCost());
        association.setMinimumOrderQuantity(seed.minimum());
        association.setPreferred(true);
        return association;
    }

    private record ProductSeed(
            Supplier supplier,
            String sku,
            String supplierSku,
            BigDecimal unitCost,
            int minimum
    ) {
    }
}

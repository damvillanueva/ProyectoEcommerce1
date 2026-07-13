package com.smartlogix.inventory.config;

import com.smartlogix.inventory.domain.InventoryItem;
import com.smartlogix.inventory.repository.InventoryItemRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class InventorySeedConfig {

    @Bean
    CommandLineRunner inventorySeeder(InventoryItemRepository repository) {
        return args -> {
            if (repository.count() > 0) {
                return;
            }

            repository.save(buildItem("SKU-1001", "Teclado Mecanico RGB", "WH-SCL-01", 120, 20,
                    "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=240&q=80"));
            repository.save(buildItem("SKU-2001", "Mouse Inalambrico", "WH-SCL-01", 200, 30,
                    "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=240&q=80"));
            repository.save(buildItem("SKU-3001", "Monitor 24 Pulgadas", "WH-VAP-02", 45, 10,
                    "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=240&q=80"));
        };
    }

    private InventoryItem buildItem(
            String sku,
            String name,
            String warehouse,
            int available,
            int reorderLevel,
            String imageUrl
    ) {
        InventoryItem item = new InventoryItem();
        item.setSku(sku);
        item.setProductName(name);
        item.setImageUrl(imageUrl);
        item.setWarehouseCode(warehouse);
        item.setAvailableQuantity(available);
        item.setReservedQuantity(0);
        item.setReorderLevel(reorderLevel);
        return item;
    }
}

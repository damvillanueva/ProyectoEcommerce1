package com.smartlogix.inventory.config;

import com.smartlogix.inventory.domain.InventoryItem;
import com.smartlogix.inventory.domain.InventoryStock;
import com.smartlogix.inventory.repository.InventoryItemRepository;
import com.smartlogix.inventory.repository.InventoryStockRepository;
import com.smartlogix.inventory.repository.WarehouseRepository;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;

@Configuration
public class InventorySeedConfig {

    @Bean
    @Order(1)
    CommandLineRunner inventorySeeder(
            InventoryItemRepository repository,
            InventoryStockRepository stockRepository,
            WarehouseRepository warehouseRepository
    ) {
        return args -> {
            if (repository.count() > 0) {
                return;
            }

            List<ProductSeed> products = List.of(
                    product("SKU-1001", "Teclado Redragon Kumara K552 RGB", "Redragon", "Perifericos", 34990, 49990, "WH-SCL-01", 120, 20, true, true, false, "Switches mecanicos, formato compacto y retroiluminacion RGB.", "photo-1587829741301-dc798b83add3"),
                    product("SKU-1002", "Mouse Logitech Signature M650", "Logitech", "Perifericos", 24990, 32990, "WH-SCL-01", 85, 15, true, true, false, "Mouse inalambrico silencioso con conexion Bluetooth y receptor USB.", "photo-1615663245857-ac93bb7c39e7"),
                    product("SKU-1003", "Audifonos HyperX Cloud III", "HyperX", "Gaming", 99990, 119990, "WH-SCL-01", 34, 8, true, false, false, "Audio espacial, microfono desmontable y estructura reforzada.", "photo-1505740420928-5e560c06d30e"),
                    product("SKU-1004", "Webcam Logitech C920 Full HD", "Logitech", "Perifericos", 74990, 89990, "WH-CON-03", 28, 6, false, true, false, "Videollamadas Full HD 1080p con enfoque automatico.", "photo-1587826080692-f439cd0b70da"),
                    product("SKU-1005", "Microfono Fifine A6T USB", "Fifine", "Gaming", 49990, 59990, "WH-CON-03", 22, 5, false, true, false, "Microfono condensador USB con control tactil y soporte articulado.", "photo-1590602847861-f357a9332bbc"),
                    product("SKU-2001", "Monitor Samsung Odyssey G3 24", "Samsung", "Monitores", 139990, 169990, "WH-VAP-02", 45, 10, true, true, true, "Panel Full HD de 24 pulgadas, 165 Hz y 1 ms para gaming fluido.", "photo-1527443224154-c4a3942d3acf"),
                    product("SKU-2002", "Monitor LG UltraGear 27 QHD", "LG", "Monitores", 249990, 299990, "WH-VAP-02", 18, 5, true, false, true, "Pantalla QHD IPS de 27 pulgadas con 144 Hz y HDR10.", "photo-1547119957-637f8679db1e"),
                    product("SKU-3001", "Notebook Lenovo IdeaPad Slim 3", "Lenovo", "Notebooks", 429990, 499990, "WH-SCL-01", 26, 5, true, true, true, "Ryzen 5, 16 GB RAM, SSD 512 GB y pantalla Full HD de 15 pulgadas.", "photo-1496181133206-80ce9b88a853"),
                    product("SKU-3002", "Notebook ASUS Vivobook 15", "ASUS", "Notebooks", 549990, 629990, "WH-ANT-04", 14, 4, false, false, true, "Intel Core i5, 16 GB RAM y almacenamiento SSD de 1 TB.", "photo-1517336714731-489689fd1ca8"),
                    product("SKU-3003", "Notebook HP Victus 15 Gaming", "HP", "Notebooks", 849990, 949990, "WH-CON-03", 9, 3, true, false, true, "Ryzen 7, RTX 4050, 16 GB RAM y pantalla de 144 Hz.", "photo-1603302576837-37561b2e2302"),
                    product("SKU-4001", "Tarjeta de Video ASUS Dual RTX 4060", "ASUS", "Componentes", 389990, 449990, "WH-SCL-01", 16, 4, true, false, true, "GPU NVIDIA de 8 GB GDDR6 con refrigeracion de doble ventilador.", "photo-1591799264318-7e6ef8ddb7ea"),
                    product("SKU-4002", "Procesador AMD Ryzen 5 5600G", "AMD", "Componentes", 109990, 139990, "WH-ANT-04", 38, 8, false, true, false, "Procesador de 6 nucleos con graficos Radeon integrados.", "photo-1555617981-dac3880eac6e"),
                    product("SKU-4003", "Placa Madre Gigabyte B550M DS3H", "Gigabyte", "Componentes", 89990, 109990, "WH-SCL-01", 31, 7, false, true, false, "Socket AM4, cuatro ranuras DDR4 y soporte para PCIe 4.0.", "photo-1518770660439-4636190af475"),
                    product("SKU-4004", "Memoria Kingston Fury Beast 16 GB", "Kingston", "Componentes", 47990, 59990, "WH-CON-03", 72, 12, false, true, false, "Kit DDR4 de 3200 MHz para gaming y productividad.", "photo-1562976540-1502c2145186"),
                    product("SKU-4005", "Fuente Corsair CX650 80 Plus Bronze", "Corsair", "Componentes", 69990, 84990, "WH-VAP-02", 24, 6, false, false, false, "Fuente de poder de 650 W eficiente y confiable para PC.", "photo-1591488320449-011701bb6704"),
                    product("SKU-4006", "Gabinete NZXT H5 Flow", "NZXT", "Componentes", 94990, 119990, "WH-VAP-02", 12, 4, false, false, true, "Gabinete ATX con flujo de aire optimizado y panel lateral de vidrio.", "photo-1587202372634-32705e3bf49c"),
                    product("SKU-5001", "SSD Kingston NV2 1 TB NVMe", "Kingston", "Almacenamiento", 62990, 79990, "WH-SCL-01", 64, 12, true, true, false, "Unidad NVMe PCIe 4.0 para cargas y transferencias mas rapidas.", "photo-1597872200969-2b65d56bd16b"),
                    product("SKU-5002", "Disco Seagate Barracuda 2 TB", "Seagate", "Almacenamiento", 58990, 69990, "WH-ANT-04", 42, 10, false, true, false, "Disco duro SATA de 2 TB para archivos, juegos y respaldos.", "photo-1531492746076-161ca9bcad58"),
                    product("SKU-5003", "SSD Externo SanDisk Extreme 1 TB", "SanDisk", "Almacenamiento", 99990, 119990, "WH-CON-03", 20, 5, false, true, false, "Almacenamiento portatil USB-C resistente a golpes y salpicaduras.", "photo-1531492746076-161ca9bcad58"),
                    product("SKU-6001", "Router TP-Link Archer AX55 WiFi 6", "TP-Link", "Redes", 89990, 109990, "WH-SCL-01", 27, 6, true, true, false, "Router WiFi 6 de doble banda con cobertura para hogares conectados.", "photo-1544197150-b99a580bb7a8"),
                    product("SKU-6002", "Switch TP-Link TL-SG108 8 Puertos", "TP-Link", "Redes", 32990, 39990, "WH-ANT-04", 36, 8, false, true, false, "Switch Gigabit metalico sin configuracion para oficina y hogar.", "photo-1544197150-b99a580bb7a8"),
                    product("SKU-7001", "UPS APC Easy 1200VA", "APC", "Oficina", 129990, 149990, "WH-CON-03", 11, 4, false, false, true, "Respaldo electrico y proteccion para computadores y equipos de red.", "photo-1625842268584-8f3296236761"),
                    product("SKU-7002", "Impresora Epson EcoTank L3250", "Epson", "Oficina", 169990, 199990, "WH-VAP-02", 17, 5, true, false, true, "Multifuncional WiFi con sistema de tinta recargable de alto rendimiento.", "photo-1612815154858-60aa4c59eaa6"),
                    product("SKU-7003", "Silla Gamer Cougar Armor One", "Cougar", "Gaming", 189990, 229990, "WH-ANT-04", 8, 3, false, false, true, "Silla reclinable con soporte lumbar y estructura de acero.", "photo-1598550476439-6847785fcea6"),
                    product("SKU-7004", "Control Inalambrico Xbox Series", "Microsoft", "Gaming", 59990, 69990, "WH-SCL-01", 33, 7, false, true, false, "Control Bluetooth compatible con Xbox, PC y dispositivos moviles.", "photo-1606144042614-b2417e99c4e3"),
                    product("SKU-7005", "Impresora Canon PIXMA G3170", "Canon", "Oficina", 179990, 209990, "WH-CON-03", 13, 4, false, false, true, "Multifuncional de tinta continua con WiFi y pantalla LCD.", "photo-1612815154858-60aa4c59eaa6")
            );

            for (int index = 0; index < products.size(); index++) {
                InventoryItem item = repository.save(buildItem(products.get(index), index));
                InventoryStock stock = new InventoryStock();
                stock.setItem(item);
                stock.setWarehouse(warehouseRepository.findById(item.getWarehouseCode())
                        .orElseThrow(() -> new IllegalStateException(
                                "No existe la bodega inicial " + item.getWarehouseCode()
                        )));
                stock.setLocationZone(item.getLocationZone());
                stock.setLocationAisle(item.getLocationAisle());
                stock.setLocationRack(item.getLocationRack());
                stock.setLocationLevel(item.getLocationLevel());
                stock.setLocationPosition(item.getLocationPosition());
                stock.setAvailableQuantity(item.getAvailableQuantity());
                stock.setReservedQuantity(item.getReservedQuantity());
                stock.setReorderLevel(item.getReorderLevel());
                stockRepository.save(stock);
            }
        };
    }

    private ProductSeed product(
            String sku,
            String name,
            String brand,
            String category,
            long salePrice,
            long originalPrice,
            String warehouse,
            int available,
            int reorderLevel,
            boolean featured,
            boolean fastShipping,
            boolean freeShipping,
            String description,
            String imageId
    ) {
        return new ProductSeed(
                sku,
                name,
                brand,
                category,
                BigDecimal.valueOf(salePrice),
                BigDecimal.valueOf(originalPrice),
                warehouse,
                available,
                reorderLevel,
                featured,
                fastShipping,
                freeShipping,
                description,
                "https://images.unsplash.com/" + imageId + "?auto=format&fit=crop&w=720&q=82"
        );
    }

    private InventoryItem buildItem(ProductSeed seed, int index) {
        InventoryItem item = new InventoryItem();
        item.setSku(seed.sku());
        item.setProductName(seed.name());
        item.setBrand(seed.brand());
        item.setCategory(seed.category());
        item.setShortDescription(seed.description());
        item.setImageUrl(seed.imageUrl());
        item.setSalePrice(seed.salePrice());
        item.setOriginalPrice(seed.originalPrice());
        item.setFeatured(seed.featured());
        item.setFastShipping(seed.fastShipping());
        item.setFreeShipping(seed.freeShipping());
        item.setStorePickup(true);
        item.setWarehouseCode(seed.warehouse());
        item.setLocationZone(seed.category().substring(0, 1).toUpperCase());
        item.setLocationAisle(String.valueOf((char) ('A' + (index % 6))));
        item.setLocationRack((index % 8) + 1);
        item.setLocationLevel((index % 4) + 1);
        item.setLocationPosition((index % 12) + 1);
        item.setAvailableQuantity(seed.available());
        item.setReservedQuantity(0);
        item.setReorderLevel(seed.reorderLevel());
        return item;
    }

    private record ProductSeed(
            String sku,
            String name,
            String brand,
            String category,
            BigDecimal salePrice,
            BigDecimal originalPrice,
            String warehouse,
            int available,
            int reorderLevel,
            boolean featured,
            boolean fastShipping,
            boolean freeShipping,
            String description,
            String imageUrl
    ) {
    }
}

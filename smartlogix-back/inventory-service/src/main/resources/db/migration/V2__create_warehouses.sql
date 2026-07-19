CREATE TABLE warehouses (
    code VARCHAR(40) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    city VARCHAR(80) NOT NULL,
    region VARCHAR(80) NOT NULL,
    address VARCHAR(220) NOT NULL,
    active BOOLEAN NOT NULL,
    dispatch_priority INTEGER NOT NULL,
    aisle_count INTEGER NOT NULL,
    rack_count INTEGER NOT NULL,
    level_count INTEGER NOT NULL,
    positions_per_level INTEGER NOT NULL,
    created_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP(6) WITH TIME ZONE NOT NULL
);

INSERT INTO warehouses (
    code, name, city, region, address, active, dispatch_priority,
    aisle_count, rack_count, level_count, positions_per_level, created_at, updated_at
) VALUES
    ('WH-SCL-01', 'Bodega Santiago', 'Santiago', 'Region Metropolitana', 'Av. Industrial 1200, Santiago', TRUE, 10, 6, 8, 4, 12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('WH-VAP-02', 'Bodega Valparaiso', 'Valparaiso', 'Valparaiso', 'Camino La Polvora 850, Valparaiso', TRUE, 20, 6, 8, 4, 12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('WH-CON-03', 'Bodega Concepcion', 'Concepcion', 'Biobio', 'Av. Jorge Alessandri 2100, Concepcion', TRUE, 30, 6, 8, 4, 12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('WH-ANT-04', 'Bodega Antofagasta', 'Antofagasta', 'Antofagasta', 'Ruta 26 5400, Antofagasta', TRUE, 40, 6, 8, 4, 12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO warehouses (
    code, name, city, region, address, active, dispatch_priority,
    aisle_count, rack_count, level_count, positions_per_level, created_at, updated_at
)
SELECT DISTINCT
    inventory.warehouse_code,
    CONCAT('Bodega ', inventory.warehouse_code),
    'Sin ciudad',
    'Sin region',
    'Direccion pendiente',
    TRUE,
    100,
    6,
    8,
    4,
    12,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM inventory_items inventory
WHERE NOT EXISTS (
    SELECT 1 FROM warehouses warehouse WHERE warehouse.code = inventory.warehouse_code
);

ALTER TABLE inventory_items
    ADD CONSTRAINT fk_inventory_items_warehouse
    FOREIGN KEY (warehouse_code) REFERENCES warehouses (code);

CREATE INDEX idx_inventory_items_warehouse ON inventory_items (warehouse_code);

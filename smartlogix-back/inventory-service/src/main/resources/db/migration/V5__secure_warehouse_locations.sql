CREATE TABLE warehouse_zones (
    warehouse_code VARCHAR(40) NOT NULL,
    zone_code VARCHAR(20) NOT NULL,
    zone_order INTEGER NOT NULL,
    CONSTRAINT pk_warehouse_zones PRIMARY KEY (warehouse_code, zone_code),
    CONSTRAINT uk_warehouse_zones_order UNIQUE (warehouse_code, zone_order),
    CONSTRAINT fk_warehouse_zones_warehouse
        FOREIGN KEY (warehouse_code) REFERENCES warehouses (code) ON DELETE CASCADE
);

WITH zone_candidates AS (
    SELECT warehouse.code AS warehouse_code, standard.zone_code
    FROM warehouses warehouse
    CROSS JOIN (VALUES ('A'), ('C'), ('G'), ('M'), ('N'), ('O'), ('P'), ('R')) AS standard(zone_code)
    UNION
    SELECT warehouse_code, UPPER(TRIM(location_zone))
    FROM inventory_stocks
    WHERE location_zone IS NOT NULL AND TRIM(location_zone) <> ''
), ordered_zones AS (
    SELECT
        warehouse_code,
        zone_code,
        ROW_NUMBER() OVER (PARTITION BY warehouse_code ORDER BY zone_code) - 1 AS zone_order
    FROM zone_candidates
)
INSERT INTO warehouse_zones (warehouse_code, zone_code, zone_order)
SELECT warehouse_code, zone_code, zone_order
FROM ordered_zones;

UPDATE inventory_stocks SET location_zone = 'G'
WHERE location_zone IS NULL OR TRIM(location_zone) = '';

UPDATE inventory_stocks SET location_aisle = 'A'
WHERE location_aisle IS NULL OR TRIM(location_aisle) = '';

UPDATE inventory_stocks
SET location_zone = UPPER(TRIM(location_zone)),
    location_aisle = UPPER(TRIM(location_aisle));

ALTER TABLE inventory_stocks ALTER COLUMN location_zone SET NOT NULL;
ALTER TABLE inventory_stocks ALTER COLUMN location_aisle SET NOT NULL;

ALTER TABLE inventory_stocks
    ADD CONSTRAINT ck_inventory_stocks_location_positive
        CHECK (location_rack >= 1 AND location_level >= 1 AND location_position >= 1),
    ADD CONSTRAINT uk_inventory_stocks_warehouse_location
        UNIQUE (
            warehouse_code, location_zone, location_aisle,
            location_rack, location_level, location_position
        );

CREATE INDEX idx_inventory_stocks_location
    ON inventory_stocks (
        warehouse_code, location_zone, location_aisle,
        location_rack, location_level, location_position
    );

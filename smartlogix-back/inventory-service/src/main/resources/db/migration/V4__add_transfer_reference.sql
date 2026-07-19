ALTER TABLE inventory_movements ADD COLUMN transfer_reference VARCHAR(40);

CREATE INDEX idx_inventory_movements_transfer_reference
    ON inventory_movements (transfer_reference);

package com.smartlogix.order.client;

import java.util.List;

public record RestockInventoryBatchRequest(
        String warehouseCode,
        String reference,
        List<RestockInventoryLineRequest> lines
) {
}

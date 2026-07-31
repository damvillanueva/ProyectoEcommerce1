package com.smartlogix.order.client;

import java.util.List;

public record DispatchInventoryBatchRequest(List<InventoryBatchLineRequest> lines) {
}

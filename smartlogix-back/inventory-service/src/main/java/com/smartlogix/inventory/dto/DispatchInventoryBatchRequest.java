package com.smartlogix.inventory.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record DispatchInventoryBatchRequest(
        @NotEmpty List<@Valid InventoryBatchLineRequest> lines
) {
}

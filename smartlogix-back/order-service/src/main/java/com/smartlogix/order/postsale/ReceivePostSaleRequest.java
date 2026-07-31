package com.smartlogix.order.postsale;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record ReceivePostSaleRequest(
        @NotBlank String warehouseCode,
        @NotEmpty List<@Valid ReceivePostSaleLineRequest> lines
) {
}

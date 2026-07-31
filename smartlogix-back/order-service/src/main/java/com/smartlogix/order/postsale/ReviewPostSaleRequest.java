package com.smartlogix.order.postsale;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReviewPostSaleRequest(
        boolean approved,
        @NotBlank @Size(max = 500) String response
) {
}

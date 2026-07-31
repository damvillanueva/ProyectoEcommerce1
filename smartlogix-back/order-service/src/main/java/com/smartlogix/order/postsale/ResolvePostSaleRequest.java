package com.smartlogix.order.postsale;

import com.smartlogix.order.domain.PostSaleResolution;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ResolvePostSaleRequest(
        @NotNull PostSaleResolution resolution,
        @NotBlank @Size(max = 500) String notes
) {
}

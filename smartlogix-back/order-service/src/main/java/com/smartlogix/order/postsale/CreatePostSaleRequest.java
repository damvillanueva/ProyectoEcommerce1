package com.smartlogix.order.postsale;

import com.smartlogix.order.domain.PostSaleResolution;
import com.smartlogix.order.domain.PostSaleType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CreatePostSaleRequest(
        @NotNull PostSaleType type,
        @NotNull PostSaleResolution preferredResolution,
        @NotBlank @Size(max = 120) String reason,
        @Size(max = 500) String notes,
        @NotEmpty List<@Valid CreatePostSaleLineRequest> lines
) {
}

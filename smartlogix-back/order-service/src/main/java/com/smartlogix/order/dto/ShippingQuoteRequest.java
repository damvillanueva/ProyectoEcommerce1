package com.smartlogix.order.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record ShippingQuoteRequest(
        @NotBlank String region,
        @NotBlank String commune,
        @NotEmpty List<@Valid OrderLineRequest> lines
) {
}

package com.smartlogix.inventory.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateWarehouseRequest(
        @NotBlank
        @Pattern(regexp = "[A-Za-z0-9][A-Za-z0-9-]{2,39}")
        String code,
        @NotBlank @Size(max = 120) String name,
        @NotBlank @Size(max = 80) String city,
        @NotBlank @Size(max = 80) String region,
        @NotBlank @Size(max = 220) String address,
        Boolean active,
        @Min(1) @Max(999) Integer dispatchPriority,
        @Min(1) @Max(12) Integer aisleCount,
        @Min(1) @Max(20) Integer rackCount,
        @Min(1) @Max(8) Integer levelCount,
        @Min(1) @Max(30) Integer positionsPerLevel
) {
}

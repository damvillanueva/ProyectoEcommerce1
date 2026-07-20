package com.smartlogix.inventory.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

public record UpdateWarehouseRequest(
        @NotBlank @Size(max = 120) String name,
        @NotBlank @Size(max = 80) String city,
        @NotBlank @Size(max = 80) String region,
        @NotBlank @Size(max = 220) String address,
        boolean active,
        @Min(1) @Max(999) int dispatchPriority,
        @Min(1) @Max(12) int aisleCount,
        @Min(1) @Max(20) int rackCount,
        @Min(1) @Max(8) int levelCount,
        @Min(1) @Max(30) int positionsPerLevel,
        @Size(min = 1, max = 26)
        List<@Pattern(regexp = "[A-Za-z0-9-]{1,20}") String> zoneCodes
) {
}

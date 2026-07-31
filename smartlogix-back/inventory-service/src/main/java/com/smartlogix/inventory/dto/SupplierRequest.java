package com.smartlogix.inventory.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SupplierRequest(
        @NotBlank @Size(max = 30) String code,
        @NotBlank @Size(max = 140) String businessName,
        @NotBlank @Size(max = 20) String taxId,
        @Size(max = 120) String contactName,
        @NotBlank @Email @Size(max = 160) String email,
        @Size(max = 30) String phone,
        @Size(max = 240) String address,
        @Min(0) @Max(365) int paymentTermsDays,
        @Min(0) @Max(365) int leadTimeDays,
        boolean active
) {
}

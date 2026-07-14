package com.smartlogix.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CustomerAddressRequest(
        @NotBlank @Size(max = 40) String label,
        @NotBlank @Size(max = 120) String recipientName,
        @NotBlank @Size(max = 180) String street,
        @NotBlank @Size(max = 80) String commune,
        @NotBlank @Size(max = 80) String region,
        @Size(max = 30) String phone,
        boolean defaultAddress
) {
}

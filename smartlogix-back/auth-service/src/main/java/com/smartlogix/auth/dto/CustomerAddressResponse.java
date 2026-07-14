package com.smartlogix.auth.dto;

public record CustomerAddressResponse(
        Long id,
        String label,
        String recipientName,
        String street,
        String commune,
        String region,
        String phone,
        boolean defaultAddress
) {
}

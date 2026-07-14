package com.smartlogix.auth.dto;

import java.util.List;

public record CustomerProfileResponse(
        Long id,
        String username,
        String displayName,
        String email,
        String phone,
        String avatarUrl,
        List<CustomerAddressResponse> addresses
) {
}

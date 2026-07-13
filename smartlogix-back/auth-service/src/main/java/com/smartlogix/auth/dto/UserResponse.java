package com.smartlogix.auth.dto;

import java.time.LocalDateTime;

public record UserResponse(
        Long id,
        String username,
        String displayName,
        String email,
        String birthDate,
        String role,
        boolean enabled,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
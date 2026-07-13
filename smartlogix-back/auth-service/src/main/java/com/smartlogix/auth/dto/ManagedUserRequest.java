package com.smartlogix.auth.dto;

public record ManagedUserRequest(
        String username,
        String displayName,
        String email,
        String birthDate,
        String password,
        String role,
        boolean enabled
) {
}
package com.smartlogix.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CustomerProfileRequest(
        @NotBlank @Size(max = 120) String displayName,
        @NotBlank @Email @Size(max = 100) String email,
        @Size(max = 30) String phone,
        String avatarUrl
) {
}

package com.smartlogix.auth.dto;

/**
 * Resultado interno de autenticacion. El refresh token solo viaja como cookie HttpOnly.
 */
public record AuthSession(AuthResponse response, String refreshToken) {
}

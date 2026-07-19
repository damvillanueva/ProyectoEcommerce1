package com.smartlogix.auth.controller;

import com.smartlogix.auth.domain.Role;
import com.smartlogix.auth.domain.UserEntity;
import com.smartlogix.auth.dto.AuthResponse;
import com.smartlogix.auth.dto.AuthSession;
import com.smartlogix.auth.dto.EmailRequest;
import com.smartlogix.auth.dto.LoginRequest;
import com.smartlogix.auth.dto.ManagedUserRequest;
import com.smartlogix.auth.dto.MessageResponse;
import com.smartlogix.auth.dto.PasswordResetConfirmRequest;
import com.smartlogix.auth.dto.RegisterRequest;
import com.smartlogix.auth.dto.RegisterResponse;
import com.smartlogix.auth.dto.TokenRequest;
import com.smartlogix.auth.dto.UserResponse;
import com.smartlogix.auth.repository.UserRepository;
import com.smartlogix.auth.service.AuthService;
import jakarta.validation.Valid;
import java.time.Duration;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String REFRESH_COOKIE = "smartlogix_refresh";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthService authService;
    private final boolean refreshCookieSecure;
    private final long refreshTokenDays;

    public AuthController(
            AuthService authService,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${smartlogix.auth.refresh-cookie-secure:false}") boolean refreshCookieSecure,
            @Value("${smartlogix.auth.refresh-token-days:14}") long refreshTokenDays) {
        this.authService = authService;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.refreshCookieSecure = refreshCookieSecure;
        this.refreshTokenDays = refreshTokenDays;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public RegisterResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return sessionResponse(authService.login(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken) {
        return sessionResponse(authService.refreshSession(refreshToken));
    }

    @PostMapping("/logout")
    public ResponseEntity<MessageResponse> logout(
            @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken) {
        authService.logout(refreshToken);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, clearRefreshCookie().toString())
                .body(new MessageResponse("Sesion cerrada correctamente."));
    }

    @PostMapping("/password/forgot")
    public MessageResponse requestPasswordReset(@Valid @RequestBody EmailRequest request) {
        return authService.requestPasswordReset(request);
    }

    @PostMapping("/password/reset")
    public MessageResponse resetPassword(@Valid @RequestBody PasswordResetConfirmRequest request) {
        return authService.resetPassword(request);
    }

    @PostMapping("/email/verify")
    public MessageResponse verifyEmail(@Valid @RequestBody TokenRequest request) {
        return authService.verifyEmail(request);
    }

    @PostMapping("/email/resend")
    public MessageResponse resendVerification(@Valid @RequestBody EmailRequest request) {
        return authService.resendVerification(request);
    }

    @GetMapping("/validate")
    public AuthResponse validateToken(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestParam(name = "token", required = false) String token) {
        return authService.validateToken(resolveToken(authorization, token));
    }

    @GetMapping("/users")
    public List<UserResponse> listUsers() {
        return userRepository.findAll().stream().map(this::toUserResponse).toList();
    }

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse createUser(@RequestBody ManagedUserRequest request) {
        UserEntity user = new UserEntity();
        user.setUsername(request.username().trim());
        user.setEmail(request.email().trim().toLowerCase());
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setRole(Role.valueOf(request.role()));
        user.setEnabled(request.enabled());
        user.setEmailVerified(true);
        return toUserResponse(userRepository.save(user));
    }

    @PutMapping("/users/{id}")
    public UserResponse updateUser(@PathVariable Long id, @RequestBody ManagedUserRequest request) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalStateException("No existe el usuario " + id));
        user.setUsername(request.username().trim());
        user.setEmail(request.email().trim().toLowerCase());
        user.setRole(Role.valueOf(request.role()));
        user.setEnabled(request.enabled());
        if (request.password() != null && !request.password().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.password()));
        }
        return toUserResponse(userRepository.save(user));
    }

    private UserResponse toUserResponse(UserEntity user) {
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getDisplayName() == null ? user.getUsername() : user.getDisplayName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole().name(),
                user.isEnabled(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }

    private ResponseEntity<AuthResponse> sessionResponse(AuthSession session) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookie(session.refreshToken()).toString())
                .body(session.response());
    }

    private ResponseCookie refreshCookie(String token) {
        return ResponseCookie.from(REFRESH_COOKIE, token)
                .httpOnly(true)
                .secure(refreshCookieSecure)
                .sameSite("Strict")
                .path("/api/auth")
                .maxAge(Duration.ofDays(refreshTokenDays))
                .build();
    }

    private ResponseCookie clearRefreshCookie() {
        return ResponseCookie.from(REFRESH_COOKIE, "")
                .httpOnly(true)
                .secure(refreshCookieSecure)
                .sameSite("Strict")
                .path("/api/auth")
                .maxAge(Duration.ZERO)
                .build();
    }

    private String resolveToken(String authorization, String token) {
        if (authorization != null && authorization.startsWith("Bearer ")) {
            return authorization.substring(7);
        }
        return token;
    }
}

package com.smartlogix.auth.service;

import com.smartlogix.auth.domain.Role;
import com.smartlogix.auth.domain.UserEntity;
import com.smartlogix.auth.dto.AuthResponse;
import com.smartlogix.auth.dto.AuthSession;
import com.smartlogix.auth.dto.EmailRequest;
import com.smartlogix.auth.dto.LoginRequest;
import com.smartlogix.auth.dto.MessageResponse;
import com.smartlogix.auth.dto.PasswordResetConfirmRequest;
import com.smartlogix.auth.dto.RegisterRequest;
import com.smartlogix.auth.dto.RegisterResponse;
import com.smartlogix.auth.dto.TokenRequest;
import com.smartlogix.auth.exception.AuthException;
import com.smartlogix.auth.repository.UserRepository;
import com.smartlogix.auth.security.JwtProvider;
import com.smartlogix.auth.strategy.AuthStrategyResolver;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final AuthStrategyResolver strategyResolver;
    private final LoginProtectionService loginProtectionService;
    private final AccountTokenService accountTokenService;
    private final AccountNotificationService notificationService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtProvider jwtProvider,
            AuthStrategyResolver strategyResolver,
            LoginProtectionService loginProtectionService,
            AccountTokenService accountTokenService,
            AccountNotificationService notificationService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtProvider = jwtProvider;
        this.strategyResolver = strategyResolver;
        this.loginProtectionService = loginProtectionService;
        this.accountTokenService = accountTokenService;
        this.notificationService = notificationService;
    }

    public RegisterResponse register(RegisterRequest request) {
        String username = request.username().trim();
        String email = request.email().trim().toLowerCase();
        if (userRepository.existsByUsername(username)) {
            throw new AuthException("El nombre de usuario ya esta en uso.");
        }
        if (userRepository.existsByEmail(email)) {
            throw new AuthException("El correo ya esta registrado.");
        }

        UserEntity user = new UserEntity();
        user.setUsername(username);
        user.setEmail(email);
        user.setDisplayName(username);
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setRole(Role.ROLE_CUSTOMER);
        user.setEnabled(true);
        user.setEmailVerified(false);
        userRepository.save(user);

        String verificationToken = accountTokenService.issueEmailVerificationToken(user);
        notificationService.sendEmailVerification(user, verificationToken);

        return new RegisterResponse(
                user.getUsername(),
                user.getEmail(),
                user.getRole().name(),
                "Cuenta creada. Revisa tu correo para activarla."
        );
    }

    public AuthSession login(LoginRequest request) {
        String credential = normalizeCredential(request.credential());
        Optional<UserEntity> candidate = findByCredential(credential);
        candidate.ifPresent(loginProtectionService::assertLoginAllowed);

        try {
            UserEntity user = strategyResolver
                    .resolve(credential)
                    .authenticate(credential, request.password());
            if (user.getRole() == Role.ROLE_CUSTOMER && !user.isEmailVerified()) {
                throw new AuthException("Debes verificar tu correo antes de iniciar sesion.");
            }
            loginProtectionService.recordSuccess(user);
            return createSession(user, accountTokenService.issueRefreshToken(user));
        } catch (AuthException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            candidate.ifPresent(loginProtectionService::recordFailure);
            throw new AuthException("Credenciales invalidas.");
        }
    }

    public AuthSession refreshSession(String rawRefreshToken) {
        AccountTokenService.RefreshRotation rotation =
                accountTokenService.rotateRefreshToken(rawRefreshToken);
        return createSession(rotation.user(), rotation.refreshToken());
    }

    public void logout(String rawRefreshToken) {
        accountTokenService.revokeRefreshToken(rawRefreshToken);
    }

    public MessageResponse requestPasswordReset(EmailRequest request) {
        userRepository.findByEmailIgnoreCase(request.email().trim()).ifPresent(user -> {
            if (user.isEnabled()) {
                String token = accountTokenService.issuePasswordResetToken(user);
                notificationService.sendPasswordReset(user, token);
            }
        });
        return new MessageResponse(
                "Si el correo esta registrado, recibiras instrucciones para recuperar tu cuenta."
        );
    }

    public MessageResponse resetPassword(PasswordResetConfirmRequest request) {
        UserEntity user = accountTokenService.consumePasswordResetToken(request.token());
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setPasswordChangedAt(LocalDateTime.now());
        userRepository.save(user);
        loginProtectionService.clearAfterPasswordReset(user);
        accountTokenService.revokeAllRefreshTokens(user);
        return new MessageResponse("Contrasena actualizada. Ya puedes iniciar sesion.");
    }

    public MessageResponse verifyEmail(TokenRequest request) {
        UserEntity user = accountTokenService.consumeEmailVerificationToken(request.token());
        user.setEmailVerified(true);
        userRepository.save(user);
        return new MessageResponse("Correo verificado. Ya puedes iniciar sesion.");
    }

    public MessageResponse resendVerification(EmailRequest request) {
        userRepository.findByEmailIgnoreCase(request.email().trim()).ifPresent(user -> {
            if (user.isEnabled() && !user.isEmailVerified()) {
                String token = accountTokenService.issueEmailVerificationToken(user);
                notificationService.sendEmailVerification(user, token);
            }
        });
        return new MessageResponse(
                "Si la cuenta requiere verificacion, enviaremos un nuevo correo."
        );
    }

    @Transactional(readOnly = true)
    public AuthResponse validateToken(String token) {
        if (!jwtProvider.validateToken(token)) {
            throw new AuthException("Token invalido o expirado.");
        }
        return new AuthResponse(
                token,
                jwtProvider.getUsernameFromToken(token),
                jwtProvider.getRoleFromToken(token),
                jwtProvider.getExpirationMs()
        );
    }

    private AuthSession createSession(UserEntity user, String refreshToken) {
        String accessToken = jwtProvider.generateToken(
                user.getId(), user.getUsername(), user.getEmail(), user.getRole().name());
        AuthResponse response = new AuthResponse(
                accessToken, user.getUsername(), user.getRole().name(), jwtProvider.getExpirationMs());
        return new AuthSession(response, refreshToken);
    }

    private Optional<UserEntity> findByCredential(String credential) {
        return credential.contains("@")
                ? userRepository.findByEmailIgnoreCase(credential)
                : userRepository.findByUsernameIgnoreCase(credential);
    }

    private String normalizeCredential(String credential) {
        String normalized = credential == null ? "" : credential.trim();
        return normalized.contains("@") ? normalized.toLowerCase() : normalized;
    }
}

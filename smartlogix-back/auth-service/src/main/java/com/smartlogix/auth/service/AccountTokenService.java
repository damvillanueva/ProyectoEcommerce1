package com.smartlogix.auth.service;

import com.smartlogix.auth.domain.AccountToken;
import com.smartlogix.auth.domain.AccountTokenPurpose;
import com.smartlogix.auth.domain.RefreshToken;
import com.smartlogix.auth.domain.UserEntity;
import com.smartlogix.auth.exception.AuthException;
import com.smartlogix.auth.repository.AccountTokenRepository;
import com.smartlogix.auth.repository.RefreshTokenRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AccountTokenService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String INVALID_TOKEN_MESSAGE = "El enlace no es valido o ya expiro.";

    private final AccountTokenRepository accountTokenRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final long verificationHours;
    private final long resetMinutes;
    private final long refreshDays;

    public AccountTokenService(
            AccountTokenRepository accountTokenRepository,
            RefreshTokenRepository refreshTokenRepository,
            @Value("${smartlogix.auth.email-verification-hours:24}") long verificationHours,
            @Value("${smartlogix.auth.password-reset-minutes:30}") long resetMinutes,
            @Value("${smartlogix.auth.refresh-token-days:14}") long refreshDays) {
        this.accountTokenRepository = accountTokenRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.verificationHours = verificationHours;
        this.resetMinutes = resetMinutes;
        this.refreshDays = refreshDays;
    }

    public String issueEmailVerificationToken(UserEntity user) {
        return issueAccountToken(user, AccountTokenPurpose.EMAIL_VERIFICATION, verificationHours * 60);
    }

    public String issuePasswordResetToken(UserEntity user) {
        return issueAccountToken(user, AccountTokenPurpose.PASSWORD_RESET, resetMinutes);
    }

    public UserEntity consumeEmailVerificationToken(String rawToken) {
        return consumeAccountToken(rawToken, AccountTokenPurpose.EMAIL_VERIFICATION);
    }

    public UserEntity consumePasswordResetToken(String rawToken) {
        return consumeAccountToken(rawToken, AccountTokenPurpose.PASSWORD_RESET);
    }

    public String issueRefreshToken(UserEntity user) {
        String rawToken = generateToken();
        RefreshToken token = new RefreshToken();
        token.setUser(user);
        token.setTokenHash(hash(rawToken));
        token.setExpiresAt(LocalDateTime.now().plusDays(refreshDays));
        refreshTokenRepository.save(token);
        return rawToken;
    }

    public RefreshRotation rotateRefreshToken(String rawToken) {
        RefreshToken current = findRefreshToken(rawToken);
        LocalDateTime now = LocalDateTime.now();
        if (!current.isUsableAt(now) || !current.getUser().isEnabled()) {
            throw new AuthException("La sesion ya no es valida.");
        }
        current.setRevokedAt(now);
        refreshTokenRepository.save(current);
        return new RefreshRotation(current.getUser(), issueRefreshToken(current.getUser()));
    }

    public void revokeRefreshToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return;
        }
        refreshTokenRepository.findByTokenHash(hash(rawToken)).ifPresent(token -> {
            if (token.getRevokedAt() == null) {
                token.setRevokedAt(LocalDateTime.now());
                refreshTokenRepository.save(token);
            }
        });
    }

    public void revokeAllRefreshTokens(UserEntity user) {
        LocalDateTime now = LocalDateTime.now();
        refreshTokenRepository.findAllByUserAndRevokedAtIsNull(user).forEach(token -> {
            token.setRevokedAt(now);
            refreshTokenRepository.save(token);
        });
    }

    private String issueAccountToken(UserEntity user, AccountTokenPurpose purpose, long durationMinutes) {
        accountTokenRepository.deleteByUserAndPurpose(user, purpose);
        String rawToken = generateToken();
        AccountToken token = new AccountToken();
        token.setUser(user);
        token.setPurpose(purpose);
        token.setTokenHash(hash(rawToken));
        token.setExpiresAt(LocalDateTime.now().plusMinutes(durationMinutes));
        accountTokenRepository.save(token);
        return rawToken;
    }

    private UserEntity consumeAccountToken(String rawToken, AccountTokenPurpose purpose) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new AuthException(INVALID_TOKEN_MESSAGE);
        }
        AccountToken token = accountTokenRepository
                .findByTokenHashAndPurpose(hash(rawToken), purpose)
                .orElseThrow(() -> new AuthException(INVALID_TOKEN_MESSAGE));
        LocalDateTime now = LocalDateTime.now();
        if (!token.isUsableAt(now)) {
            throw new AuthException(INVALID_TOKEN_MESSAGE);
        }
        token.setUsedAt(now);
        accountTokenRepository.save(token);
        return token.getUser();
    }

    private RefreshToken findRefreshToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new AuthException("La sesion ya no es valida.");
        }
        return refreshTokenRepository.findByTokenHash(hash(rawToken))
                .orElseThrow(() -> new AuthException("La sesion ya no es valida."));
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(rawToken.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 no esta disponible", exception);
        }
    }

    public record RefreshRotation(UserEntity user, String refreshToken) {
    }
}

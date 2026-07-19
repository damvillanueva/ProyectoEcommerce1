package com.smartlogix.auth.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.smartlogix.auth.domain.AccountToken;
import com.smartlogix.auth.domain.AccountTokenPurpose;
import com.smartlogix.auth.domain.RefreshToken;
import com.smartlogix.auth.domain.UserEntity;
import com.smartlogix.auth.exception.AuthException;
import com.smartlogix.auth.repository.AccountTokenRepository;
import com.smartlogix.auth.repository.RefreshTokenRepository;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AccountTokenServiceTest {

    @Mock
    private AccountTokenRepository accountTokenRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    private AccountTokenService service;
    private UserEntity user;

    @BeforeEach
    void setUp() {
        service = new AccountTokenService(accountTokenRepository, refreshTokenRepository, 24, 30, 14);
        user = new UserEntity();
        user.setUsername("cliente");
        user.setEnabled(true);
    }

    @Test
    void persistsOnlyHashForRefreshToken() {
        AtomicReference<RefreshToken> persisted = new AtomicReference<>();
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(invocation -> {
            persisted.set(invocation.getArgument(0));
            return invocation.getArgument(0);
        });

        String rawToken = service.issueRefreshToken(user);

        assertNotEquals(rawToken, persisted.get().getTokenHash());
        assertEquals(64, persisted.get().getTokenHash().length());
        assertSame(user, persisted.get().getUser());
    }

    @Test
    void accountTokenCanOnlyBeConsumedOnce() {
        AtomicReference<AccountToken> persisted = new AtomicReference<>();
        when(accountTokenRepository.save(any(AccountToken.class))).thenAnswer(invocation -> {
            persisted.set(invocation.getArgument(0));
            return invocation.getArgument(0);
        });

        String rawToken = service.issuePasswordResetToken(user);
        when(accountTokenRepository.findByTokenHashAndPurpose(
                anyString(), eq(AccountTokenPurpose.PASSWORD_RESET)))
                .thenAnswer(invocation -> Optional.of(persisted.get()));

        assertSame(user, service.consumePasswordResetToken(rawToken));
        assertThrows(AuthException.class, () -> service.consumePasswordResetToken(rawToken));
    }
}

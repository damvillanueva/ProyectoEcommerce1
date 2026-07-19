package com.smartlogix.auth.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;

import com.smartlogix.auth.domain.UserEntity;
import com.smartlogix.auth.exception.AuthException;
import com.smartlogix.auth.repository.UserRepository;
import java.time.LocalDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class LoginProtectionServiceTest {

    @Mock
    private UserRepository userRepository;

    private LoginProtectionService service;
    private UserEntity user;

    @BeforeEach
    void setUp() {
        service = new LoginProtectionService(userRepository, 5, 15);
        user = new UserEntity();
        user.setUsername("cliente");
    }

    @Test
    void locksAccountAfterFifthFailedAttempt() {
        for (int attempt = 0; attempt < 5; attempt++) {
            service.recordFailure(user);
        }

        assertEquals(5, user.getFailedLoginAttempts());
        assertNotNull(user.getLockedUntil());
        assertThrows(AuthException.class, () -> service.assertLoginAllowed(user));
    }

    @Test
    void clearsExpiredLockBeforeAllowingAnotherAttempt() {
        user.setFailedLoginAttempts(5);
        user.setLockedUntil(LocalDateTime.now().minusMinutes(1));

        service.assertLoginAllowed(user);

        assertEquals(0, user.getFailedLoginAttempts());
        assertNull(user.getLockedUntil());
        verify(userRepository).save(user);
    }

    @Test
    void successfulLoginClearsFailuresAndRecordsAccess() {
        user.setFailedLoginAttempts(3);

        service.recordSuccess(user);

        assertEquals(0, user.getFailedLoginAttempts());
        assertNotNull(user.getLastLoginAt());
        verify(userRepository).save(user);
    }
}

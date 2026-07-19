package com.smartlogix.auth.service;

import com.smartlogix.auth.domain.UserEntity;
import com.smartlogix.auth.exception.AuthException;
import com.smartlogix.auth.repository.UserRepository;
import java.time.LocalDateTime;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class LoginProtectionService {

    private static final String LOCKED_MESSAGE =
            "No fue posible iniciar sesion. Intente nuevamente mas tarde.";

    private final UserRepository userRepository;
    private final int maxAttempts;
    private final long lockMinutes;

    public LoginProtectionService(
            UserRepository userRepository,
            @Value("${smartlogix.auth.max-login-attempts:5}") int maxAttempts,
            @Value("${smartlogix.auth.lock-minutes:15}") long lockMinutes) {
        this.userRepository = userRepository;
        this.maxAttempts = maxAttempts;
        this.lockMinutes = lockMinutes;
    }

    public void assertLoginAllowed(UserEntity user) {
        LocalDateTime now = LocalDateTime.now();
        if (user.getLockedUntil() == null) {
            return;
        }
        if (user.getLockedUntil().isAfter(now)) {
            throw new AuthException(LOCKED_MESSAGE);
        }
        user.setLockedUntil(null);
        user.setFailedLoginAttempts(0);
        userRepository.save(user);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordFailure(UserEntity user) {
        int attempts = user.getFailedLoginAttempts() + 1;
        user.setFailedLoginAttempts(attempts);
        if (attempts >= maxAttempts) {
            user.setLockedUntil(LocalDateTime.now().plusMinutes(lockMinutes));
        }
        userRepository.save(user);
    }

    public void recordSuccess(UserEntity user) {
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);
    }

    public void clearAfterPasswordReset(UserEntity user) {
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);
    }
}

package com.smartlogix.auth.repository;

import com.smartlogix.auth.domain.AccountToken;
import com.smartlogix.auth.domain.AccountTokenPurpose;
import com.smartlogix.auth.domain.UserEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountTokenRepository extends JpaRepository<AccountToken, Long> {

    Optional<AccountToken> findByTokenHashAndPurpose(String tokenHash, AccountTokenPurpose purpose);

    long deleteByUserAndPurpose(UserEntity user, AccountTokenPurpose purpose);
}

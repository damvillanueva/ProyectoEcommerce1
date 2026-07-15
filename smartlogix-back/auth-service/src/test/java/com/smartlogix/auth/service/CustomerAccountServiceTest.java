package com.smartlogix.auth.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.smartlogix.auth.domain.CustomerFavorite;
import com.smartlogix.auth.domain.UserEntity;
import com.smartlogix.auth.dto.CustomerFavoriteResponse;
import com.smartlogix.auth.exception.AuthException;
import com.smartlogix.auth.repository.CustomerAddressRepository;
import com.smartlogix.auth.repository.CustomerFavoriteRepository;
import com.smartlogix.auth.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CustomerAccountServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private CustomerAddressRepository addressRepository;

    @Mock
    private CustomerFavoriteRepository favoriteRepository;

    private CustomerAccountService accountService;
    private UserEntity customer;

    @BeforeEach
    void setUp() {
        accountService = new CustomerAccountService(
                userRepository,
                addressRepository,
                favoriteRepository
        );
        customer = new UserEntity();
        customer.setUsername("cliente");
        when(userRepository.findByUsername("cliente")).thenReturn(Optional.of(customer));
    }

    @Test
    void addsNormalizedFavoriteForAuthenticatedCustomer() {
        when(favoriteRepository.findByUserUsernameAndSku("cliente", "SKU-1001"))
                .thenReturn(Optional.empty());
        when(favoriteRepository.save(any(CustomerFavorite.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CustomerFavoriteResponse response = accountService.addFavorite("cliente", " sku-1001 ");

        assertEquals("SKU-1001", response.sku());
        verify(favoriteRepository).save(any(CustomerFavorite.class));
    }

    @Test
    void doesNotCreateDuplicateFavorite() {
        CustomerFavorite existing = new CustomerFavorite();
        existing.setUser(customer);
        existing.setSku("SKU-1001");
        when(favoriteRepository.findByUserUsernameAndSku("cliente", "SKU-1001"))
                .thenReturn(Optional.of(existing));

        CustomerFavoriteResponse response = accountService.addFavorite("cliente", "SKU-1001");

        assertEquals("SKU-1001", response.sku());
        verify(favoriteRepository, never()).save(any(CustomerFavorite.class));
    }

    @Test
    void rejectsInvalidFavoriteSku() {
        assertThrows(AuthException.class, () -> accountService.addFavorite("cliente", "../../admin"));
        verify(favoriteRepository, never()).save(any(CustomerFavorite.class));
    }
}

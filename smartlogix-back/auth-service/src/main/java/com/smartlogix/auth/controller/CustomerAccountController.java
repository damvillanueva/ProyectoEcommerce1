package com.smartlogix.auth.controller;

import com.smartlogix.auth.dto.CustomerAddressRequest;
import com.smartlogix.auth.dto.CustomerAddressResponse;
import com.smartlogix.auth.dto.CustomerProfileRequest;
import com.smartlogix.auth.dto.CustomerProfileResponse;
import com.smartlogix.auth.service.CustomerAccountService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth/me")
public class CustomerAccountController {

    private final CustomerAccountService accountService;

    public CustomerAccountController(CustomerAccountService accountService) {
        this.accountService = accountService;
    }

    @GetMapping
    public CustomerProfileResponse getProfile(Authentication authentication) {
        return accountService.getProfile(authentication.getName());
    }

    @PutMapping
    public CustomerProfileResponse updateProfile(
            Authentication authentication,
            @Valid @RequestBody CustomerProfileRequest request
    ) {
        return accountService.updateProfile(authentication.getName(), request);
    }

    @PostMapping("/addresses")
    @ResponseStatus(HttpStatus.CREATED)
    public CustomerAddressResponse createAddress(
            Authentication authentication,
            @Valid @RequestBody CustomerAddressRequest request
    ) {
        return accountService.createAddress(authentication.getName(), request);
    }

    @PutMapping("/addresses/{addressId}")
    public CustomerAddressResponse updateAddress(
            Authentication authentication,
            @PathVariable Long addressId,
            @Valid @RequestBody CustomerAddressRequest request
    ) {
        return accountService.updateAddress(authentication.getName(), addressId, request);
    }

    @DeleteMapping("/addresses/{addressId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAddress(Authentication authentication, @PathVariable Long addressId) {
        accountService.deleteAddress(authentication.getName(), addressId);
    }
}

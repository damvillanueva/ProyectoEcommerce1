package com.smartlogix.auth.service;

import com.smartlogix.auth.domain.CustomerAddress;
import com.smartlogix.auth.domain.UserEntity;
import com.smartlogix.auth.dto.CustomerAddressRequest;
import com.smartlogix.auth.dto.CustomerAddressResponse;
import com.smartlogix.auth.dto.CustomerProfileRequest;
import com.smartlogix.auth.dto.CustomerProfileResponse;
import com.smartlogix.auth.exception.AuthException;
import com.smartlogix.auth.repository.CustomerAddressRepository;
import com.smartlogix.auth.repository.UserRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class CustomerAccountService {

    private static final int MAX_AVATAR_LENGTH = 700_000;

    private final UserRepository userRepository;
    private final CustomerAddressRepository addressRepository;

    public CustomerAccountService(
            UserRepository userRepository,
            CustomerAddressRepository addressRepository
    ) {
        this.userRepository = userRepository;
        this.addressRepository = addressRepository;
    }

    @Transactional(readOnly = true)
    public CustomerProfileResponse getProfile(String username) {
        return toResponse(findUser(username));
    }

    public CustomerProfileResponse updateProfile(String username, CustomerProfileRequest request) {
        UserEntity user = findUser(username);
        String email = request.email().trim().toLowerCase();

        userRepository.findByEmail(email)
                .filter(existing -> !existing.getId().equals(user.getId()))
                .ifPresent(existing -> {
                    throw new AuthException("El email ya esta registrado.");
                });

        user.setDisplayName(request.displayName().trim());
        user.setEmail(email);
        user.setPhone(cleanOptional(request.phone()));
        user.setAvatarUrl(validateAvatar(request.avatarUrl()));
        userRepository.save(user);

        return toResponse(user);
    }

    public CustomerAddressResponse createAddress(String username, CustomerAddressRequest request) {
        UserEntity user = findUser(username);
        List<CustomerAddress> currentAddresses = addressRepository.findAllByUserUsernameOrderByIdAsc(username);
        boolean shouldBeDefault = request.defaultAddress() || currentAddresses.isEmpty();

        if (shouldBeDefault) {
            clearDefaultAddress(currentAddresses);
        }

        CustomerAddress address = new CustomerAddress();
        address.setUser(user);
        applyAddress(address, request, shouldBeDefault);
        return toResponse(addressRepository.save(address));
    }

    public CustomerAddressResponse updateAddress(
            String username,
            Long addressId,
            CustomerAddressRequest request
    ) {
        CustomerAddress address = findAddress(username, addressId);
        if (request.defaultAddress()) {
            clearDefaultAddress(addressRepository.findAllByUserUsernameOrderByIdAsc(username));
        }
        applyAddress(address, request, request.defaultAddress());
        return toResponse(addressRepository.save(address));
    }

    public void deleteAddress(String username, Long addressId) {
        CustomerAddress address = findAddress(username, addressId);
        boolean deletedDefault = address.isDefaultAddress();
        addressRepository.delete(address);

        if (deletedDefault) {
            List<CustomerAddress> remaining = addressRepository.findAllByUserUsernameOrderByIdAsc(username);
            if (!remaining.isEmpty()) {
                remaining.get(0).setDefaultAddress(true);
                addressRepository.save(remaining.get(0));
            }
        }
    }

    private void applyAddress(
            CustomerAddress address,
            CustomerAddressRequest request,
            boolean defaultAddress
    ) {
        address.setLabel(request.label().trim());
        address.setRecipientName(request.recipientName().trim());
        address.setStreet(request.street().trim());
        address.setCommune(request.commune().trim());
        address.setRegion(request.region().trim());
        address.setPhone(cleanOptional(request.phone()));
        address.setDefaultAddress(defaultAddress);
    }

    private void clearDefaultAddress(List<CustomerAddress> addresses) {
        addresses.stream()
                .filter(CustomerAddress::isDefaultAddress)
                .forEach(address -> address.setDefaultAddress(false));
        addressRepository.saveAll(addresses);
    }

    private UserEntity findUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new AuthException("No existe la cuenta autenticada."));
    }

    private CustomerAddress findAddress(String username, Long addressId) {
        return addressRepository.findByIdAndUserUsername(addressId, username)
                .orElseThrow(() -> new AuthException("No existe la direccion solicitada."));
    }

    private String validateAvatar(String avatarUrl) {
        String avatar = cleanOptional(avatarUrl);
        if (avatar == null) {
            return null;
        }
        boolean supportedDataImage = avatar.startsWith("data:image/png;base64,")
                || avatar.startsWith("data:image/jpeg;base64,")
                || avatar.startsWith("data:image/webp;base64,");
        if (!supportedDataImage || avatar.length() > MAX_AVATAR_LENGTH) {
            throw new AuthException("La foto debe ser PNG, JPG o WEBP y pesar menos de 500 KB.");
        }
        return avatar;
    }

    private String cleanOptional(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private CustomerProfileResponse toResponse(UserEntity user) {
        String displayName = user.getDisplayName() == null || user.getDisplayName().isBlank()
                ? user.getUsername()
                : user.getDisplayName();
        List<CustomerAddressResponse> addresses = addressRepository
                .findAllByUserUsernameOrderByIdAsc(user.getUsername())
                .stream()
                .map(this::toResponse)
                .toList();

        return new CustomerProfileResponse(
                user.getId(),
                user.getUsername(),
                displayName,
                user.getEmail(),
                user.getPhone(),
                user.getAvatarUrl(),
                addresses
        );
    }

    private CustomerAddressResponse toResponse(CustomerAddress address) {
        return new CustomerAddressResponse(
                address.getId(),
                address.getLabel(),
                address.getRecipientName(),
                address.getStreet(),
                address.getCommune(),
                address.getRegion(),
                address.getPhone(),
                address.isDefaultAddress()
        );
    }
}

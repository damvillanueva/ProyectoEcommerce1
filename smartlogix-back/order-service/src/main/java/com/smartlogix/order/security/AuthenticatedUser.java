package com.smartlogix.order.security;

import java.security.Principal;

public record AuthenticatedUser(String username, String email) implements Principal {

    @Override
    public String getName() {
        return username;
    }
}

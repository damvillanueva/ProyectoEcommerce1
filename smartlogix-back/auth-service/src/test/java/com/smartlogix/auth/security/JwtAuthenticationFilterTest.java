package com.smartlogix.auth.security;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class JwtAuthenticationFilterTest {

    private static final List<String> PUBLIC_ENDPOINTS = List.of(
            "/api/auth/login",
            "/api/auth/register",
            "/api/auth/refresh",
            "/api/auth/logout",
            "/api/auth/password/forgot",
            "/api/auth/password/reset",
            "/api/auth/email/verify",
            "/api/auth/email/resend"
    );

    private final JwtAuthenticationFilter filter = new JwtAuthenticationFilter(
            new JwtProvider(
                    "SmartLogixFilterTestSecretWithAtLeast64CharactersAndNoProductionUse",
                    900000
            )
    );

    @Test
    void accountRecoveryEndpointsDoNotRequireAccessToken() throws Exception {
        for (String path : PUBLIC_ENDPOINTS) {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", path);
            MockHttpServletResponse response = new MockHttpServletResponse();

            filter.doFilter(request, response, new MockFilterChain());

            assertEquals(200, response.getStatus(), path);
        }
    }

    @Test
    void protectedEndpointStillRequiresAccessToken() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/auth/users");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(401, response.getStatus());
    }
}

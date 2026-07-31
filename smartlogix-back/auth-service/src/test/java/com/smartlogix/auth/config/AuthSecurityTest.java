package com.smartlogix.auth.config;

import com.smartlogix.auth.controller.AuthController;
import com.smartlogix.auth.repository.UserRepository;
import com.smartlogix.auth.security.JwtAuthenticationFilter;
import com.smartlogix.auth.security.JwtProvider;
import com.smartlogix.auth.service.AuthService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class AuthSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuthService authService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private JwtProvider jwtProvider;

    @Test
    void userAdministrationRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/auth/users"))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(userRepository);
    }

    @Test
    void customerCannotCreateAdministratorEvenWhenRequestContainsAdminRole() throws Exception {
        allowToken("customer-token", "cliente", "ROLE_CUSTOMER");

        mockMvc.perform(post("/api/auth/users")
                        .header("Authorization", "Bearer customer-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "intruso",
                                  "email": "intruso@example.com",
                                  "password": "Password-123!",
                                  "role": "ROLE_ADMIN",
                                  "enabled": true
                                }
                                """))
                .andExpect(status().isForbidden());

        verifyNoInteractions(userRepository);
    }

    @Test
    void administratorCanListManagedUsers() throws Exception {
        allowToken("admin-token", "admin", "ROLE_ADMIN");
        when(userRepository.findAll()).thenReturn(List.of());

        mockMvc.perform(get("/api/auth/users")
                        .header("Authorization", "Bearer admin-token"))
                .andExpect(status().isOk());

        verify(userRepository).findAll();
    }

    private void allowToken(String token, String username, String role) {
        when(jwtProvider.validateToken(token)).thenReturn(true);
        when(jwtProvider.getUsernameFromToken(token)).thenReturn(username);
        when(jwtProvider.getRoleFromToken(token)).thenReturn(role);
    }
}

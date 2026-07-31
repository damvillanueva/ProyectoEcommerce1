package com.smartlogix.order.config;

import com.smartlogix.order.controller.OrderController;
import com.smartlogix.order.security.JwtAuthenticationFilter;
import com.smartlogix.order.service.OrderService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(OrderController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
@TestPropertySource(properties = "jwt.secret=SmartLogixOrderSecurityTestSecretWithEnoughLengthForHS256!!")
class OrderSecurityTest {

    private static final String SECRET =
            "SmartLogixOrderSecurityTestSecretWithEnoughLengthForHS256!!";
    private static final String WRONG_SECRET =
            "WrongSmartLogixSecurityTestSecretWithEnoughLengthForHS256!!";

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OrderService orderService;

    @Test
    void orderAdministrationRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/orders"))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(orderService);
    }

    @Test
    void customerCannotListAllOrders() throws Exception {
        mockMvc.perform(get("/api/orders")
                        .header("Authorization", bearerToken("cliente", "ROLE_CUSTOMER", SECRET)))
                .andExpect(status().isForbidden());
    }

    @Test
    void customerCanListOnlyOwnedOrders() throws Exception {
        when(orderService.getCustomerOrders("cliente")).thenReturn(List.of());

        mockMvc.perform(get("/api/orders/mine")
                        .header("Authorization", bearerToken("cliente", "ROLE_CUSTOMER", SECRET)))
                .andExpect(status().isOk());

        verify(orderService).getCustomerOrders("cliente");
    }

    @Test
    void internalUserCanListOperationalOrders() throws Exception {
        when(orderService.getOrders()).thenReturn(List.of());

        mockMvc.perform(get("/api/orders")
                        .header("Authorization", bearerToken("operador", "ROLE_USER", SECRET)))
                .andExpect(status().isOk());

        verify(orderService).getOrders();
    }

    @Test
    void tokenWithAlteredAdminRoleAndInvalidSignatureIsRejected() throws Exception {
        mockMvc.perform(get("/api/orders")
                        .header("Authorization", bearerToken("intruso", "ROLE_ADMIN", WRONG_SECRET)))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(orderService);
    }

    private String bearerToken(String subject, String role, String secret) {
        Instant now = Instant.now();
        SecretKey signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        return "Bearer " + Jwts.builder()
                .subject(subject)
                .claim("email", subject + "@example.com")
                .claim("role", role)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(60)))
                .signWith(signingKey)
                .compact();
    }
}

package com.smartlogix.order.notification;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.smartlogix.order.config.SecurityConfig;
import com.smartlogix.order.controller.NotificationController;
import com.smartlogix.order.security.JwtAuthenticationFilter;
import com.smartlogix.order.service.OrderNotificationService;
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

@WebMvcTest(NotificationController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
@TestPropertySource(properties = "jwt.secret=SmartLogixNotificationTestSecretWithEnoughLengthForHS256!!")
class NotificationSecurityTest {

    private static final String SECRET =
            "SmartLogixNotificationTestSecretWithEnoughLengthForHS256!!";

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OrderNotificationService service;

    @Test
    void customerCanOnlyListOwnedNotifications() throws Exception {
        when(service.listMine("cliente")).thenReturn(List.of());

        mockMvc.perform(get("/api/notifications/mine")
                        .header("Authorization", bearerToken("cliente", "ROLE_CUSTOMER")))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/notifications")
                        .header("Authorization", bearerToken("cliente", "ROLE_CUSTOMER")))
                .andExpect(status().isForbidden());

        verify(service).listMine("cliente");
    }

    @Test
    void operatorCanMonitorButCannotRetryFailedDelivery() throws Exception {
        when(service.listAll()).thenReturn(List.of());

        mockMvc.perform(get("/api/notifications")
                        .header("Authorization", bearerToken("operador", "ROLE_USER")))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/notifications/7/retry")
                        .header("Authorization", bearerToken("operador", "ROLE_USER")))
                .andExpect(status().isForbidden());

        verify(service).listAll();
    }

    @Test
    void administratorCanRetryFailedDelivery() throws Exception {
        mockMvc.perform(post("/api/notifications/7/retry")
                        .header("Authorization", bearerToken("admin", "ROLE_ADMIN")))
                .andExpect(status().isOk());

        verify(service).retry(7L);
    }

    @Test
    void anonymousRequestIsRejected() throws Exception {
        mockMvc.perform(get("/api/notifications/mine"))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(service);
    }

    private String bearerToken(String subject, String role) {
        Instant now = Instant.now();
        SecretKey signingKey = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
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

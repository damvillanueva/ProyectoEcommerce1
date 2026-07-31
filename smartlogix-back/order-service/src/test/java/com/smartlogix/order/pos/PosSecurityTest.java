package com.smartlogix.order.pos;

import com.smartlogix.order.config.SecurityConfig;
import com.smartlogix.order.controller.PosController;
import com.smartlogix.order.security.JwtAuthenticationFilter;
import com.smartlogix.order.service.PosService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
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

@WebMvcTest(PosController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
@TestPropertySource(properties = "jwt.secret=SmartLogixOrderSecurityTestSecretWithEnoughLengthForHS256!!")
class PosSecurityTest {

    private static final String SECRET =
            "SmartLogixOrderSecurityTestSecretWithEnoughLengthForHS256!!";
    private static final String WRONG_SECRET =
            "WrongSmartLogixSecurityTestSecretWithEnoughLengthForHS256!!";

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PosService posService;

    @Test
    void posRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/pos/sessions/current"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(posService);
    }

    @Test
    void customerCannotAccessPos() throws Exception {
        mockMvc.perform(get("/api/pos/sessions/current")
                        .header("Authorization", bearerToken("cliente", "ROLE_CUSTOMER", SECRET)))
                .andExpect(status().isForbidden());
        verifyNoInteractions(posService);
    }

    @Test
    void internalSalesUserCanAccessOwnRegister() throws Exception {
        when(posService.currentSession("vendedor")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/pos/sessions/current")
                        .header("Authorization", bearerToken("vendedor", "ROLE_USER", SECRET)))
                .andExpect(status().isNoContent());

        verify(posService).currentSession("vendedor");
    }

    @Test
    void alteredAdminTokenIsRejected() throws Exception {
        mockMvc.perform(get("/api/pos/sessions/current")
                        .header("Authorization", bearerToken("intruso", "ROLE_ADMIN", WRONG_SECRET)))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(posService);
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

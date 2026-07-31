package com.smartlogix.inventory.config;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.smartlogix.inventory.controller.SupplierController;
import com.smartlogix.inventory.security.JwtAuthenticationFilter;
import com.smartlogix.inventory.service.SupplierService;
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

@WebMvcTest(SupplierController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
@TestPropertySource(properties = "jwt.secret=SmartLogixProcurementSecurityTestSecretWithEnoughLengthForHS256")
class ProcurementSecurityTest {

    private static final String SECRET =
            "SmartLogixProcurementSecurityTestSecretWithEnoughLengthForHS256";

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SupplierService supplierService;

    @Test
    void regularInternalUserCannotReadSuppliers() throws Exception {
        mockMvc.perform(get("/api/inventory/suppliers")
                        .header("Authorization", bearerToken("usuario", "ROLE_USER")))
                .andExpect(status().isForbidden());

        verifyNoInteractions(supplierService);
    }

    @Test
    void warehouseManagerCanReadSuppliers() throws Exception {
        when(supplierService.findAll()).thenReturn(List.of());

        mockMvc.perform(get("/api/inventory/suppliers")
                        .header("Authorization", bearerToken("bodega", "ROLE_WAREHOUSE_MANAGER")))
                .andExpect(status().isOk());
    }

    private String bearerToken(String subject, String role) {
        Instant now = Instant.now();
        SecretKey signingKey = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
        return "Bearer " + Jwts.builder()
                .subject(subject)
                .claim("role", role)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(60)))
                .signWith(signingKey)
                .compact();
    }
}

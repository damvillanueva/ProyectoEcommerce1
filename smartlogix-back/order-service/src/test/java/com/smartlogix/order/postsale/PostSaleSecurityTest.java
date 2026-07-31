package com.smartlogix.order.postsale;

import com.smartlogix.order.config.SecurityConfig;
import com.smartlogix.order.controller.PostSaleController;
import com.smartlogix.order.security.JwtAuthenticationFilter;
import com.smartlogix.order.service.PostSaleService;
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
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PostSaleController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
@TestPropertySource(properties = "jwt.secret=SmartLogixPostSaleSecurityTestSecretWithEnoughLengthForHS256")
class PostSaleSecurityTest {

    private static final String SECRET =
            "SmartLogixPostSaleSecurityTestSecretWithEnoughLengthForHS256";

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PostSaleService service;

    @Test
    void customerCanOnlyReadOwnPostSaleRequests() throws Exception {
        when(service.listCustomerRequests("cliente")).thenReturn(List.of());

        mockMvc.perform(get("/api/returns/mine")
                        .header("Authorization", token("cliente", "ROLE_CUSTOMER")))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/returns")
                        .header("Authorization", token("cliente", "ROLE_CUSTOMER")))
                .andExpect(status().isForbidden());

        verify(service).listCustomerRequests("cliente");
    }

    @Test
    void warehouseManagerCanReceiveButCannotApprove() throws Exception {
        String receiveBody = "{\"warehouseCode\":\"WH-SCL-01\",\"lines\":[{\"sku\":\"SKU-1\",\"receivedQuantity\":1,\"restockQuantity\":0,\"condition\":\"DEFECTIVE\"}]}";
        String reviewBody = "{\"approved\":true,\"response\":\"Aprobada\"}";

        mockMvc.perform(post("/api/returns/PSD-1/receive")
                        .header("Authorization", token("bodega", "ROLE_WAREHOUSE_MANAGER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(receiveBody))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/returns/PSD-1/review")
                        .header("Authorization", token("bodega", "ROLE_WAREHOUSE_MANAGER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewBody))
                .andExpect(status().isForbidden());

        verify(service).receive(org.mockito.ArgumentMatchers.eq("PSD-1"), org.mockito.ArgumentMatchers.eq("bodega"), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void postSaleRequiresValidAuthentication() throws Exception {
        mockMvc.perform(get("/api/returns"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }

    private String token(String subject, String role) {
        Instant now = Instant.now();
        SecretKey key = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
        return "Bearer " + Jwts.builder()
                .subject(subject)
                .claim("role", role)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(60)))
                .signWith(key)
                .compact();
    }
}

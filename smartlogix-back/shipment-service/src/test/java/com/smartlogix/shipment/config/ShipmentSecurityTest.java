package com.smartlogix.shipment.config;

import com.smartlogix.shipment.controller.ShipmentController;
import com.smartlogix.shipment.domain.ShipmentStatus;
import com.smartlogix.shipment.dto.ShipmentResponse;
import com.smartlogix.shipment.security.JwtAuthenticationFilter;
import com.smartlogix.shipment.service.ShipmentService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Date;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ShipmentController.class)
@ActiveProfiles("test")
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
@TestPropertySource(properties = "jwt.secret=SmartLogixTestSecretKeyWithEnoughLengthForHS256Security!!")
class ShipmentSecurityTest {

    private static final String SECRET =
            "SmartLogixTestSecretKeyWithEnoughLengthForHS256Security!!";

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ShipmentService shipmentService;

    @Test
    void shipmentCreationRequiresAuthentication() throws Exception {
        mockMvc.perform(post("/api/shipments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createShipmentJson()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void customerCannotCreateShipment() throws Exception {
        mockMvc.perform(post("/api/shipments")
                        .header("Authorization", bearerToken("cliente", "ROLE_CUSTOMER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createShipmentJson()))
                .andExpect(status().isForbidden());
    }

    @Test
    void orderServiceCanCreateShipmentWithLeastPrivilegeToken() throws Exception {
        when(shipmentService.createShipment(any())).thenReturn(shipmentResponse(ShipmentStatus.PLANNED));

        mockMvc.perform(post("/api/shipments")
                        .header("Authorization", bearerToken("order-service", "ROLE_ORDER_SERVICE"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createShipmentJson()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.trackingCode").value("SLX-TEST-1"))
                .andExpect(jsonPath("$.status").value("PLANNED"));
    }

    @Test
    void orderServiceCannotChangeShipmentStatus() throws Exception {
        mockMvc.perform(patch("/api/shipments/SLX-TEST-1/status")
                        .header("Authorization", bearerToken("order-service", "ROLE_ORDER_SERVICE"))
                        .queryParam("value", "IN_TRANSIT"))
                .andExpect(status().isForbidden());
    }

    @Test
    void administratorCanChangeShipmentStatus() throws Exception {
        when(shipmentService.updateStatus(eq("SLX-TEST-1"), eq(ShipmentStatus.IN_TRANSIT)))
                .thenReturn(shipmentResponse(ShipmentStatus.IN_TRANSIT));

        mockMvc.perform(patch("/api/shipments/SLX-TEST-1/status")
                        .header("Authorization", bearerToken("admin", "ROLE_ADMIN"))
                        .queryParam("value", "IN_TRANSIT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_TRANSIT"));
    }

    private String createShipmentJson() {
        return """
                {
                  "orderNumber": "ORD-TEST-1",
                  "destinationAddress": "Providencia 1234",
                  "totalUnits": 1
                }
                """;
    }

    private String bearerToken(String subject, String role) {
        Instant now = Instant.now();
        SecretKey signingKey = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
        String token = Jwts.builder()
                .subject(subject)
                .claim("role", role)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(60)))
                .signWith(signingKey)
                .compact();
        return "Bearer " + token;
    }

    private ShipmentResponse shipmentResponse(ShipmentStatus status) {
        return new ShipmentResponse(
                "SLX-TEST-1",
                "ORD-TEST-1",
                "Providencia 1234",
                "BlueExpress",
                "RUTA-CENTRO-001",
                LocalDate.now().plusDays(2),
                status,
                OffsetDateTime.now()
        );
    }
}

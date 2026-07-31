package com.smartlogix.inventory.config;

import com.smartlogix.inventory.controller.InventoryController;
import com.smartlogix.inventory.security.JwtAuthenticationFilter;
import com.smartlogix.inventory.service.InventoryService;
import com.smartlogix.inventory.service.InventoryTransferService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import org.springframework.http.MediaType;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(InventoryController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
@TestPropertySource(properties = "jwt.secret=SmartLogixInventorySecurityTestSecretWithEnoughLengthForHS256")
class InventorySecurityTest {

    private static final String SECRET =
            "SmartLogixInventorySecurityTestSecretWithEnoughLengthForHS256";

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private InventoryService inventoryService;

    @MockBean
    private InventoryTransferService transferService;

    @Test
    void inventoryRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/inventory/items"))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(inventoryService);
    }

    @Test
    void customerCannotReadInternalInventory() throws Exception {
        mockMvc.perform(get("/api/inventory/items")
                        .header("Authorization", bearerToken("cliente", "ROLE_CUSTOMER")))
                .andExpect(status().isForbidden());
    }

    @Test
    void internalUserCanReadInventory() throws Exception {
        when(inventoryService.findAll()).thenReturn(List.of());

        mockMvc.perform(get("/api/inventory/items")
                        .header("Authorization", bearerToken("usuario", "ROLE_USER")))
                .andExpect(status().isOk());

        verify(inventoryService).findAll();
    }

    @Test
    void warehouseManagerCannotDeleteProducts() throws Exception {
        mockMvc.perform(delete("/api/inventory/items/SKU-100")
                        .header("Authorization", bearerToken("bodega", "ROLE_WAREHOUSE_MANAGER")))
                .andExpect(status().isForbidden());
    }

    @Test
    void administratorCanDeleteProducts() throws Exception {
        mockMvc.perform(delete("/api/inventory/items/SKU-100")
                        .header("Authorization", bearerToken("admin", "ROLE_ADMIN")))
                .andExpect(status().isOk());

        verify(inventoryService).deleteItem("SKU-100");
    }

    @Test
    void onlyOrderServiceCanReserveStock() throws Exception {
        mockMvc.perform(patch("/api/inventory/items/SKU-100/reserve")
                        .header("Authorization", bearerToken("admin", "ROLE_ADMIN"))
                        .queryParam("quantity", "2"))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch("/api/inventory/items/SKU-100/reserve")
                        .header("Authorization", bearerToken("order-service", "ROLE_ORDER_SERVICE"))
                        .queryParam("quantity", "2"))
                .andExpect(status().isOk());

        verify(inventoryService).reserve("SKU-100", 2);
    }

    @Test
    void onlyOrderServiceCanDispatchPosBatch() throws Exception {
        String request = "{\"lines\":[{\"sku\":\"SKU-100\",\"quantity\":2}]}";

        mockMvc.perform(post("/api/inventory/items/dispatch-batch")
                        .header("Authorization", bearerToken("admin", "ROLE_ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/inventory/items/dispatch-batch")
                        .header("Authorization", bearerToken("order-service", "ROLE_ORDER_SERVICE"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isOk());

        verify(inventoryService).dispatchBatch(
                List.of(new com.smartlogix.inventory.dto.InventoryBatchLineRequest("SKU-100", 2))
        );
    }

    @Test
    void onlyOrderServiceCanRestockCustomerReturns() throws Exception {
        String request = "{\"warehouseCode\":\"WH-SCL-01\",\"reference\":\"PSD-1\",\"lines\":[{\"sku\":\"SKU-100\",\"quantity\":1}]}";

        mockMvc.perform(post("/api/inventory/items/restock-batch")
                        .header("Authorization", bearerToken("bodega", "ROLE_WAREHOUSE_MANAGER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/inventory/items/restock-batch")
                        .header("Authorization", bearerToken("order-service", "ROLE_ORDER_SERVICE"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isOk());

        verify(inventoryService).restockBatch(
                "WH-SCL-01",
                "PSD-1",
                List.of(new com.smartlogix.inventory.dto.RestockInventoryLineRequest("SKU-100", 1))
        );
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

package com.smartlogix.shipment.client;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Component
public class OrderFulfillmentClient {

    private static final Logger log = LoggerFactory.getLogger(OrderFulfillmentClient.class);

    private final RestTemplate restTemplate;
    private final SecretKey signingKey;

    public OrderFulfillmentClient(
            RestTemplate restTemplate,
            @Value("${jwt.secret}") String jwtSecret
    ) {
        this.restTemplate = restTemplate;
        this.signingKey = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    public void updateStatus(String orderNumber, String status) {
        try {
            restTemplate.exchange(
                    "http://order-service/api/orders/{orderNumber}/fulfillment-status?value={status}",
                    HttpMethod.PATCH,
                    authorizedRequest(),
                    Void.class,
                    orderNumber,
                    status
            );
        } catch (RestClientException ex) {
            log.error(
                    "order_fulfillment_sync_failed orderNumber={} status={} cause={}",
                    orderNumber,
                    status,
                    ex.getMessage()
            );
            throw new IllegalStateException(
                    "No fue posible sincronizar el despacho con el pedido " + orderNumber + ".",
                    ex
            );
        }
    }

    private HttpEntity<Void> authorizedRequest() {
        Instant now = Instant.now();
        String token = Jwts.builder()
                .subject("shipment-service")
                .claim("role", "ROLE_SHIPMENT_SERVICE")
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(60)))
                .signWith(signingKey)
                .compact();
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return new HttpEntity<>(headers);
    }
}

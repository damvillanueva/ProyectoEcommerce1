package com.smartlogix.order.client;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.circuitbreaker.CircuitBreakerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class ShipmentClient {

    private final RestTemplate restTemplate;
    private final CircuitBreakerFactory<?, ?> circuitBreakerFactory;
    private final SecretKey signingKey;

    public ShipmentClient(
            RestTemplate restTemplate,
            CircuitBreakerFactory<?, ?> circuitBreakerFactory,
            @Value("${jwt.secret}") String jwtSecret
    ) {
        this.restTemplate = restTemplate;
        this.circuitBreakerFactory = circuitBreakerFactory;
        this.signingKey = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    public ShipmentResponse requestShipment(ShipmentRequest request) {
        return circuitBreakerFactory.create("shipmentService").run(
                () -> restTemplate.exchange(
                        "http://shipment-service/api/shipments",
                        HttpMethod.POST,
                        authorizedEntity(request),
                        ShipmentResponse.class
                ).getBody(),
                (Throwable throwable) -> {
                    System.err.println("Error al crear el envio:");
                    throwable.printStackTrace();
                    return fallbackResponse(request);
                }
        );
    }

    public ShipmentResponse getShipment(String trackingCode) {
        return circuitBreakerFactory.create("shipmentService").run(
                () -> restTemplate.exchange(
                        "http://shipment-service/api/shipments/{trackingCode}",
                        HttpMethod.GET,
                        authorizedEntity(null),
                        ShipmentResponse.class,
                        trackingCode
                ).getBody(),
                (Throwable throwable) -> null
        );
    }

    public boolean updateShipment(String trackingCode, ShipmentRequest request) {
        return circuitBreakerFactory.create("shipmentService").run(
                () -> {
                    ShipmentResponse currentShipment = restTemplate.exchange(
                            "http://shipment-service/api/shipments/{trackingCode}",
                            HttpMethod.GET,
                            authorizedEntity(null),
                            ShipmentResponse.class,
                            trackingCode
                    ).getBody();
                    String currentStatus = currentShipment == null || currentShipment.status() == null
                            ? "PLANNED"
                            : currentShipment.status();

                    restTemplate.exchange(
                            "http://shipment-service/api/shipments/{trackingCode}",
                            HttpMethod.PUT,
                            authorizedEntity(new ShipmentUpdateRequest(
                                    request.orderNumber(),
                                    request.destinationAddress(),
                                    request.totalUnits(),
                                    currentStatus
                            )),
                            ShipmentResponse.class,
                            trackingCode
                    );

                    return true;
                },
                (Throwable throwable) -> {
                    System.err.println("Error al actualizar el envio asociado:");
                    throwable.printStackTrace();
                    return false;
                }
        );
    }

    public boolean deleteShipment(String trackingCode) {
        return circuitBreakerFactory.create("shipmentService").run(
                () -> {
                    restTemplate.exchange(
                            "http://shipment-service/api/shipments/{trackingCode}",
                            HttpMethod.DELETE,
                            authorizedEntity(null),
                            Void.class,
                            trackingCode
                    );

                    return true;
                },
                (Throwable throwable) -> {
                    System.err.println("Error al eliminar el envio asociado:");
                    throwable.printStackTrace();
                    return false;
                }
        );
    }

    private <T> HttpEntity<T> authorizedEntity(T body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(createInternalToken());
        return new HttpEntity<>(body, headers);
    }

    private String createInternalToken() {
        Instant now = Instant.now();

        return Jwts.builder()
                .subject("order-service")
                .claim("role", "ROLE_ORDER_SERVICE")
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(60)))
                .signWith(signingKey)
                .compact();
    }

    private ShipmentResponse fallbackResponse(ShipmentRequest request) {
        return new ShipmentResponse(
                null,
                request.orderNumber(),
                "NO_CARRIER",
                "NO_ROUTE",
                null,
                "PENDING_MANUAL_ASSIGNMENT"
        );
    }
}
